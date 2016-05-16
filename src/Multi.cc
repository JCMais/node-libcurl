/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2015-2016, Jonathan Cardoso Machado
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
#include "Multi.h"

namespace NodeLibcurl {

    Nan::Persistent<v8::FunctionTemplate> Multi::constructor;

    Multi::Multi() : isOpen( true ), amountOfHandles( 0 ), runningHandles( 0 ), cbOnMessage( nullptr )
    {
        // init uv timer to be used with HandleTimeout
        this->timeout = deleted_unique_ptr<uv_timer_t>( new uv_timer_t, [&]( uv_timer_t *timerhandl ) { uv_close( reinterpret_cast<uv_handle_t *>( timerhandl ), Multi::OnTimerClose ); } );

        int timerStatus = uv_timer_init( uv_default_loop(), this->timeout.get() );
        assert( timerStatus == 0 );

        this->timeout->data = this;

        this->mh = curl_multi_init();

        assert( this->mh );

        // set curl_multi cb to use libuv
        curl_multi_setopt( this->mh, CURLMOPT_SOCKETFUNCTION, Multi::HandleSocket );
        curl_multi_setopt( this->mh, CURLMOPT_SOCKETDATA, this );
        curl_multi_setopt( this->mh, CURLMOPT_TIMERFUNCTION, Multi::HandleTimeout );
        curl_multi_setopt( this->mh, CURLMOPT_TIMERDATA, this );
    }

    Multi::~Multi()
    {
        if ( this->isOpen ) {

            this->Dispose();
        }
    }

    void Multi::Dispose()
    {
        assert( this->isOpen );

        this->isOpen = false;

        if ( this->mh ) {

            CURLMcode code = curl_multi_cleanup( this->mh );

            assert( code == CURLM_OK );
        }

        this->RemoveOnMessageCallback();

        uv_timer_stop( this->timeout.get() );
    }

    //The curl_multi_socket_action(3) function informs the application about updates
    //  in the socket (file descriptor) status by doing none, one, or multiple calls to this function
    int Multi::HandleSocket( CURL *easy, curl_socket_t s, int action, void *userp, void *socketp )
    {
        CurlSocketContext *ctx = nullptr;
        Multi *obj = static_cast<Multi*>( userp );

        if ( action == CURL_POLL_IN || action == CURL_POLL_OUT || action == CURL_POLL_INOUT || action == CURL_POLL_NONE ) {

            //create ctx if it doesn't exists and assign it to the current socket,
            if ( socketp ) {

                ctx = static_cast<Multi::CurlSocketContext*>( socketp );
            }
            else {

                ctx = Multi::CreateCurlSocketContext( s, obj );
                curl_multi_assign( obj->mh, s, static_cast<void*>( ctx ) );
            }

            //set event based on the current action
            int events = 0;

            switch ( action ) {

                case CURL_POLL_IN:
                    events |= UV_READABLE;
                    break;
                case CURL_POLL_OUT:
                    events |= UV_WRITABLE;
                    break;
                case CURL_POLL_INOUT:
                    events |= UV_READABLE | UV_WRITABLE;
                    break;
            }

            //start polling the socket.
            return uv_poll_start( &ctx->pollHandle, events, Multi::OnSocket );
        }

        if ( action == CURL_POLL_REMOVE && socketp ) {

            ctx = static_cast<CurlSocketContext*>( socketp );

            uv_poll_stop( &ctx->pollHandle );
            Multi::DestroyCurlSocketContext( ctx );

            curl_multi_assign( obj->mh, s, NULL );

            return 0;
        }

        return -1;
    }

    // This function will be called when the timeout value changes from libcurl.
    // The timeout value is at what latest time the application should call one of
    // the "performing" functions of the multi interface (curl_multi_socket_action(3) and curl_multi_perform(3)) - to allow libcurl to keep timeouts and retries etc to work.
    int Multi::HandleTimeout( CURLM *multi, long timeoutMs, void *userp )
    {
        Multi *obj = static_cast<Multi*>( userp );

        // stops running timer.
        uv_timer_stop( obj->timeout.get() );

        if ( timeoutMs > 0 ) {

            uv_timer_start( obj->timeout.get(), Multi::OnTimeout, timeoutMs, 0 );
        }
        else {

            //should we call one last time? (if timeoutMS == -1)
            UV_CALL_TIMER_CB( Multi::OnTimeout, obj->timeout.get(), 0 );
        }

        return 0;
    }

    // called when there is activity in the socket.
    void Multi::OnSocket( uv_poll_t* handle, int status, int events )
    {
        int flags = 0;

        CURLMcode code;

        if ( status < 0 ) flags = CURL_CSELECT_ERR;
        if ( events & UV_READABLE ) flags |= CURL_CSELECT_IN;
        if ( events & UV_WRITABLE ) flags |= CURL_CSELECT_OUT;

        Multi::CurlSocketContext *ctx = static_cast<Multi::CurlSocketContext*>( handle->data );

        //Before version 7.20.0: If you receive CURLM_CALL_MULTI_PERFORM, this basically means that you should call curl_multi_socket_action again
        // before you wait for more actions on libcurl's sockets.
        // You don't have to do it immediately, but the return code means that libcurl
        //  may have more data available to return or that there may be more data to send off before it is "satisfied".
        do {

            code = curl_multi_socket_action( ctx->multi->mh, ctx->sockfd, flags, &ctx->multi->runningHandles );

        } while ( code == CURLM_CALL_MULTI_PERFORM );

        if ( code != CURLM_OK ) {

            ThrowError( "curl_multi_socket_action Failed", curl_multi_strerror( code ) );
            return;
        }

        ctx->multi->ProcessMessages();
    }

    // function called when the previous timeout set reaches 0
    UV_TIMER_CB( Multi::OnTimeout )
    {
        Multi *obj = static_cast<Multi*>( timer->data );

        CURLMcode code = curl_multi_socket_action( obj->mh, CURL_SOCKET_TIMEOUT, 0, &obj->runningHandles );

        if ( code != CURLM_OK ) {

            ThrowError( "curl_multi_socket_action Failed", curl_multi_strerror( code ) );
            return;
        }

        obj->ProcessMessages();
    }

    void Multi::OnTimerClose( uv_handle_t *handle )
    {
        delete handle;
    }

    void Multi::ProcessMessages()
    {
        CURLMsg *msg = NULL;
        int pending = 0;

        while ( ( msg = curl_multi_info_read( this->mh, &pending ) ) ) {

            if ( msg->msg == CURLMSG_DONE ) {

                CURLcode statusCode = msg->data.result;

                this->CallOnMessageCallback( msg->easy_handle, statusCode );
            }
        }
    }

    // Creates a Context to be used to store data between events
    Multi::CurlSocketContext* Multi::CreateCurlSocketContext( curl_socket_t sockfd, Multi *multi )
    {
        int r;
        Multi::CurlSocketContext *ctx = NULL;

        ctx = static_cast<Multi::CurlSocketContext*>( malloc( sizeof( *ctx ) ) );

        ctx->sockfd = sockfd;
        ctx->multi = multi;

        // uv_poll simply watches file descriptors using the operating system notification mechanism
        // whenever the OS notices a change of state in file descriptors being polled, libuv will invoke the associated callback.
        r = uv_poll_init_socket( uv_default_loop(), &ctx->pollHandle, sockfd );

        assert( r == 0 );

        ctx->pollHandle.data = ctx;

        return ctx;
    }

    // called when libcurl thinks the socket can be destroyed
    void Multi::DestroyCurlSocketContext( Multi::CurlSocketContext* ctx )
    {
        uv_handle_t *handle = (uv_handle_t*) &ctx->pollHandle;

        uv_close( handle, Multi::OnSocketClose );
    }

    void Multi::OnSocketClose( uv_handle_t *handle )
    {
        Multi::CurlSocketContext *ctx = static_cast<Multi::CurlSocketContext*>( handle->data );
        free( ctx );
    }

    void Multi::CallOnMessageCallback( CURL *easy, CURLcode statusCode )
    {
        Nan::HandleScope scope;

        //we don't have an on message callback, just return.
        if ( !this->cbOnMessage ) {
            return;
        }

        Easy *obj = nullptr;
        CURLcode code = curl_easy_getinfo( easy, CURLINFO_PRIVATE, &obj );

        if ( code != CURLE_OK ) {

            Nan::ThrowError( "Error retrieving current handle instance." );
            return;
        }

        v8::Local<v8::Object> easyArg = obj->handle();

        v8::Local<v8::Value> err = Nan::Null();
        v8::Local<v8::Int32> errCode = Nan::New( static_cast<int32_t>( statusCode ) );

        if ( statusCode != CURLE_OK ) {

            err = Nan::Error( curl_easy_strerror( statusCode ) );
        }

        v8::Local<v8::Value> argv[] = { err, easyArg, errCode };

        this->cbOnMessage->Call( this->handle(), 3, argv );
    }

    void Multi::RemoveOnMessageCallback()
    {
        delete this->cbOnMessage;
        this->cbOnMessage = nullptr;
    }

    // Add Curl constructor to the module exports
    CURL_MODULE_INIT( Multi::Initialize )
    {
        Nan::HandleScope scope;

        // Multi js "class" function template initialization
        v8::Local<v8::FunctionTemplate> tmpl = Nan::New<v8::FunctionTemplate>( Multi::New );
        tmpl->SetClassName( Nan::New( "Multi" ).ToLocalChecked() );
        tmpl->InstanceTemplate()->SetInternalFieldCount( 1 );

        // prototype methods
        Nan::SetPrototypeMethod( tmpl, "setOpt",       Multi::SetOpt );
        Nan::SetPrototypeMethod( tmpl, "addHandle",    Multi::AddHandle );
        Nan::SetPrototypeMethod( tmpl, "onMessage",    Multi::OnMessage );
        Nan::SetPrototypeMethod( tmpl, "removeHandle", Multi::RemoveHandle );
        Nan::SetPrototypeMethod( tmpl, "getCount",     Multi::GetCount );
        Nan::SetPrototypeMethod( tmpl, "close",        Multi::Close );

        // static methods
        Nan::SetMethod( tmpl, "strError", Multi::StrError );

        Multi::constructor.Reset( tmpl );

        Nan::Set( exports, Nan::New( "Multi" ).ToLocalChecked(), tmpl->GetFunction() );
    }

    NAN_METHOD( Multi::New )
    {
        if ( !info.IsConstructCall() ) {
            Nan::ThrowError( "You must use \"new\" to instantiate this object." );
        }

        Multi *obj = new Multi();

        obj->Wrap( info.This() );

        info.GetReturnValue().Set( info.This() );
    }

    NAN_METHOD( Multi::SetOpt )
    {
        Nan::HandleScope scope;

        Multi *obj = Nan::ObjectWrap::Unwrap<Multi>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Multi handle is closed." );
            return;
        }

        v8::Local<v8::Value> opt = info[0];
        v8::Local<v8::Value> value = info[1];

        CURLMcode setOptRetCode = CURLM_UNKNOWN_OPTION;

        int optionId;

        // array of strings option
        if ( ( optionId = IsInsideCurlConstantStruct( curlMultiOptionNotImplemented, opt ) ) ) {

            Nan::ThrowError( "Unsupported option, probably because it's too complex to implement using javascript or unecessary when using javascript." );
            return;
        }
        else if ( ( optionId = IsInsideCurlConstantStruct( curlMultiOptionStringArray, opt ) ) ) {

            if ( value->IsNull() ) {

                setOptRetCode = curl_multi_setopt( obj->mh, static_cast<CURLMoption>( optionId ), NULL );

            }
            else {

                if ( !value->IsArray() ) {

                    Nan::ThrowTypeError( "Option value must be an Array." );
                    return;
                }

                v8::Local<v8::Array> array = v8::Local<v8::Array>::Cast( value );
                uint32_t arrayLength = array->Length();
                std::vector<char*> strings;

                for ( uint32_t i = 0; i < arrayLength; ++i )
                {
                    strings.push_back( *Nan::Utf8String( array->Get( i ) ) );
                }

                strings.push_back( NULL );

                setOptRetCode = curl_multi_setopt( obj->mh, static_cast<CURLMoption>( optionId ), &strings[0] );
            }

        } //check if option is integer, and the value is correct
        else if ( ( optionId = IsInsideCurlConstantStruct( curlOptionInteger, opt ) ) ) {

            int32_t val = value->Int32Value();

            //If not an integer, get the boolean value of it.
            if ( !value->IsInt32() ) {

                val = value->BooleanValue();
            }

            setOptRetCode = curl_multi_setopt( obj->mh, static_cast<CURLMoption>( optionId ), val );
        }

        info.GetReturnValue().Set( setOptRetCode );
    }

    NAN_METHOD( Multi::OnMessage )
    {
        Nan::HandleScope scope;

        Multi *obj = Nan::ObjectWrap::Unwrap<Multi>( info.This() );

        if ( !info.Length() ) {

            Nan::ThrowError( "You must specify the callback function. If you want to remove the current one you can pass null." );
            return;
        }

        v8::Local<v8::Value> arg = info[0];

        bool isNull = arg->IsNull();

        if ( !arg->IsFunction() && !isNull ) {

            Nan::ThrowTypeError( "Argument must be a Function. If you want to remove the current one you can pass null." );
            return;
        }

        obj->RemoveOnMessageCallback();

        if ( !isNull ) {

            v8::Local<v8::Function> callback = arg.As<v8::Function>();
            obj->cbOnMessage = new Nan::Callback( callback );
        }

        info.GetReturnValue().Set( info.This() );
    }

    NAN_METHOD( Multi::AddHandle )
    {
        Nan::HandleScope scope;

        Multi *obj = Nan::ObjectWrap::Unwrap<Multi>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Multi handle is closed." );
            return;
        }

        v8::Local<v8::Value> handle = info[0];

        if ( !handle->IsObject() || !Nan::New( Easy::constructor )->HasInstance( handle ) ) {

            Nan::ThrowError( Nan::TypeError( "Argument must be an instance of an Easy handle." ) );
            return;
        }
        else {

            Easy *easy = Nan::ObjectWrap::Unwrap<Easy>( handle.As<v8::Object>() );

            if ( !easy->isOpen ) {
                Nan::ThrowError( "Cannot add an Easy handle that is closed." );
                return;
            }

            CURLMcode code = curl_multi_add_handle( obj->mh, easy->ch );

            if ( code != CURLM_OK ) {

                Nan::ThrowError( Nan::TypeError( "Could not add easy handle to the multi handle." ) );
                return;
            }

            ++obj->amountOfHandles;
            easy->isInsideMultiHandle = true;

            v8::Local<v8::Int32> ret = Nan::New( static_cast<int32_t>( code ) );

            info.GetReturnValue().Set( ret );
        }
    }

    NAN_METHOD( Multi::RemoveHandle )
    {
        Nan::HandleScope scope;

        Multi *obj = Nan::ObjectWrap::Unwrap<Multi>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Multi handle is closed." );
            return;
        }

        v8::Local<v8::Value> handle = info[0];

        if ( !handle->IsObject() || !Nan::New( Easy::constructor )->HasInstance( handle ) ) {

            Nan::ThrowError( Nan::TypeError( "Argument must be an instance of an Easy handle." ) );
            return;
        }
        else {

            Easy *easy = Nan::ObjectWrap::Unwrap<Easy>( handle.As<v8::Object>() );

            CURLMcode code = curl_multi_remove_handle( obj->mh, easy->ch );

            if ( code != CURLM_OK ) {

                Nan::ThrowError( Nan::TypeError( "Could not remove easy handle from multi handle." ) );
                return;
            }

            --obj->amountOfHandles;
            easy->isInsideMultiHandle = false;

            v8::Local<v8::Int32> ret = Nan::New( static_cast<int32_t>( code ) );

            info.GetReturnValue().Set( ret );
        }
    }

    NAN_METHOD( Multi::GetCount )
    {
        Nan::HandleScope scope;

        Multi *obj = Nan::ObjectWrap::Unwrap<Multi>( info.This() );

        v8::Local<v8::Uint32> ret = Nan::New( static_cast<uint32_t>( obj->amountOfHandles ) );

        info.GetReturnValue().Set( ret );
    }

    NAN_METHOD( Multi::Close )
    {
        Nan::HandleScope scope;

        Multi *obj = Nan::ObjectWrap::Unwrap<Multi>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Multi handle already closed." );
            return;
        }

        obj->Dispose();
    }

    NAN_METHOD( Multi::StrError )
    {
        Nan::HandleScope scope;

        v8::Local<v8::Value> errCode = info[0];

        if ( !errCode->IsInt32() ) {

            Nan::ThrowTypeError( "Invalid errCode passed to Multi.strError." );
            return;
        }

        const char * errorMsg = curl_multi_strerror( static_cast<CURLMcode>( errCode->Int32Value() ) );

        v8::Local<v8::String> ret = Nan::New( errorMsg ).ToLocalChecked();

        info.GetReturnValue().Set( ret );
    }
}
