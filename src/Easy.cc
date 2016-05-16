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
#include <iostream>
#include <stdlib.h>
#include <string.h>

#include "Easy.h"
#include "Share.h"

#include "make_unique.h"
#include "string_format.h"

namespace NodeLibcurl {

    class Easy::ToFree {
    public:
        std::vector<std::vector<char> >             str;
        std::vector<curl_slist*>                    slist;
        std::vector<std::unique_ptr<CurlHttpPost> > post;

        ~ToFree() {
            for ( unsigned int i = 0; i < slist.size(); i++ ) {
                curl_slist_free_all( slist[i] );
            }
        }
    };

    Nan::Persistent<v8::FunctionTemplate> Easy::constructor;
    Nan::Persistent<v8::String> Easy::onDataCbSymbol;
    Nan::Persistent<v8::String> Easy::onHeaderCbSymbol;
    Nan::Persistent<v8::String> Easy::onErrorCbSymbol;
    Nan::Persistent<v8::String> Easy::onEndCbSymbol;

    uint32_t Easy::counter = 0;
    int32_t Easy::currentOpenedHandles = 0;

    Easy::Easy() :
        cbChunkBgn( nullptr ), cbChunkEnd( nullptr ), cbDebug( nullptr ), cbHeader( nullptr ),
        cbFnMatch( nullptr ), cbOnSocketEvent( nullptr ), cbProgress( nullptr ), cbRead( nullptr ),
        cbXferinfo( nullptr ), cbWrite( nullptr ),
        pollHandle( nullptr ),
        isCbProgressAlreadyAborted( false ), isMonitoringSockets( false ),
        readDataFileDescriptor( -1 ), id( Easy::counter++ ), isInsideMultiHandle( false ), isOpen( true )
    {
        this->ch = curl_easy_init();
        assert( this->ch );

        this->toFree = std::make_shared<Easy::ToFree>();

        this->ResetRequiredHandleOptions();

        ++Easy::currentOpenedHandles;
    }

    Easy::Easy( Easy *orig ) :
        cbChunkBgn( nullptr ), cbChunkEnd( nullptr ), cbDebug( nullptr ), cbHeader( nullptr ),
        cbFnMatch( nullptr ), cbOnSocketEvent( nullptr ), cbProgress( nullptr ), cbRead( nullptr ),
        cbXferinfo( nullptr ), cbWrite( nullptr ),
        pollHandle( nullptr ),
        isCbProgressAlreadyAborted( false ), isMonitoringSockets( false ),
        readDataFileDescriptor( -1 ), id( Easy::counter++ ), isInsideMultiHandle( false ), isOpen( true )
    {
        assert( orig );
        assert( orig != this ); //should not duplicate itself

        this->ch = curl_easy_duphandle( orig->ch );
        assert( this->ch );

        Nan::HandleScope scope;

        // make sure to reset the *DATA options when duplicating a handle.

        if ( orig->cbChunkBgn != nullptr ) {
            this->cbChunkBgn = new Nan::Callback( orig->cbChunkBgn->GetFunction() );
        }

        if ( orig->cbChunkEnd != nullptr ) {
            this->cbChunkEnd = new Nan::Callback( orig->cbChunkEnd->GetFunction() );
        }

        if ( this->cbChunkBgn || this->cbChunkEnd ) {
            curl_easy_setopt( this->ch, CURLOPT_CHUNK_DATA, this );
        }

        if ( orig->cbDebug != nullptr ) {
            this->cbDebug = new Nan::Callback( orig->cbDebug->GetFunction() );
            curl_easy_setopt( this->ch, CURLOPT_DEBUGDATA, this );
        }

        if ( orig->cbFnMatch != nullptr ) {
            this->cbFnMatch = new Nan::Callback( orig->cbFnMatch->GetFunction() );
            curl_easy_setopt( this->ch, CURLOPT_FNMATCH_DATA, this );
        }

        if ( orig->cbHeader != nullptr ) {
            this->cbHeader = new Nan::Callback( orig->cbHeader->GetFunction() );
        }

        if ( orig->cbProgress != nullptr ) {
            this->cbProgress = new Nan::Callback( orig->cbProgress->GetFunction() );
            curl_easy_setopt( this->ch, CURLOPT_PROGRESSDATA, this );
        }

        if ( orig->cbRead != nullptr ) { //no need to reset the _DATA option here since it's reset on ResetRequiredHandleOptions()
            this->cbRead = new Nan::Callback( orig->cbRead->GetFunction() );
        }

        if ( orig->cbWrite != nullptr ) {
            this->cbWrite = new Nan::Callback( orig->cbWrite->GetFunction() );
        }

#if NODE_LIBCURL_VER_GE( 7, 32, 0 )
        if ( orig->cbXferinfo != nullptr ) {
            this->cbXferinfo = new Nan::Callback( orig->cbXferinfo->GetFunction() );
            curl_easy_setopt( this->ch, CURLOPT_XFERINFODATA, this );
        }
#endif

        this->toFree = orig->toFree;

        this->ResetRequiredHandleOptions();

        ++Easy::currentOpenedHandles;
    }

    // Implementation of equality operator overload.
    bool Easy::operator==( const Easy &other ) const
    {
        return this->ch == other.ch;
    }

    bool Easy::operator!=( const Easy &other ) const
    {
        return !( *this == other );
    }

    Easy::~Easy( void )
    {
        if ( this->isOpen ) {

            this->Dispose();
        }
    }

    void Easy::ResetRequiredHandleOptions()
    {
        curl_easy_setopt( this->ch, CURLOPT_PRIVATE, this );

        curl_easy_setopt( this->ch, CURLOPT_HEADERFUNCTION, Easy::HeaderFunction );
        curl_easy_setopt( this->ch, CURLOPT_HEADERDATA,     this );

        curl_easy_setopt( this->ch, CURLOPT_READFUNCTION, Easy::ReadFunction );
        curl_easy_setopt( this->ch, CURLOPT_READDATA,     this );

        curl_easy_setopt( this->ch, CURLOPT_WRITEFUNCTION, Easy::WriteFunction );
        curl_easy_setopt( this->ch, CURLOPT_WRITEDATA,     this );
    }

    // dispose persistent objects and references stored during the life of this obj.
    void Easy::Dispose()
    {
        // this call should be only done when the handle is still open
        assert( this->isOpen && "This handle was already closed." );
        assert( this->ch && "The curl handle ran away." );

        curl_easy_cleanup( this->ch );

        //dispose persistent callbacks
        this->DisposeCallbacks();

        if ( this->isMonitoringSockets ) {
            this->UnmonitorSockets();
        }

        this->isOpen = false;

        --Easy::currentOpenedHandles;
    }

    void Easy::DisposeCallbacks()
    {
        delete this->cbChunkBgn;

        delete this->cbChunkEnd;

        delete this->cbDebug;

        delete this->cbFnMatch;

        delete this->cbOnSocketEvent;

        delete this->cbProgress;

        delete this->cbRead;

        delete this->cbXferinfo;
    }

    void Easy::MonitorSockets()
    {
        int retUv;
        CURLcode retCurl;
        int events = 0 | UV_READABLE | UV_WRITABLE;

        if ( this->pollHandle ) {

            Nan::ThrowError( "Already monitoring sockets!" );
            return;
        }

#if NODE_LIBCURL_VER_GE( 7, 45, 0 )
        curl_socket_t socket;
        retCurl = curl_easy_getinfo( this->ch, CURLINFO_ACTIVESOCKET, &socket );

        if ( socket == CURL_SOCKET_BAD ) {

            Nan::ThrowError( "Received invalid socket from the current connection!" );
            return;
        }
#else
        long socket;
        retCurl = curl_easy_getinfo( this->ch, CURLINFO_LASTSOCKET, &socket );
#endif

        if ( retCurl != CURLE_OK ) {

            ThrowError( "Failed to receive socket!", curl_easy_strerror( retCurl ) );
            return;
        }

        this->pollHandle = new uv_poll_t;

        retUv = uv_poll_init_socket( uv_default_loop(), this->pollHandle, socket );

        if ( retUv < 0 ) {

            ThrowError( "Failed to poll on connection socket.", UV_ERROR_STRING( retUv ) );
            return;
        }

        this->pollHandle->data = this;

        retUv = uv_poll_start( this->pollHandle, events, Easy::OnSocket );
        this->isMonitoringSockets = true;
    }

    void Easy::UnmonitorSockets()
    {
        int uvRet;
        uvRet = uv_poll_stop( this->pollHandle );

        if ( uvRet < 0 ) {

            ThrowError( "Failed to stop polling on socket.", UV_ERROR_STRING( uvRet ) );
            return;
        }

        uv_close( reinterpret_cast<uv_handle_t *>( this->pollHandle ), Easy::OnSocketClose );
        this->isMonitoringSockets = false;
    }

    void Easy::OnSocket( uv_poll_t* handle, int status, int events )
    { //this runs on main thread

        Easy *obj = static_cast<Easy*>( handle->data );

        assert( obj );

        obj->CallSocketEvent( status, events );
    }

    void Easy::OnSocketClose( uv_handle_t *handle )
    {
        delete handle;
    }

    void Easy::CallSocketEvent( int status, int events )
    {
        if ( this->cbOnSocketEvent == nullptr ) {
            return;
        }

        Nan::HandleScope scope;

        v8::Local<v8::Value> err = Nan::Null();

        if ( status < 0 ) {

            err = Nan::Error( UV_ERROR_STRING( status ) );
        }

        v8::Local<v8::Value> argv[] = {
            err,
            Nan::New<v8::Integer>( events )
        };

        this->cbOnSocketEvent->Call( this->handle(), 2, argv );
    }

    // Called by libcurl when some chunk of data (from body) is available
    size_t Easy::WriteFunction( char *ptr, size_t size, size_t nmemb, void *userdata )
    {
        Easy *obj = static_cast<Easy*>( userdata );
        return obj->OnData( ptr, size, nmemb );
    }

    // Called by libcurl when some chunk of data (from headers) is available
    size_t Easy::HeaderFunction( char *ptr, size_t size, size_t nmemb, void *userdata )
    {
        Easy *obj = static_cast<Easy*>( userdata );
        return obj->OnHeader( ptr, size, nmemb );
    }

    // Called by libcurl as soon as it needs to read data in order to send it to the peer
    size_t Easy::ReadFunction( char *ptr, size_t size, size_t nmemb, void *userdata )
    {
        uv_fs_t readReq;

        int32_t ret = 0;

        Easy *obj = static_cast<Easy*>( userdata );
        int32_t fd = obj->readDataFileDescriptor;

        //read callback set, use it instead
        if ( obj->cbRead ) {

            size_t n = size * nmemb;

            Nan::HandleScope scope;

            v8::Local<v8::Object> buf = Nan::NewBuffer( static_cast<uint32_t>( n ) ).ToLocalChecked();
            v8::Local<v8::Uint32> sizeArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( size ) );
            v8::Local<v8::Uint32> nmembArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( nmemb ) );
            v8::Local<v8::Value> argv[] = { buf, sizeArg, nmembArg };

            v8::Local<v8::Value> retval = obj->cbRead->Call( obj->handle(), 3, argv );
            char *data = node::Buffer::Data( buf );

            ret = retval->Int32Value();

            bool hasData = !!data && ret > 0 && ret < CURL_READFUNC_ABORT;

            if ( hasData ) {

                std::memcpy( ptr, data, ret );
            }

            // otherwise use the default read callback
        } else {

            //abort early if we don't have a file descriptor
            if ( fd == -1 ) {
                return CURL_READFUNC_ABORT;
            }

#if UV_VERSION_MAJOR < 1
            ret = uv_fs_read( uv_default_loop(), &readReq, fd, ptr, 1, -1, NULL );
#else
            unsigned int len = (unsigned int) ( size * nmemb );

            uv_buf_t uvbuf = uv_buf_init( ptr, len );

            ret = uv_fs_read( uv_default_loop(), &readReq, fd, &uvbuf, 1, -1, NULL );
#endif
        }

        if ( ret < 0 ) {

            return CURL_READFUNC_ABORT;
        }

        return static_cast<size_t>( ret );
    }

    size_t Easy::OnData( char *data, size_t size, size_t nmemb )
    {
        //@TODO If the callback close the connection, an error will be throw!
        Nan::HandleScope scope;

        size_t n = size * nmemb;

        v8::Local<v8::Value> cbOnData = this->handle()->Get( Nan::New( Easy::onDataCbSymbol ) );

        // No callback is set
        if ( this->cbWrite == nullptr && cbOnData->IsUndefined() ) {

            return n;
        }

        const int argc = 3;
        v8::Local<v8::Object> buf = Nan::CopyBuffer( data, static_cast<uint32_t>( n ) ).ToLocalChecked();
        v8::Local<v8::Uint32> sizeArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( size ) );
        v8::Local<v8::Uint32> nmembArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( nmemb ) );

        v8::Local<v8::Value> argv[argc] = { buf, sizeArg, nmembArg };
        v8::Local<v8::Value> retVal;

        // Callback set with WRITEFUNCTION has priority over the onData one.
        if ( this->cbWrite ) {

            retVal = this->cbWrite->Call( this->handle(), argc, argv );
        }
        else {
            // if the cbWrite is not set, the onData cb must be

            retVal = Nan::MakeCallback( this->handle(), cbOnData.As<v8::Function>(), argc, argv );
        }

        size_t ret = n;

        if ( retVal.IsEmpty() ) {

            ret = 0;
        }
        else {

            ret = retVal->Uint32Value();
        }

        return ret;
    }


    size_t Easy::OnHeader( char *data, size_t size, size_t nmemb )
    {
        Nan::HandleScope scope;

        size_t n = size * nmemb;

        v8::Local<v8::Value> cbOnHeader = this->handle()->Get( Nan::New( Easy::onHeaderCbSymbol ) );

        // No callback is set
        if ( this->cbHeader == nullptr && cbOnHeader->IsUndefined() ) {

            return n;
        }

        const int argc = 3;
        v8::Local<v8::Object> buf = Nan::CopyBuffer( data, static_cast<uint32_t>( n ) ).ToLocalChecked();
        v8::Local<v8::Uint32> sizeArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( size ) );
        v8::Local<v8::Uint32> nmembArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( nmemb ) );

        v8::Local<v8::Value> argv[argc] = { buf, sizeArg, nmembArg };
        v8::Local<v8::Value> retVal;

        // Callback set with HEADERFUNCTION has priority over the onHeader one.
        if ( this->cbHeader ) {

            retVal = this->cbHeader->Call( this->handle(), argc, argv );
        }
        else {
            // if the cbHeader is not set, the onData cb must be

            retVal = Nan::MakeCallback( this->handle(), cbOnHeader.As<v8::Function>(), argc, argv );
        }

        size_t ret = n;

        if ( retVal.IsEmpty() ) {

            ret = 0;
        }
        else {

            ret = retVal->Uint32Value();
        }

        return ret;
    }

    v8::Local<v8::Value> NullValueIfInvalidString( char *str )
    {
        Nan::EscapableHandleScope scope;

        v8::Local<v8::Value> ret = Nan::Null();

        if ( str != NULL && str[0] != '\0' ) {
            ret = Nan::New( str ).ToLocalChecked();
        }

        return scope.Escape( ret );
    }

    v8::Local<v8::Object> Easy::CreateV8ObjectFromCurlFileInfo( curl_fileinfo *fileInfo )
    {
        Nan::EscapableHandleScope scope;

        v8::Local<v8::String> fileName = Nan::New( fileInfo->filename ).ToLocalChecked();
        v8::Local<v8::Integer> fileType = Nan::New( fileInfo->filetype );
        v8::Local<v8::Date>    time = Nan::New<v8::Date>( static_cast<double>( fileInfo->time ) * 1000 ).ToLocalChecked();
        v8::Local<v8::Uint32> perm = Nan::New( fileInfo->perm );
        v8::Local<v8::Integer> uid = Nan::New( fileInfo->uid );
        v8::Local<v8::Integer> gid = Nan::New( fileInfo->gid );
        v8::Local<v8::Number>  size = Nan::New<v8::Number>( static_cast<double>( fileInfo->size ) );
        v8::Local<v8::Integer> hardLinks = Nan::New( static_cast<int32_t>( fileInfo->hardlinks ) );

        v8::Local<v8::Object> strings = Nan::New<v8::Object>();
        Nan::Set( strings, Nan::New( "time" ).ToLocalChecked(), NullValueIfInvalidString( fileInfo->strings.time ) );
        Nan::Set( strings, Nan::New( "perm" ).ToLocalChecked(), NullValueIfInvalidString( fileInfo->strings.perm ) );
        Nan::Set( strings, Nan::New( "user" ).ToLocalChecked(), NullValueIfInvalidString( fileInfo->strings.user ) );
        Nan::Set( strings, Nan::New( "group" ).ToLocalChecked(), NullValueIfInvalidString( fileInfo->strings.group ) );
        Nan::Set( strings, Nan::New( "target" ).ToLocalChecked(), NullValueIfInvalidString( fileInfo->strings.target ) );

        v8::Local<v8::Object> obj = Nan::New<v8::Object>();
        Nan::Set( obj, Nan::New( "fileName" ).ToLocalChecked(), fileName );
        Nan::Set( obj, Nan::New( "fileType" ).ToLocalChecked(), fileType );
        Nan::Set( obj, Nan::New( "time" ).ToLocalChecked(), time );
        Nan::Set( obj, Nan::New( "perm" ).ToLocalChecked(), perm );
        Nan::Set( obj, Nan::New( "uid" ).ToLocalChecked(), uid );
        Nan::Set( obj, Nan::New( "gid" ).ToLocalChecked(), gid );
        Nan::Set( obj, Nan::New( "size" ).ToLocalChecked(), size );
        Nan::Set( obj, Nan::New( "hardLinks" ).ToLocalChecked(), hardLinks );
        Nan::Set( obj, Nan::New( "strings" ).ToLocalChecked(), strings );

        return scope.Escape( obj );
    }

    long Easy::CbChunkBgn( curl_fileinfo *transferInfo, void *ptr, int remains )
    {
        Easy *obj = static_cast<Easy *>( ptr );

        assert( obj );

        const int argc = 2;
        v8::Local<v8::Value> argv[argc] = {
            Easy::CreateV8ObjectFromCurlFileInfo( transferInfo ),
            Nan::New<v8::Number>( remains )
        };

        v8::Local<v8::Value> retVal = obj->cbChunkBgn->Call( obj->handle(), argc, argv );
        int32_t retValInt = CURL_CHUNK_BGN_FUNC_FAIL;

        if ( !retVal->IsInt32() ) {

            Nan::ThrowTypeError( "Return value from the CHUNK_BGN callback must be an integer." );
        }
        else {

            retValInt = retVal->Int32Value();
        }

        return retValInt;
    }

    long Easy::CbChunkEnd( void *ptr )
    {
        Easy *obj = static_cast<Easy *>( ptr );

        assert( obj );

        v8::Local<v8::Value> retVal = obj->cbChunkEnd->Call( obj->handle(), 0, NULL );
        int32_t retValInt = CURL_CHUNK_END_FUNC_FAIL;

        if ( !retVal->IsInt32() ) {

            Nan::ThrowTypeError( "Return value from the CHUNK_END callback must be an integer." );
        }
        else {

            retValInt = retVal->Int32Value();
        }

        return retValInt;
    }

    int Easy::CbDebug( CURL *handle, curl_infotype type, char *data, size_t size, void *userptr )
    {
        Nan::HandleScope scope;

        Easy *obj = static_cast<Easy *>( userptr );

        assert( obj );

        v8::Local<v8::Value> argv[] = {
            Nan::New<v8::Integer>( type ),
            Nan::New<v8::String>( data, static_cast<int>( size ) ).ToLocalChecked()
        };

        v8::Local<v8::Value> retval = obj->cbDebug->Call( obj->handle(), 2, argv );

        int32_t retvalInt = 0;

        if ( !retval->IsInt32() ) {

            Nan::ThrowTypeError( "Return value from the DEBUG callback must be an integer." );

            retvalInt = 1;

        }
        else {

            retvalInt = retval->Int32Value();
        }

        return retvalInt;
    }

    int Easy::CbFnMatch( void *ptr, const char *pattern, const char *string )
    {
        Nan::HandleScope scope;

        Easy *obj = static_cast<Easy *>( ptr );

        assert( obj );

        int32_t retvalInt32 = CURL_FNMATCHFUNC_FAIL;

        v8::Local<v8::String> argPattern = Nan::New( pattern ).ToLocalChecked();
        v8::Local<v8::String> argString = Nan::New( string ).ToLocalChecked();

        const int argc = 2;
        v8::Local<v8::Value> argv[argc] = {
            argPattern,
            argString
        };

        v8::Local<v8::Value> retval = obj->cbFnMatch->Call( obj->handle(), argc, argv );

        if ( !retval->IsInt32() ) {

            Nan::ThrowTypeError( "Return value from the fnmatch callback must be an integer." );

        }
        else {

            retvalInt32 = retval->Int32Value();
        }

        return retvalInt32;
    }

    int Easy::CbProgress( void *clientp, double dltotal, double dlnow, double ultotal, double ulnow )
    {
        Nan::HandleScope scope;

        Easy *obj = static_cast<Easy *>( clientp );

        assert( obj );

        if ( obj->isCbProgressAlreadyAborted )
            return 1;

        int32_t retvalInt32;

        v8::Local<v8::Value> argv[] = {
            Nan::New<v8::Number>( static_cast<double>( dltotal ) ),
            Nan::New<v8::Number>( static_cast<double>( dlnow ) ),
            Nan::New<v8::Number>( static_cast<double>( ultotal ) ),
            Nan::New<v8::Number>( static_cast<double>( ulnow ) )
        };

        // Should handle possible exceptions here?
        v8::Local<v8::Value> retval = obj->cbProgress->Call( obj->handle(), 4, argv );

        if ( !retval->IsInt32() ) {

            Nan::ThrowTypeError( "Return value from the progress callback must be an integer." );

            retvalInt32 = 1;

        }
        else {

            retvalInt32 = retval->Int32Value();
        }

        if ( retvalInt32 )
            obj->isCbProgressAlreadyAborted = true;

        return retvalInt32;
    }

    int Easy::CbXferinfo( void *clientp, curl_off_t dltotal, curl_off_t dlnow, curl_off_t ultotal, curl_off_t ulnow )
    {
        Nan::HandleScope scope;

        Easy *obj = static_cast<Easy *>( clientp );

        assert( obj );

        if ( obj->isCbProgressAlreadyAborted )
            return 1;

        int32_t retvalInt32;

        v8::Local<v8::Value> argv[] = {
            Nan::New<v8::Number>( static_cast<double>( dltotal ) ),
            Nan::New<v8::Number>( static_cast<double>( dlnow ) ),
            Nan::New<v8::Number>( static_cast<double>( ultotal ) ),
            Nan::New<v8::Number>( static_cast<double>( ulnow ) )
        };

        v8::Local<v8::Value> retval = obj->cbXferinfo->Call( obj->handle(), 4, argv );

        if ( !retval->IsInt32() ) {

            Nan::ThrowTypeError( "Return value from the progress callback must be an integer." );

            retvalInt32 = 1;

        }
        else {

            retvalInt32 = retval->Int32Value();
        }

        if ( retvalInt32 )
            obj->isCbProgressAlreadyAborted = true;

        return retvalInt32;
    }

    CURL_MODULE_INIT( Easy::Initialize )
    {
        Nan::HandleScope scope;

        // Easy js "class" function template initialization
        v8::Local<v8::FunctionTemplate> tmpl = Nan::New<v8::FunctionTemplate>( Easy::New );
        tmpl->SetClassName( Nan::New( "Easy" ).ToLocalChecked() );
        tmpl->InstanceTemplate()->SetInternalFieldCount( 1 );
        v8::Local<v8::ObjectTemplate> proto = tmpl->PrototypeTemplate();

        // prototype methods
        Nan::SetPrototypeMethod( tmpl, "setOpt",                Easy::SetOpt );
        Nan::SetPrototypeMethod( tmpl, "getInfo",               Easy::GetInfo );
        Nan::SetPrototypeMethod( tmpl, "send",                  Easy::Send );
        Nan::SetPrototypeMethod( tmpl, "recv",                  Easy::Recv );
        Nan::SetPrototypeMethod( tmpl, "perform",               Easy::Perform );
        Nan::SetPrototypeMethod( tmpl, "pause",                 Easy::Pause );
        Nan::SetPrototypeMethod( tmpl, "reset",                 Easy::Reset );
        Nan::SetPrototypeMethod( tmpl, "dupHandle",             Easy::DupHandle );
        Nan::SetPrototypeMethod( tmpl, "onSocketEvent",         Easy::OnSocketEvent );
        Nan::SetPrototypeMethod( tmpl, "monitorSocketEvents",   Easy::MonitorSocketEvents );
        Nan::SetPrototypeMethod( tmpl, "unmonitorSocketEvents", Easy::UnmonitorSocketEvents );
        Nan::SetPrototypeMethod( tmpl, "close",                 Easy::Close );

        // static methods
        Nan::SetMethod( tmpl, "strError", Easy::StrError );

        Nan::SetAccessor( proto, Nan::New( "id" ).ToLocalChecked(), Easy::IdGetter, 0, v8::Local<v8::Value>(), v8::DEFAULT, v8::ReadOnly );
        Nan::SetAccessor( proto, Nan::New( "isInsideMultiHandle" ).ToLocalChecked(), Easy::IsInsideMultiHandleGetter, 0, v8::Local<v8::Value>(), v8::DEFAULT, v8::ReadOnly );

        Easy::constructor.Reset( tmpl );

        Easy::onDataCbSymbol.Reset(   Nan::New( "onData" ).ToLocalChecked() );
        Easy::onHeaderCbSymbol.Reset( Nan::New( "onHeader" ).ToLocalChecked() );
        Easy::onEndCbSymbol.Reset(    Nan::New( "onEnd" ).ToLocalChecked() );
        Easy::onErrorCbSymbol.Reset(  Nan::New( "onError" ).ToLocalChecked() );

        Nan::Set( exports, Nan::New( "Easy" ).ToLocalChecked(), tmpl->GetFunction() );
    }

    NAN_METHOD( Easy::New )
    {
        if ( !info.IsConstructCall() ) {
            Nan::ThrowError( "You must use \"new\" to instantiate this object." );
        }

        v8::Local<v8::Value> jsHandle = info[0];
        Easy *obj = nullptr;

        if ( !jsHandle->IsUndefined() ) {

            if ( !jsHandle->IsObject() || !Nan::New( Easy::constructor )->HasInstance( jsHandle ) ) {

                Nan::ThrowError( Nan::TypeError( "Argument must be an instance of an Easy handle." ) );
                return;
            }

            Easy *orig = Nan::ObjectWrap::Unwrap<Easy>( info[0]->ToObject() );

            obj = new Easy( orig );

        } else {

            obj = new Easy();
        }

        if ( obj ) {

            obj->Wrap( info.This() );
            info.GetReturnValue().Set( info.This() );
        }
    }

    NAN_GETTER( Easy::IdGetter )
    {
        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        info.GetReturnValue().Set( Nan::New( obj->id ) );
    }

    NAN_GETTER( Easy::IsInsideMultiHandleGetter )
    {
        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        info.GetReturnValue().Set( Nan::New( obj->isInsideMultiHandle ) );
    }

    NAN_METHOD( Easy::SetOpt )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle is closed." );
            return;
        }

        v8::Local<v8::Value> opt = info[0];
        v8::Local<v8::Value> value = info[1];

        CURLcode setOptRetCode = CURLE_UNKNOWN_OPTION;

        int optionId;

        if ( ( optionId = IsInsideCurlConstantStruct( curlOptionNotImplemented, opt ) ) ) {

            Nan::ThrowError( "Unsupported option, probably because it's too complex to implement using javascript or unecessary when using javascript (like the _DATA options)." );
            return;
        }
        else if ( ( optionId = IsInsideCurlConstantStruct( curlOptionSpecific, opt ) ) ) {

            switch( optionId ) {
                case CURLOPT_SHARE:
                    if ( value->IsNull() ) {

                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_SHARE, NULL );
                    }
                    else {

                        if ( !value->IsObject() || !Nan::New( Share::constructor )->HasInstance( value ) ) {
                            Nan::ThrowTypeError( "Invalid value for the SHARE option. It must be a Share instance." );
                            return;
                        }

                        Share *share = Nan::ObjectWrap::Unwrap<Share>( value.As<v8::Object>() );

                        if ( !share->isOpen ) {
                            Nan::ThrowError( "Share handle is already closed." );
                            return;
                        }

                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_SHARE, share->sh );
                    }
                    break;
            }

        } // linked list options
        else if ( ( optionId = IsInsideCurlConstantStruct( curlOptionLinkedList, opt ) ) ) {

            // HTTPPOST is a special case, since it's an array of objects.
            if ( optionId == CURLOPT_HTTPPOST ) {

                std::string invalidArrayMsg = "HTTPPOST option value should be an Array of Objects.";

                if ( !value->IsArray() ) {

                    Nan::ThrowTypeError( invalidArrayMsg.c_str() );
                    return;
                }

                v8::Local<v8::Array> rows = v8::Local<v8::Array>::Cast( value );

                std::unique_ptr<CurlHttpPost> httpPost = std::make_unique<CurlHttpPost>();

                // [{ key : val }]
                for ( uint32_t i = 0, len = rows->Length(); i < len; ++i ) {

                    // not an array of objects
                    if ( !rows->Get( i )->IsObject() ) {

                        Nan::ThrowTypeError( invalidArrayMsg.c_str() );
                        return;
                    }

                    v8::Local<v8::Object> postData = v8::Local<v8::Object>::Cast( rows->Get( i ) );

                    const v8::Local<v8::Array> props = postData->GetPropertyNames();
                    const uint32_t postDataLength = props->Length();

                    bool hasFile = false;
                    bool hasContentType = false;
                    bool hasContent = false;
                    bool hasName = false;
                    bool hasNewFileName = false;

                    // loop through the properties names, making sure they are valid.
                    for ( uint32_t j = 0; j < postDataLength; ++j ) {

                        int32_t httpPostId = -1;

                        const v8::Local<v8::Value> postDataKey = props->Get( j );
                        const v8::Local<v8::Value> postDataValue = postData->Get( postDataKey );

                        // convert postDataKey to httppost id
                        Nan::Utf8String fieldName( postDataKey );
                        std::string optionName = std::string( *fieldName );
                        stringToUpper( optionName );

                        for ( std::vector<CurlConstant>::const_iterator it = curlOptionHttpPost.begin(), end = curlOptionHttpPost.end(); it != end; ++it ) {

                            if ( it->name == optionName ) {
                                httpPostId = static_cast<int32_t>( it->value );
                            }
                        }

                        switch ( httpPostId ) {

                            case CurlHttpPost::FILE:
                                hasFile = true;
                                break;
                            case CurlHttpPost::TYPE:
                                hasContentType = true;
                                break;
                            case CurlHttpPost::CONTENTS:
                                hasContent = true;
                                break;
                            case CurlHttpPost::NAME:
                                hasName = true;
                                break;
                            case CurlHttpPost::FILENAME:
                                hasNewFileName = true;
                                break;
                            case -1: // property not found
                                std::string errorMsg = string_format( "Invalid property \"%s\" given. Valid properties are FILE, TYPE, CONTENTS, NAME and FILENAME.", *fieldName );
                                Nan::ThrowError( errorMsg.c_str() );
                                return;
                        }

                        // check if value is a string.
                        if ( !postDataValue->IsString() ) {

                            std::string errorMsg = string_format( "Value for property \"%s\" must be a string.", *fieldName );
                            Nan::ThrowTypeError( errorMsg.c_str() );
                            return;
                        }
                    }

                    if ( !hasName ) {

                        Nan::ThrowError( "Missing field \"name\"." );
                        return;
                    }

                    Nan::Utf8String fieldName( postData->Get( Nan::New<v8::String>( "name" ).ToLocalChecked() ) );
                    CURLFORMcode curlFormCode;

                    if ( hasFile ) {

                        Nan::Utf8String file( postData->Get( Nan::New<v8::String>( "file" ).ToLocalChecked() ) );

                        if ( hasContentType ) {

                            Nan::Utf8String contentType( postData->Get( Nan::New<v8::String>( "type" ).ToLocalChecked() ) );

                            if ( hasNewFileName ) {

                                Nan::Utf8String fileName( postData->Get( Nan::New<v8::String>( "filename" ).ToLocalChecked() ) );
                                curlFormCode = httpPost->AddFile( *fieldName, fieldName.length(), *file, *contentType, *fileName );
                            }
                            else {

                                curlFormCode = httpPost->AddFile( *fieldName, fieldName.length(), *file, *contentType );
                            }
                        }
                        else {

                            curlFormCode = httpPost->AddFile( *fieldName, fieldName.length(), *file );
                        }

                    }
                    else if ( hasContent ) { // if file is not set, the contents field MUST be set.

                        Nan::Utf8String fieldValue( postData->Get( Nan::New<v8::String>( "contents" ).ToLocalChecked() ) );

                        curlFormCode = httpPost->AddField( *fieldName, fieldName.length(), *fieldValue, fieldValue.length() );

                    }
                    else {

                        Nan::ThrowError( "Missing field \"contents\"." );
                        return;
                    }



                    if ( curlFormCode != CURL_FORMADD_OK ) {

                        std::string errorMsg = string_format( "Error while adding field \"%s\" to post data. CURL_FORMADD error code: %d", *fieldName, static_cast<int>( curlFormCode ) );
                        Nan::ThrowError( errorMsg.c_str() );
                        return;
                    }
                }

                setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_HTTPPOST, httpPost->first );

                if ( setOptRetCode == CURLE_OK ) {
                    obj->toFree->post.push_back( std::move( httpPost ) );
                }

            }
            else {

                if ( value->IsNull() ) {

                    setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), NULL );

                }
                else {

                    if ( !value->IsArray() ) {

                        Nan::ThrowTypeError( "Option value must be an Array." );
                        return;
                    }

                    //convert value to curl linked list (curl_slist)
                    curl_slist *slist = NULL;
                    v8::Local<v8::Array> array = v8::Local<v8::Array>::Cast( value );

                    for ( uint32_t i = 0, len = array->Length(); i < len; ++i )
                    {
                        slist = curl_slist_append( slist, *Nan::Utf8String( array->Get( i ) ) );
                    }

                    setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), slist );

                    if ( setOptRetCode == CURLE_OK ) {

                        obj->toFree->slist.push_back( slist );
                    }
                }
            }

            //check if option is string, and the value is correct
        }
        else if ( ( optionId = IsInsideCurlConstantStruct( curlOptionString, opt ) ) ) {

            if ( !value->IsString() ) {

                Nan::ThrowTypeError( "Option value must be a string." );
                return;
            }

            // Create a string copy
            bool isNull = value->IsNull();

            if ( isNull ) {

                setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), NULL );
            }

            Nan::Utf8String value( info[1] );

            size_t length = static_cast<size_t>( value.length() );

            std::string valueStr = std::string( *value, length );

            //libcurl makes a copy of the strings after version 7.17, CURLOPT_POSTFIELD is the only exception
            if ( static_cast<CURLoption>( optionId ) == CURLOPT_POSTFIELDS ) {

                std::vector<char> valueChar = std::vector<char>( valueStr.begin(), valueStr.end() );
                valueChar.push_back( 0 );

                setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), &valueChar[0] );

                if ( setOptRetCode == CURLE_OK ) {
                    obj->toFree->str.push_back( std::move( valueChar ) );
                }

            }
            else {
                setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), valueStr.c_str() );
            }

            //check if option is a integer, and the value is correct
        }
        else if ( ( optionId = IsInsideCurlConstantStruct( curlOptionInteger, opt ) ) ) {

            switch ( optionId ) {
                case CURLOPT_INFILESIZE_LARGE:
                case CURLOPT_MAXFILESIZE_LARGE:
                case CURLOPT_MAX_RECV_SPEED_LARGE:
                case CURLOPT_MAX_SEND_SPEED_LARGE:
                case CURLOPT_POSTFIELDSIZE_LARGE:
                case CURLOPT_RESUME_FROM_LARGE:
                    setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), static_cast<curl_off_t>( value->NumberValue() ) );
                    break;
                //special case with READDATA, since we need to store the file descriptor and not overwrite the READDATA already set in the handle.
                case CURLOPT_READDATA:
                    obj->readDataFileDescriptor = value->Int32Value();
                    setOptRetCode = CURLE_OK;
                    break;
                default:
                    setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), static_cast<long>( value->Int32Value() ) );
                    break;
            }

            //check if option is a function, and the value is correct
        }
        else if ( ( optionId = IsInsideCurlConstantStruct( curlOptionFunction, opt ) ) ) {

            bool isNull = value->IsNull();

            if ( !value->IsFunction() && !isNull ) {

                Nan::ThrowTypeError( "Option value must be a null or a function." );
                return;
            }

            v8::Local<v8::Function> callback = value.As<v8::Function>();

            switch ( optionId ) {

                case CURLOPT_CHUNK_BGN_FUNCTION:

                    delete obj->cbChunkBgn;
                    obj->cbChunkBgn = nullptr;

                    if ( isNull ) {

                        // only remove if CURLOPT_CHUNK_END_FUNCTION is not set.
                        if ( !obj->cbChunkEnd ) {
                            curl_easy_setopt( obj->ch, CURLOPT_CHUNK_DATA, NULL );
                        }
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_CHUNK_BGN_FUNCTION, NULL );
                    }
                    else {

                        obj->cbChunkBgn = new Nan::Callback( callback );
                        curl_easy_setopt( obj->ch, CURLOPT_CHUNK_DATA, obj );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_CHUNK_BGN_FUNCTION, Easy::CbChunkBgn );
                    }

                    break;

                case CURLOPT_CHUNK_END_FUNCTION:

                    delete obj->cbChunkEnd;
                    obj->cbChunkEnd = nullptr;

                    if ( isNull ) {

                        // only remove if CURLOPT_CHUNK_BGN_FUNCTION is not set.
                        if ( !obj->cbChunkBgn ) {
                            curl_easy_setopt( obj->ch, CURLOPT_CHUNK_DATA, NULL );
                        }
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_CHUNK_END_FUNCTION, NULL );
                    }
                    else {

                        obj->cbChunkEnd = new Nan::Callback( callback );
                        curl_easy_setopt( obj->ch, CURLOPT_CHUNK_DATA, obj );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_CHUNK_END_FUNCTION, Easy::CbChunkEnd );
                    }

                    break;

                case CURLOPT_DEBUGFUNCTION:

                    delete obj->cbDebug;
                    obj->cbDebug = nullptr;

                    if ( isNull ) {

                        curl_easy_setopt( obj->ch, CURLOPT_DEBUGDATA, NULL );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_DEBUGFUNCTION, NULL );
                    }
                    else {

                        obj->cbDebug = new Nan::Callback( callback );
                        curl_easy_setopt( obj->ch, CURLOPT_DEBUGDATA, obj );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_DEBUGFUNCTION, Easy::CbDebug );
                    }

                    break;

                case CURLOPT_FNMATCH_FUNCTION:

                    delete obj->cbFnMatch;
                    obj->cbFnMatch = nullptr;

                    if ( isNull ) {

                        curl_easy_setopt( obj->ch, CURLOPT_FNMATCH_DATA, NULL );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_FNMATCH_FUNCTION, NULL );
                    }
                    else {

                        obj->cbFnMatch = new Nan::Callback( callback );
                        curl_easy_setopt( obj->ch, CURLOPT_FNMATCH_DATA, obj );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_FNMATCH_FUNCTION, Easy::CbFnMatch );
                    }
                    break;

                case CURLOPT_HEADERFUNCTION:

                    delete obj->cbHeader;
                    obj->cbHeader = nullptr;

                    setOptRetCode = CURLE_OK;

                    if ( !isNull ) {

                        obj->cbHeader = new Nan::Callback( callback );
                    }

                    break;

                case CURLOPT_PROGRESSFUNCTION:

                    delete obj->cbProgress;
                    obj->cbProgress = nullptr;

                    if ( isNull ) {

                        curl_easy_setopt( obj->ch, CURLOPT_PROGRESSDATA, NULL );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_PROGRESSFUNCTION, NULL );
                    }
                    else {

                        obj->cbProgress = new Nan::Callback( callback );
                        curl_easy_setopt( obj->ch, CURLOPT_PROGRESSDATA, obj );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_PROGRESSFUNCTION, Easy::CbProgress );
                    }

                    break;

                case CURLOPT_READFUNCTION:

                    delete obj->cbRead;
                    obj->cbRead = nullptr;

                    setOptRetCode = CURLE_OK;

                    if ( !isNull ) {

                        obj->cbRead = new Nan::Callback( callback );
                    }

                    break;

#if NODE_LIBCURL_VER_GE( 7, 32, 0 )
                /* xferinfo was introduced in 7.32.0.
                   New libcurls will prefer the new callback and instead use that one even if both callbacks are set. */
                case CURLOPT_XFERINFOFUNCTION:

                    delete obj->cbXferinfo;
                    obj->cbXferinfo = nullptr;

                    if ( isNull ) {

                        curl_easy_setopt( obj->ch, CURLOPT_XFERINFODATA, NULL );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_XFERINFOFUNCTION, NULL );
                    }
                    else {

                        obj->cbXferinfo = new Nan::Callback( callback );
                        curl_easy_setopt( obj->ch, CURLOPT_XFERINFODATA, obj );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_XFERINFOFUNCTION, Easy::CbXferinfo );
                    }

                    break;
#endif

                case CURLOPT_WRITEFUNCTION:

                    delete obj->cbWrite;
                    obj->cbWrite = nullptr;

                    setOptRetCode = CURLE_OK;

                    if ( !isNull ) {

                        obj->cbWrite = new Nan::Callback( callback );
                    }

                    break;
            }

        }

        info.GetReturnValue().Set( setOptRetCode );
    }

    // traits class to determine if we need to check for null pointer first
    template <typename> struct ResultTypeIsChar: std::false_type {};
    template <> struct ResultTypeIsChar<char*>: std::true_type {};

    template<typename TResultType, typename Tv8MappingType>
    v8::Local<v8::Value> Easy::GetInfoTmpl( const Easy *obj, int infoId )
    {
        Nan::EscapableHandleScope scope;

        TResultType result;

        CURLINFO info = static_cast<CURLINFO>( infoId );
        CURLcode code = curl_easy_getinfo( obj->ch, info, &result );

        v8::Local<v8::Value> retVal = Nan::Undefined();

        if ( code != CURLE_OK ) {

            std::string str = std::to_string( static_cast<int>( code ) );

            Nan::ThrowError( str.c_str() );
        }
        else {

            //is string
            if ( ResultTypeIsChar<TResultType>::value && !result ) {

                retVal = Nan::MakeMaybe( Nan::EmptyString() ).ToLocalChecked();
            }
            else {

                retVal = Nan::MakeMaybe( Nan::New<Tv8MappingType>( result ) ).ToLocalChecked();
            }

        }

        return scope.Escape( retVal );
    }

    NAN_METHOD( Easy::GetInfo )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle is closed." );
            return;
        }

        v8::Local<v8::Value> infoVal = info[0];

        v8::Local<v8::Value> retVal = Nan::Undefined();

        int infoId;

        CURLINFO curlInfo;
        CURLcode code = CURLE_OK;

        // Special case for unsupported info
        if ( ( infoId = IsInsideCurlConstantStruct( curlInfoNotImplemented, infoVal ) ) ) {

            Nan::ThrowError( "Unsupported info, probably because it's too complex to implement using javascript or unecessary when using javascript." );
            return;
        }

        Nan::TryCatch tryCatch;

        //String
        if ( ( infoId = IsInsideCurlConstantStruct( curlInfoString, infoVal ) ) ) {

            retVal = Easy::GetInfoTmpl<char*, v8::String>( obj, infoId );

        //Double
        }
        else if ( ( infoId = IsInsideCurlConstantStruct( curlInfoDouble, infoVal ) ) ) {

            retVal = Easy::GetInfoTmpl<double, v8::Number>( obj, infoId );

        //Integer
        }
        else if ( ( infoId = IsInsideCurlConstantStruct( curlInfoInteger, infoVal ) ) ) {

            retVal = Easy::GetInfoTmpl<long, v8::Number>( obj, infoId );

        //ACTIVESOCKET and alike
        }
        else if ( ( infoId = IsInsideCurlConstantStruct( curlInfoSocket, infoVal ) ) ) {

            curl_socket_t sock;
            code = curl_easy_getinfo( obj->ch, static_cast<CURLINFO>( infoId ), &sock );

            if ( code == CURLE_OK ) {

                // curl_socket_t is of type SOCKET on Windows,
                //  casting it to int32_t can be dangerous, only if Microsoft ever decides
                //  to change the underlying architecture behind it.
                retVal = Nan::New<v8::Integer>( static_cast<int32_t>( sock ) );
            }

        //Linked list
        }
        else if ( ( infoId = IsInsideCurlConstantStruct( curlInfoLinkedList, infoVal ) ) ) {

            curl_slist *linkedList;
            curl_slist *curr;

            curlInfo = static_cast<CURLINFO>( infoId );
            code = curl_easy_getinfo( obj->ch, curlInfo, &linkedList );

            if ( code == CURLE_OK ) {

                v8::Local<v8::Array> arr = Nan::New<v8::Array>();

                if ( linkedList ) {

                    curr = linkedList;

                    while ( curr ) {

                        arr->Set( arr->Length(), Nan::New<v8::String>( curr->data ).ToLocalChecked() );
                        curr = curr->next;
                    }

                    curl_slist_free_all( linkedList );
                }

                retVal = arr;
            }
        }

        if ( tryCatch.HasCaught() ) {

            Nan::Utf8String msg( tryCatch.Message()->Get() );

            std::string errCode = std::string( *msg );
            code = static_cast<CURLcode>( std::stoi( errCode ) );
        }

        v8::Local<v8::Object> ret = Nan::New<v8::Object>();
        Nan::Set( ret, Nan::New( "code" ).ToLocalChecked(), Nan::New( static_cast<int32_t>( code ) ) );
        Nan::Set( ret, Nan::New( "data" ).ToLocalChecked(), retVal );

        info.GetReturnValue().Set( ret );
    }

    NAN_METHOD( Easy::Send )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle is closed." );
            return;
        }

        if ( info.Length() == 0 ) {

            Nan::ThrowError( "Missing buffer argument." );
            return;
        }

        v8::Local<v8::Value> buf = info[0];

        if ( !buf->IsObject() || !node::Buffer::HasInstance( buf ) ) {

            Nan::ThrowError( "Invalid Buffer instance given." );
            return;
        }

        const char * bufContent = node::Buffer::Data( buf );
        size_t       bufLength  = node::Buffer::Length( buf );

        size_t n = 0;
        CURLcode curlRet = curl_easy_send( obj->ch, bufContent, bufLength, &n );

        v8::Local<v8::Array> ret = Nan::New<v8::Array>();
        Nan::Set( ret, 0, Nan::New( static_cast<int32_t>( curlRet ) ) );
        Nan::Set( ret, 1, Nan::New( static_cast<int32_t>( n ) ) );

        info.GetReturnValue().Set( ret );
    }


    NAN_METHOD( Easy::Recv )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle is closed." );
            return;
        }

        if ( info.Length() == 0 ) {

            Nan::ThrowError( "Missing buffer argument." );
            return;
        }

        v8::Local<v8::Value> buf = info[0];

        if ( !buf->IsObject() || !node::Buffer::HasInstance( buf ) ) {

            Nan::ThrowError( "Invalid Buffer instance given." );
            return;
        }

        char * bufContent      = node::Buffer::Data( buf );
        size_t       bufLength = node::Buffer::Length( buf );

        size_t n = 0;
        CURLcode curlRet = curl_easy_recv( obj->ch, bufContent, bufLength, &n );

        v8::Local<v8::Array> ret = Nan::New<v8::Array>();
        Nan::Set( ret, 0, Nan::New( static_cast<int32_t>( curlRet ) ) );
        Nan::Set( ret, 1, Nan::New( static_cast<int32_t>( n ) ) );

        info.GetReturnValue().Set( ret );
    }

    // exec this handle
    NAN_METHOD( Easy::Perform )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle is closed." );
            return;
        }

        CURLcode code = curl_easy_perform( obj->ch );

        v8::Local<v8::Integer> ret = Nan::New<v8::Integer>( static_cast<int32_t>( code ) );

        info.GetReturnValue().Set( ret );
    }

    NAN_METHOD( Easy::Pause )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle is closed." );
            return;
        }

        if ( !info[0]->IsUint32() ) {

            Nan::ThrowTypeError( "Bitmask value must be an integer." );
            return;
        }

        uint32_t bitmask = info[0]->Uint32Value();

        CURLcode code = curl_easy_pause( obj->ch, static_cast<int>( bitmask ) );

        info.GetReturnValue().Set( static_cast<int32_t>( code ) );
    }

    NAN_METHOD( Easy::Reset )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle closed." );
            return;
        }

        curl_easy_reset( obj->ch );

        // reset the URL, https://github.com/bagder/curl/commit/ac6da721a3740500cc0764947385eb1c22116b83
        curl_easy_setopt( obj->ch, CURLOPT_URL, "" );

        obj->DisposeCallbacks();
        obj->ResetRequiredHandleOptions();

        obj->toFree = nullptr;
        obj->toFree = std::make_shared<Easy::ToFree>();

        obj->readDataFileDescriptor = -1;

        info.GetReturnValue().Set( info.This() );
    }

    NAN_METHOD( Easy::DupHandle )
    {
        Nan::HandleScope scope;

        // create a new js object.
        const int argc = 1;
        v8::Local<v8::Value> argv[argc] = { info.This() };
        v8::Local<v8::Function> cons = Nan::New( Easy::constructor )->GetFunction();

        v8::Local<v8::Object> newInstance = cons->NewInstance( argc, argv );

        info.GetReturnValue().Set( newInstance );
    }

    NAN_METHOD( Easy::OnSocketEvent )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !info.Length() ) {

            Nan::ThrowError( "You must specify the callback function." );
            return;
        }

        v8::Local<v8::Value> arg = info[0];

        if ( arg->IsNull() ) {

            delete obj->cbOnSocketEvent;
            obj->cbOnSocketEvent = nullptr;

            info.GetReturnValue().Set( info.This() );
            return;
        }

        if ( !arg->IsFunction() ) {

            Nan::ThrowTypeError( "Invalid callback given." );
            return;
        }

        v8::Local<v8::Function> callback = arg.As<v8::Function>();

        obj->cbOnSocketEvent = new Nan::Callback( callback );
        info.GetReturnValue().Set( info.This() );
    }

    NAN_METHOD( Easy::MonitorSocketEvents )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        Nan::TryCatch tryCatch;

        obj->MonitorSockets();

        if ( tryCatch.HasCaught() ) {

            tryCatch.ReThrow();
            return;
        }

        info.GetReturnValue().Set( info.This() );
    }

    NAN_METHOD( Easy::UnmonitorSocketEvents )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        Nan::TryCatch tryCatch;

        obj->UnmonitorSockets();

        if ( tryCatch.HasCaught() ) {

            tryCatch.ReThrow();
            return;
        }

        info.GetReturnValue().Set( info.This() );
    }

    NAN_METHOD( Easy::Close )
    {
        //check https://github.com/php/php-src/blob/master/ext/curl/interface.c#L3196
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle already closed." );
            return;
        }

        if ( obj->isInsideMultiHandle ) {

            Nan::ThrowError( "Curl handle is inside a Multi instance, you must remove it first." );
            return;
        }

        obj->Dispose();

        return;
    }

    NAN_METHOD( Easy::StrError )
    {
        Nan::HandleScope scope;

        v8::Local<v8::Value> errCode = info[0];

        if ( !errCode->IsInt32() ) {

            Nan::ThrowTypeError( "Invalid errCode passed to Easy.strError." );
            return;
        }

        const char * errorMsg = curl_easy_strerror( static_cast<CURLcode>( errCode->Int32Value() ) );

        v8::Local<v8::String> ret = Nan::New( errorMsg ).ToLocalChecked();

        info.GetReturnValue().Set( ret );
    }

}
