#include "Curl.h"

#include <curl/curl.h>
#include <iostream>
#include <stdlib.h>
#include <string.h>

#include "string_format.h"

// Set curl constants
#include "generated-stubs/curlOptionsString.h"
#include "generated-stubs/curlOptionsInteger.h"
#include "generated-stubs/curlOptionsFunction.h"
#include "generated-stubs/curlInfosString.h"
#include "generated-stubs/curlInfosInteger.h"
#include "generated-stubs/curlInfosDouble.h"

#include "generated-stubs/curlAuth.h"
#include "generated-stubs/curlProtocols.h"
#include "generated-stubs/curlPause.h"
#include "generated-stubs/curlHttp.h"

#if LIBCURL_VERSION_NUM >= 0x072500
#include "generated-stubs/curlHeader.h"
#endif

#define X(name) {#name, CURLOPT_##name}
Curl::CurlOption curlOptionsLinkedList[] = {
#if LIBCURL_VERSION_NUM >= 0x070a03
    X(HTTP200ALIASES),
#endif

#if LIBCURL_VERSION_NUM >= 0x071400
    X(MAIL_RCPT),
#endif

#if LIBCURL_VERSION_NUM >= 0x071503
    X(RESOLVE),
#endif

    X(HTTPPOST),
    X(HTTPHEADER),
#if LIBCURL_VERSION_NUM >= 0x072500
    X(PROXYHEADER),
#endif
    X(QUOTE),
    X(POSTQUOTE),
    X(PREQUOTE),
    X(TELNETOPTIONS)
};
#undef X

#define X(name) {#name, CURLINFO_##name}
Curl::CurlOption curlInfosLinkedList[] = {
    X(SSL_ENGINES),
    X(COOKIELIST)
};
#undef X

#define X(name) {#name, CurlHttpPost::name}
Curl::CurlOption curlHttpPostOptions[] = {
    X(NAME),
    X(FILE),
    X(CONTENTS),
    X(TYPE)
};
#undef X

//Make string all uppercase
void stringToUpper( std::string &s )
{
    for( unsigned int i = 0; i < s.length(); i++ )
        s[i] = toupper( s[i] );
}

curlMapId optionsMapId;
curlMapName optionsMapName;
curlMapId infosMapId;
curlMapName infosMapName;

CURLM  *Curl::curlMulti      = NULL;
int     Curl::count          = 0;

std::map< CURL*, Curl* > Curl::curls;
uv_timer_t Curl::curlTimeout;

//those need to be reset if we ever move outside of the global scope
Nan::Persistent<v8::Function> Curl::constructor;
Nan::Persistent<v8::String> Curl::onDataCbSymbol;
Nan::Persistent<v8::String> Curl::onHeaderCbSymbol;
Nan::Persistent<v8::String> Curl::onEndCbSymbol;
Nan::Persistent<v8::String> Curl::onErrorCbSymbol;

// Add Curl constructor to the module exports
NAN_MODULE_INIT( Curl::Initialize )
{
    Nan::HandleScope scope;

    //*** Initialize cURL ***//
    CURLcode code = curl_global_init( CURL_GLOBAL_ALL );
    if ( code != CURLE_OK ) {
        Curl::ThrowError( "curl_global_init failed!" );
        return;
    }

    Curl::curlMulti = curl_multi_init();
    if ( Curl::curlMulti == NULL ) {
        Curl::ThrowError( "curl_multi_init failed!" );
        return;
    }

    //init uv timer to be used with HandleTimeout
    int timerStatus = uv_timer_init( uv_default_loop(), &Curl::curlTimeout );
    assert( timerStatus == 0 );

    //set curl_multi callbacks to use libuv
    curl_multi_setopt( Curl::curlMulti, CURLMOPT_SOCKETFUNCTION, Curl::HandleSocket );
    curl_multi_setopt( Curl::curlMulti, CURLMOPT_TIMERFUNCTION, Curl::HandleTimeout );

    //** Construct Curl js "class"
    v8::Local<v8::FunctionTemplate> tmpl = Nan::New<v8::FunctionTemplate>( Curl::New );
    tmpl->SetClassName( Nan::New( "Curl" ).ToLocalChecked() );
    tmpl->InstanceTemplate()->SetInternalFieldCount( 1 );

    // Export cURL Constants
    v8::Local<v8::Object> optionsObj   = Nan::New<v8::Object>();
    v8::Local<v8::Object> infosObj     = Nan::New<v8::Object>();
    v8::Local<v8::Object> protocolsObj = Nan::New<v8::Object>();
    v8::Local<v8::Object> pauseObj     = Nan::New<v8::Object>();
    v8::Local<v8::Object> authObj      = Nan::New<v8::Object>();
    v8::Local<v8::Object> httpObj      = Nan::New<v8::Object>();

    Curl::ExportConstants( &optionsObj, curlOptionsString, sizeof( curlOptionsString ), &optionsMapId, &optionsMapName );
    Curl::ExportConstants( &optionsObj, curlOptionsInteger, sizeof( curlOptionsInteger ), &optionsMapId, &optionsMapName );
    Curl::ExportConstants( &optionsObj, curlOptionsFunction, sizeof( curlOptionsFunction ), &optionsMapId, &optionsMapName );
    Curl::ExportConstants( &optionsObj, curlOptionsLinkedList, sizeof( curlOptionsLinkedList ), &optionsMapId, &optionsMapName );

    Curl::ExportConstants( &infosObj, curlInfosString, sizeof( curlInfosString ), &infosMapId, &infosMapName );
    Curl::ExportConstants( &infosObj, curlInfosInteger, sizeof( curlInfosInteger ), &infosMapId, &infosMapName );
    Curl::ExportConstants( &infosObj, curlInfosDouble, sizeof( curlInfosDouble ), &infosMapId, &infosMapName );
    Curl::ExportConstants( &infosObj, curlInfosLinkedList, sizeof( curlInfosLinkedList ), &infosMapId, &infosMapName );

    Curl::ExportConstants( &authObj, curlAuth, sizeof( curlAuth ), nullptr, nullptr );
    Curl::ExportConstants( &httpObj, curlHttp, sizeof( curlHttp ), nullptr, nullptr );
    Curl::ExportConstants( &pauseObj, curlPause, sizeof( curlPause ), nullptr, nullptr );
    Curl::ExportConstants( &protocolsObj, curlProtocols, sizeof( curlProtocols ), nullptr, nullptr );

#if LIBCURL_VERSION_NUM >= 0x072500
    v8::Local<v8::Object> headerObj      = Nan::New<v8::Object>();
    Curl::ExportConstants( &headerObj, curlHeader, sizeof( curlHeader ), nullptr, nullptr );
#endif

    v8::PropertyAttribute attributes = static_cast<v8::PropertyAttribute>( v8::ReadOnly|v8::DontDelete );

    // Prototype Methods
    Nan::SetPrototypeMethod( tmpl, "setOpt", Curl::SetOpt );
    Nan::SetPrototypeMethod( tmpl, "getInfo", Curl::GetInfo );
    Nan::SetPrototypeMethod( tmpl, "perform", Curl::Perform );
    Nan::SetPrototypeMethod( tmpl, "pause", Curl::Pause );
    Nan::SetPrototypeMethod( tmpl, "reset", Curl::Reset );
    Nan::SetPrototypeMethod( tmpl, "close", Curl::Close );

    // Static Methods
    Nan::SetMethod( tmpl, "getCount" , GetCount );
    Nan::SetMethod( tmpl, "getVersion" , GetVersion );

    // Static members
    Nan::SetTemplate( tmpl, Nan::New<v8::String>( "option" ).ToLocalChecked(), optionsObj, attributes );
    Nan::SetTemplate( tmpl, Nan::New<v8::String>( "info" ).ToLocalChecked() , infosObj, attributes );

#if LIBCURL_VERSION_NUM >= 0x071200
    //CURL_WRITEFUNC_PAUSE was added in libcurl 7.18
    Nan::ForceSet( pauseObj, Nan::New<v8::String>("WRITEFUNC").ToLocalChecked(), Nan::New<v8::Uint32>(CURL_WRITEFUNC_PAUSE), attributes );
#endif

    Nan::SetTemplate( tmpl, Nan::New<v8::String>( "auth" ).ToLocalChecked(), authObj, attributes );
    Nan::SetTemplate( tmpl, Nan::New<v8::String>( "http" ).ToLocalChecked(),  httpObj, attributes );
    Nan::SetTemplate( tmpl, Nan::New<v8::String>( "pause" ).ToLocalChecked(), pauseObj, attributes );
    Nan::SetTemplate( tmpl, Nan::New<v8::String>( "protocol" ).ToLocalChecked(), protocolsObj, attributes );

#if LIBCURL_VERSION_NUM >= 0x072500
    Nan::SetTemplate( tmpl, Nan::New<v8::String>( "header" ).ToLocalChecked(), headerObj, attributes );
#endif

    Nan::SetTemplate( tmpl, Nan::New<v8::String>( "VERSION_NUM" ).ToLocalChecked(), Nan::New<v8::Integer>( LIBCURL_VERSION_NUM ), attributes );

    Curl::constructor.Reset( tmpl->GetFunction() );

    Curl::onDataCbSymbol.Reset( Nan::New( "onData" ).ToLocalChecked() );
    Curl::onHeaderCbSymbol.Reset( Nan::New( "onHeader" ).ToLocalChecked() );
    Curl::onEndCbSymbol.Reset( Nan::New( "onEnd" ).ToLocalChecked() );
    Curl::onErrorCbSymbol.Reset( Nan::New( "onError" ).ToLocalChecked() );

    Nan::Set( target, Nan::New( "Curl" ).ToLocalChecked(), tmpl->GetFunction() );
}

Curl::Curl() : cbProgress( nullptr ), cbXferinfo( nullptr ), cbDebug( nullptr ), isInsideMultiCurl( false ), isOpen( true )
{
    ++Curl::count;

    this->curl = curl_easy_init();

    assert( this->curl );

    this->httpPost = new CurlHttpPost();

    this->isCbProgressAlreadyAborted = false;

    //set callbacks
    curl_easy_setopt( this->curl, CURLOPT_WRITEFUNCTION, Curl::WriteFunction );
    curl_easy_setopt( this->curl, CURLOPT_WRITEDATA, this );
    curl_easy_setopt( this->curl, CURLOPT_HEADERFUNCTION, Curl::HeaderFunction );
    curl_easy_setopt( this->curl, CURLOPT_HEADERDATA, this );

    Curl::curls[curl] = this;
}

Curl::~Curl(void)
{
    --Curl::count;

    //cleanup curl related stuff
    if ( this->isOpen ) {

        this->Dispose();
    }

    if ( this->httpPost ) {

        delete this->httpPost;
        this->httpPost = nullptr;
    }
}

//Dispose persistent handler, and delete itself
void Curl::Dispose()
{
    //Make sure the handle is still open.
    assert( this->isOpen );

    if ( this->curl ) {

        if ( this->isInsideMultiCurl ) {

            curl_multi_remove_handle( this->curlMulti, this->curl );
        }

        Curl::curls.erase( this->curl );
        curl_easy_cleanup( this->curl );
    }

    for ( std::vector<curl_slist*>::iterator it = this->curlLinkedLists.begin(), end = this->curlLinkedLists.end(); it != end; ++it ) {

        curl_slist *linkedList = *it;

        if ( linkedList ) {

            curl_slist_free_all( linkedList );
        }
    }

    if ( this->httpPost ) {

        this->httpPost->Reset();
    }

    //dispose persistent callbacks
    this->DisposeCallbacks();

    this->isOpen = false;
}

void Curl::DisposeCallbacks()
{
    //this->cbProgress->
    if ( !this->cbProgress ) {
        delete this->cbProgress;
    }

    if ( !this->cbXferinfo ) {
        delete this->cbXferinfo;
    }

    if ( this->cbDebug ) {
        delete this->cbDebug;
    }
}

//The curl_multi_socket_action(3) function informs the application about updates
//  in the socket (file descriptor) status by doing none, one, or multiple calls to this function
int Curl::HandleSocket( CURL *easy, curl_socket_t s, int action, void *userp, void *socketp )
{
    CurlSocketContext *ctx = nullptr;

    if ( action == CURL_POLL_IN || action == CURL_POLL_OUT || action == CURL_POLL_INOUT || action == CURL_POLL_NONE ) {

        //create ctx if it doesn't exists and assign it to the current socket,
        if ( socketp ) {

            ctx = static_cast<Curl::CurlSocketContext*>(socketp);

        } else {

            ctx = Curl::CreateCurlSocketContext( s );
            curl_multi_assign( Curl::curlMulti, s, static_cast<void*>( ctx ) );

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

        //call process when possible
        return uv_poll_start( &ctx->pollHandle, events, Curl::Process );
    }

    //action == CURL_POLL_REMOVE
    if ( action == CURL_POLL_REMOVE && socketp ) {

        ctx = static_cast<CurlSocketContext*>( socketp );

        uv_poll_stop( &ctx->pollHandle );
        Curl::DestroyCurlSocketContext( ctx );
        curl_multi_assign( Curl::curlMulti, s, NULL );

        return 0;
    }

    return -1;
}

//Creates a Context to be used to store data between events
Curl::CurlSocketContext* Curl::CreateCurlSocketContext( curl_socket_t sockfd )
{
    int r;
    Curl::CurlSocketContext *ctx = NULL;

    ctx = static_cast<Curl::CurlSocketContext*>( malloc( sizeof( *ctx ) ) );

    ctx->sockfd = sockfd;

    //uv_poll simply watches file descriptors using the operating system notification mechanism
    //Whenever the OS notices a change of state in file descriptors being polled, libuv will invoke the associated callback.
    r = uv_poll_init_socket( uv_default_loop(), &ctx->pollHandle, sockfd );

    assert( r == 0 );

    ctx->pollHandle.data = ctx;

    return ctx;
}

//This function will be called when the timeout value changes from LibCurl.
//The timeout value is at what latest time the application should call one of
//the "performing" functions of the multi interface (curl_multi_socket_action(3) and curl_multi_perform(3)) - to allow libcurl to keep timeouts and retries etc to work.
int Curl::HandleTimeout( CURLM *multi /* multi handle */ , long timeoutMs /* timeout in milliseconds */ , void *userp /* TIMERDATA */ )
{
    //stops running timer.
    uv_timer_stop( &Curl::curlTimeout );

    if ( timeoutMs == 0 ) {

        int runningHandles = 0;
        curl_multi_socket_action( Curl::curlMulti, CURL_SOCKET_TIMEOUT, 0, &runningHandles );
        Curl::ProcessMessages();

    } else if ( timeoutMs > 0 ) {

        uv_timer_start( &Curl::curlTimeout, Curl::OnTimeout, timeoutMs, 0 );

    }

    return 0;
}

//Function called when the previous timeout set reaches 0
UV_TIMER_CB( Curl::OnTimeout )
{
    int runningHandles = 0;
    curl_multi_socket_action( Curl::curlMulti, CURL_SOCKET_TIMEOUT, 0, &runningHandles );
    Curl::ProcessMessages();
}

//Called when libcurl thinks there is something to process
void Curl::Process( uv_poll_t* handle, int status, int events )
{
    //uv_timer_stop( &Curl::curlTimeout );

    int flags = 0;

    int runningHandles = 0;

    CURLMcode code;

    if ( status < 0 ) flags = CURL_CSELECT_ERR;
    if ( events & UV_READABLE ) flags |= CURL_CSELECT_IN;
    if ( events & UV_WRITABLE ) flags |= CURL_CSELECT_OUT;

    CurlSocketContext *ctx = static_cast<CurlSocketContext*>( handle->data );

    //Before version 7.20.0: If you receive CURLM_CALL_MULTI_PERFORM, this basically means that you should call curl_multi_socket_action again
    // before you wait for more actions on libcurl's sockets.
    // You don't have to do it immediately, but the return code means that libcurl
    //  may have more data available to return or that there may be more data to send off before it is "satisfied".
    do {
        code = curl_multi_socket_action( Curl::curlMulti, ctx->sockfd, flags, &runningHandles );
    } while ( code == CURLM_CALL_MULTI_PERFORM );

    if ( code != CURLM_OK ) {

        Curl::ThrowError( "curl_multi_socket_actioon Failed", curl_multi_strerror( code ) );
        return;
    }

    Curl::ProcessMessages();
}

void Curl::ProcessMessages()
{
    CURLMcode code;
    CURLMsg *msg = NULL;
    int pending = 0;

    while( ( msg = curl_multi_info_read( Curl::curlMulti, &pending ) ) ) {

        if ( msg->msg == CURLMSG_DONE ) {

            Curl *curl = Curl::curls[msg->easy_handle];

            CURLcode statusCode = msg->data.result;

            code = curl_multi_remove_handle( Curl::curlMulti, msg->easy_handle );

            curl->isInsideMultiCurl = false;

            if ( code != CURLM_OK ) {
                Curl::ThrowError( "curl_multi_remove_handle Failed", curl_multi_strerror( code ) );
                return;
            }

            if ( statusCode == CURLE_OK ) {

                curl->OnEnd();

            } else {

                curl->OnError( statusCode );
            }
        }
    }
}

//Called when libcurl thinks the socket can be destroyed
void Curl::DestroyCurlSocketContext( Curl::CurlSocketContext* ctx )
{
    uv_handle_t *handle = (uv_handle_t*) &ctx->pollHandle;

    uv_close( handle, Curl::OnCurlSocketClose );
}
void Curl::OnCurlSocketClose( uv_handle_t *handle )
{
    CurlSocketContext *ctx = static_cast<CurlSocketContext*>( handle->data );
    free( ctx );
}

//Called by libcurl when some chunk of data (from body) is available
size_t Curl::WriteFunction( char *ptr, size_t size, size_t nmemb, void *userdata )
{
    Curl *obj = static_cast<Curl*>( userdata );
    return obj->OnData( ptr, size, nmemb );
}

//Called by libcurl when some chunk of data (from headers) is available
size_t Curl::HeaderFunction( char *ptr, size_t size, size_t nmemb, void *userdata )
{
    Curl *obj = static_cast<Curl*>( userdata );
    return obj->OnHeader( ptr, size, nmemb );
}

size_t Curl::OnData( char *data, size_t size, size_t nmemb )
{
    //@TODO If the callback close the connection, an error will be throw!
    //@TODO Implement: From 7.18.0, the function can return CURL_WRITEFUNC_PAUSE which then will cause writing to this connection to become paused. See curl_easy_pause(3) for further details.
    Nan::HandleScope scope;

    size_t n = size * nmemb;

    v8::Local<v8::Value> cb = this->handle()->Get( Nan::New( Curl::onDataCbSymbol ) );

    assert( cb->IsFunction() );

    v8::Local<v8::Object> buf = Nan::CopyBuffer( data, (uint32_t) n ).ToLocalChecked();

    v8::Local<v8::Value> argv[] = { buf };

    v8::Local<v8::Value> retVal = Nan::MakeCallback( this->handle(), cb.As<v8::Function>(), 1, argv );

    size_t ret = n;

    if ( retVal.IsEmpty() ) {

        ret = 0;
    } else {

        ret = retVal->Uint32Value();
    }

    return ret;
}


size_t Curl::OnHeader( char *data, size_t size, size_t nmemb )
{
    Nan::HandleScope scope;

    size_t n = size * nmemb;

    v8::Local<v8::Value> cb = this->handle()->Get( Nan::New( Curl::onHeaderCbSymbol ) );

    assert( cb->IsFunction() );

    v8::Local<v8::Object> buf = Nan::CopyBuffer( data, (uint32_t) n ).ToLocalChecked();

    v8::Local<v8::Value> argv[] = { buf };

    v8::Local<v8::Value> retVal = Nan::MakeCallback( this->handle(), cb.As<v8::Function>(), 1, argv );

    size_t ret = n;

    if ( retVal.IsEmpty() ) {

        ret = 0;
    } else {

        ret = retVal->Int32Value();
    }

    return ret;
}

void Curl::OnEnd()
{
    Nan::HandleScope scope;

    v8::Local<v8::Value> cb = this->handle()->Get( Nan::New( Curl::onEndCbSymbol ) );

    Nan::MakeCallback( this->handle(), cb.As<v8::Function>(), 0, NULL );
}

void Curl::OnError( CURLcode errorCode )
{
    Nan::HandleScope scope;

    v8::Local<v8::Value> cb = this->handle()->Get( Nan::New( Curl::onErrorCbSymbol ) );

    v8::Local<v8::Value> argv[] = { Nan::Error( curl_easy_strerror( errorCode ) ), Nan::New<v8::Integer>( errorCode )  };

    Nan::MakeCallback( this->handle(), cb.As<v8::Function>(), 2, argv );
}

//Export Options/Infos to constants in the given Object, and add their mapping to the respective maps.
template<typename T>
void Curl::ExportConstants( T *obj, Curl::CurlOption *optionGroup, uint32_t len, curlMapId *mapId, curlMapName *mapName )
{
    Nan::HandleScope scope;

    len = len / sizeof( Curl::CurlOption );

    if ( !obj ) { //Null pointer, just stop
        return;
    }

    v8::PropertyAttribute attributes = static_cast<v8::PropertyAttribute>( v8::ReadOnly | v8::DontDelete );

    for ( uint32_t i = 0; i < len; ++i ) {

        const Curl::CurlOption &option = optionGroup[i];

        const int32_t *optionId = &option.value;

        std::string sOptionName( option.name );

        (*obj)->ForceSet(
            Nan::New<v8::String>( ( sOptionName ).c_str() ).ToLocalChecked(),
            Nan::New<v8::Integer>( option.value ),
            attributes
        );

        //add to vector, and add pointer to respective map
        //using insert because of http://stackoverflow.com/a/16436560/710693
        if ( mapId && mapName ) {
            mapName->insert( std::make_pair( sOptionName, optionId ) );
            mapId->insert( std::make_pair( optionId, sOptionName ) );
        }
    }
}

//Create a Exception with the given message and reason
void Curl::ThrowError( const char *message, const char *reason )
{
    const char *what = message;
    std::string msg;

    if ( reason ) {

        msg = string_format( "%s: %s", message, reason );
        what = msg.c_str();
    }

    Nan::ThrowError( what );
}

//Callbacks
int Curl::CbProgress( void *clientp, double dltotal, double dlnow, double ultotal, double ulnow )
{
    Nan::HandleScope scope;

    Curl *obj = static_cast<Curl *>( clientp );

    assert( obj );

    if ( obj->isCbProgressAlreadyAborted )
        return 1;

    int32_t retvalInt32;

    v8::Local<v8::Value> argv[] = {
        Nan::New<v8::Number>( (double) dltotal ),
        Nan::New<v8::Number>( (double) dlnow ),
        Nan::New<v8::Number>( (double) ultotal ),
        Nan::New<v8::Number>( (double) ulnow )
    };

    //Should handle possible exceptions here?
    v8::Local<v8::Value> retval = obj->cbProgress->Call( obj->handle(), 4, argv );

    if ( !retval->IsInt32() ) {

        Nan::ThrowTypeError( "Return value from the progress callback must be an integer." ) ;

        retvalInt32 = 1;

    } else {

        retvalInt32 = retval->Int32Value();
    }

    if ( retvalInt32 )
        obj->isCbProgressAlreadyAborted = true;

    return retvalInt32;
}

int Curl::CbXferinfo( void *clientp, curl_off_t dltotal, curl_off_t dlnow, curl_off_t ultotal, curl_off_t ulnow )
{
    Nan::HandleScope scope;

    Curl *obj = static_cast<Curl *>( clientp );

    assert( obj );

    if ( obj->isCbProgressAlreadyAborted )
        return 1;

    int32_t retvalInt32;

    v8::Local<v8::Value> argv[] = {
        Nan::New<v8::Number>( (double) dltotal ),
        Nan::New<v8::Number>( (double) dlnow ),
        Nan::New<v8::Number>( (double) ultotal ),
        Nan::New<v8::Number>( (double) ulnow )
    };

    v8::Local<v8::Value> retval = obj->cbXferinfo->Call( obj->handle(), 4, argv );

    if ( !retval->IsInt32() ) {

        Nan::ThrowTypeError( "Return value from the progress callback must be an integer." );

        retvalInt32 = 1;

    } else {

        retvalInt32 = retval->Int32Value();
    }

    if ( retvalInt32 )
        obj->isCbProgressAlreadyAborted = true;

    return retvalInt32;
}

int Curl::CbDebug( CURL *handle, curl_infotype type, char *data, size_t size, void *userptr )
{
    Nan::HandleScope scope;

    Curl *obj = Curl::curls[handle];

    assert( obj );

    v8::Local<v8::Value> argv[] = {
        Nan::New<v8::Integer>( type ),
        Nan::New<v8::String>( data, static_cast<int>( size ) ).ToLocalChecked()
    };

    v8::Local<v8::Value> retval = obj->cbDebug->Call( obj->handle(), 2, argv );

    int32_t retvalInt = 0;

    if ( !retval->IsInt32() ) {

        Nan::ThrowTypeError( "Return value from the debug callback must be an integer." );

        retvalInt = 1;

    } else {

        retvalInt = retval->Int32Value();
    }

    return retvalInt;
}

NAN_METHOD( Curl::New )
{
    assert( info.IsConstructCall() );

    Curl *obj = new Curl();

    obj->Wrap( info.This() );

    info.GetReturnValue().Set( info.This() );
}

//Function that checks if given option is inside the given Curl::CurlOption struct, if it is, returns the optionId
#define isInsideOption( options, option ) isInsideCurlOption( options, sizeof( options ), option )
int isInsideCurlOption( const Curl::CurlOption *curlOptions, const int lenOfOption, const v8::Local<v8::Value> &option ) {

    Nan::HandleScope scope;

    bool isString = option->IsString();
    bool isInt    = option->IsInt32();

    std::string optionName = "";
    int32_t optionId = -1;

    if ( !isString && !isInt ) {
        return 0;
    }

    if ( isString ) {

        Nan::Utf8String optionNameV8( option );

        optionName = std::string( *optionNameV8 );

        stringToUpper( optionName );

    } else { //int

        optionId = option->ToInteger()->Int32Value();

    }

    for ( uint32_t len = lenOfOption / sizeof( Curl::CurlOption ), i = 0; i < len; ++i ) {

        const Curl::CurlOption &curr = curlOptions[i];

        if ( (isString && curr.name == optionName) || (isInt && curr.value == optionId)  )
            return curlOptions[i].value;
    }

    return 0;
}

NAN_METHOD( Curl::SetOpt )
{
    Nan::HandleScope scope;

    Curl *obj = Nan::ObjectWrap::Unwrap<Curl>( info.This() );

    if ( !obj->isOpen ) {

        Nan::ThrowError( "Curl handler is closed." );
        return;
    }

    v8::Local<v8::Value> opt   = info[0];
    v8::Local<v8::Value> value = info[1];

    v8::Local<v8::Integer> optCallResult = Nan::New<v8::Integer>( CURLE_FAILED_INIT );

    int optionId;

    //check if option is linked list, and the value is correct
    if ( ( optionId = isInsideOption( curlOptionsLinkedList, opt ) ) ) {

        //special case, array of objects
        if ( optionId == CURLOPT_HTTPPOST ) {

            std::string invalidArrayMsg = "Option value should be an Array of Objects.";

            if ( !value->IsArray() ) {

                Nan::ThrowTypeError( invalidArrayMsg.c_str() );
                return;
            }

            v8::Local<v8::Array> rows = v8::Local<v8::Array>::Cast( value );

            //reset the old data, if any.
            obj->httpPost->Reset();

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
                bool hasName = false;
                bool hasContent = false;

                // Loop through the properties names, making sure they are valid.
                for ( uint32_t j = 0 ; j < postDataLength ; ++j ) {

                    int httpPostId = -1;

                    const v8::Local<v8::Value> postDataKey = props->Get( j );
                    const v8::Local<v8::Value> postDataValue = postData->Get( postDataKey );

                    //convert postDataKey to field id
                    Nan::Utf8String fieldName( postDataKey );
                    std::string optionName = std::string( *fieldName );
                    stringToUpper( optionName );

                    for ( uint32_t k = 0, kLen = sizeof( curlHttpPostOptions ) / sizeof( Curl::CurlOption ); k < kLen; ++k ) {

                        if ( curlHttpPostOptions[k].name == optionName )
                            httpPostId = curlHttpPostOptions[k].value;

                    }

                    switch( httpPostId ) {

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
                    case -1: //Property not found
                        std::string errorMsg = string_format( "Invalid property \"%s\" given.", *fieldName );
                        Nan::ThrowError( errorMsg.c_str() );
                        return;
                    }

                    //Check if value is a string.
                    if ( !postDataValue->IsString() ) {

                        std::string errorMsg = string_format( "Value for property \"%s\" must be a string.", *fieldName );
                        Nan::ThrowTypeError( errorMsg.c_str() );
                        return;
                    }
                }

                if ( !hasName ) {

                    std::string errorMsg = string_format( "Missing field \"%s\".", "name" );
                    Nan::ThrowError( errorMsg.c_str()  );
                    return;
                }

                Nan::Utf8String fieldName( postData->Get( Nan::New<v8::String>( "name" ).ToLocalChecked() ) );
                CURLFORMcode curlFormCode;

                if ( hasFile ) {

                    Nan::Utf8String file( postData->Get( Nan::New<v8::String>( "file" ).ToLocalChecked() ) );

                    if ( hasContentType ) {

                        Nan::Utf8String contentType( postData->Get( Nan::New<v8::String>( "type" ).ToLocalChecked() ) );

                        curlFormCode = obj->httpPost->AddFile( *fieldName, fieldName.length(), *file, *contentType );

                    } else {

                        curlFormCode = obj->httpPost->AddFile( *fieldName, fieldName.length(), *file );

                    }

                } else if ( hasContent ) { //if not a file, it's a normal field.

                    Nan::Utf8String fieldValue( postData->Get( Nan::New<v8::String>( "contents" ).ToLocalChecked() ) );

                    curlFormCode = obj->httpPost->AddField( *fieldName, fieldName.length(), *fieldValue, fieldValue.length() );

                } else {

                    std::string errorMsg = string_format( "Missing field \"%s\".", "contents" );
                    Nan::ThrowError( errorMsg.c_str()  );
                    return;
                }

                if ( curlFormCode != CURL_FORMADD_OK ) {

                    std::string errorMsg = string_format( "Error while adding field \"%s\" to post data. CURL_FORMADD error code: %d", *fieldName, (int) curlFormCode );
                    Nan::ThrowError( errorMsg.c_str()  );
                    return;
                }
            }

            optCallResult = Nan::New<v8::Integer>( curl_easy_setopt( obj->curl, CURLOPT_HTTPPOST, obj->httpPost->first ) );

        } else {

            if ( value->IsNull() ) {

                optCallResult = Nan::New<v8::Integer>(
                    curl_easy_setopt(
                        obj->curl, (CURLoption) optionId, NULL
                    )
                );

            } else {

                if ( !value->IsArray() ) {

                    Nan::ThrowTypeError( "Option value should be an array." );
                    return;
                }

                //convert value to curl linked list (curl_slist)
                curl_slist *slist = NULL;
                v8::Local<v8::Array> array = v8::Local<v8::Array>::Cast( value );

                for ( uint32_t i = 0, len = array->Length(); i < len; ++i )
                {
                    slist = curl_slist_append( slist, *Nan::Utf8String( array->Get( i ) ) );
                }

                obj->curlLinkedLists.push_back( slist );

                optCallResult = Nan::New<v8::Integer>(
                    curl_easy_setopt(
                        obj->curl, (CURLoption) optionId, slist
                    )
                );
            }
        }

        //check if option is string, and the value is correct
    } else if ( ( optionId = isInsideOption( curlOptionsString, opt ) ) ) {

        if ( !value->IsString() ) {

            Nan::ThrowTypeError( "Option value should be a string." );
            return;
        }

        // Create a string copy
        bool isNull = value->IsNull();

        if ( !isNull ) {

            //libcurl don't copy the string content before version 7.17
            Nan::Utf8String value( info[1] );
            size_t length = (size_t) value.length();
            obj->curlStrings[optionId] = std::string( *value, length );
        }

        optCallResult = Nan::New<v8::Integer>(
            curl_easy_setopt(
                obj->curl, (CURLoption) optionId, ( !isNull ) ? obj->curlStrings[optionId].c_str() : NULL
            )
        );


    //check if option is a integer, and the value is correct
    } else if ( ( optionId = isInsideOption( curlOptionsInteger, opt ) )  ) {

        int32_t val = value->Int32Value();

        //If not an integer, but not falsy value, val = 1
        if ( !value->IsInt32() ) {

            val = value->BooleanValue();
        }

        optCallResult = Nan::New<v8::Integer>(
            curl_easy_setopt(
                obj->curl, (CURLoption) optionId, val
            )
        );

    } else if ( ( optionId = isInsideOption( curlOptionsFunction, opt ) ) ) {

        if ( !value->IsFunction() ) {

            Nan::ThrowTypeError( "Option value must be a function." );
            return;
        }

        v8::Local<v8::Function> callback = value.As<v8::Function>();

        switch ( optionId ) {

#if LIBCURL_VERSION_NUM >= 0x072000
            /* xferinfo was introduced in 7.32.0, no earlier libcurl versions will compile as they won't have the symbols around.
                New libcurls will prefer the new callback and instead use that one even if both callbacks are set. */
            case CURLOPT_XFERINFOFUNCTION:

                obj->cbXferinfo = new Nan::Callback( callback );
                curl_easy_setopt( obj->curl, CURLOPT_XFERINFODATA, obj );
                optCallResult = Nan::New<v8::Integer>( curl_easy_setopt( obj->curl, CURLOPT_XFERINFOFUNCTION, Curl::CbXferinfo ) );

                break;
#endif

            case CURLOPT_PROGRESSFUNCTION:

                obj->cbProgress = new Nan::Callback( callback );
                curl_easy_setopt( obj->curl, CURLOPT_PROGRESSDATA, obj );
                optCallResult = Nan::New<v8::Integer>( curl_easy_setopt( obj->curl, CURLOPT_PROGRESSFUNCTION, Curl::CbProgress ) );

                break;

            case CURLOPT_DEBUGFUNCTION:

                obj->cbDebug = new Nan::Callback( callback );
                curl_easy_setopt( obj->curl, CURLOPT_DEBUGDATA, obj );
                optCallResult = Nan::New<v8::Integer>( curl_easy_setopt( obj->curl, CURLOPT_DEBUGFUNCTION, Curl::CbDebug ) );

                break;
        }

    }

    CURLcode code = (CURLcode) optCallResult->Int32Value();

    if ( code != CURLE_OK ) {

        Nan::ThrowError(
            code == CURLE_FAILED_INIT ? "Unknown option given. First argument must be the option internal id or the option name. You can use the Curl.option constants." : curl_easy_strerror( code )
        );
        return;
    }

    info.GetReturnValue().Set( optCallResult );
}

// traits class to determine whether to do the check
template <typename> struct ResultTypeIsChar : std::false_type {};
template <> struct ResultTypeIsChar<char*> : std::true_type {};

template<typename T>
static Nan::MaybeLocal<T> wrapHandle( v8::Local<T> h ) {
    return Nan::MaybeLocal<T>( h );
}

template<typename T>
static Nan::MaybeLocal<T> wrapHandle( Nan::MaybeLocal<T> h ) {
    return h;
}

template<typename TResultType, typename Tv8MappingType>
v8::Local<v8::Value> Curl::GetInfoTmpl( const Curl *obj, int infoId )
{
    Nan::EscapableHandleScope scope;

    TResultType result;

    CURLINFO info = (CURLINFO) infoId;
    CURLcode code = curl_easy_getinfo( obj->curl, info, &result );

    v8::Local<v8::Value> retVal = Nan::Undefined();

    if ( code != CURLE_OK ) {

        Curl::ThrowError( "curl_easy_getinfo failed!", curl_easy_strerror( code ) );

    } else {

        //is string
        if ( ResultTypeIsChar<TResultType>::value && !result ) {

            retVal = wrapHandle<v8::String>( Nan::EmptyString() ).ToLocalChecked();

        } else {

            retVal = wrapHandle<Tv8MappingType>( Nan::New<Tv8MappingType>( result ) ).ToLocalChecked();
        }

    }

    return scope.Escape( retVal );
}

NAN_METHOD( Curl::GetInfo )
{
    Nan::HandleScope scope;

    Curl *obj = Nan::ObjectWrap::Unwrap<Curl>( info.This() );

    if ( !obj->isOpen ) {

        Nan::ThrowError( "Curl handler is closed." );
        return;
    }

    v8::Local<v8::Value> infoVal = info[0];

    v8::Local<v8::Value> retVal = Nan::Undefined();

    int infoId;

    CURLINFO curlInfo;
    CURLcode code;

    //String
    if ( (infoId = isInsideOption( curlInfosString, infoVal ) ) ) {

        retVal = Curl::GetInfoTmpl<char*, v8::String>( obj, infoId );

    //Integer
    } else if ( (infoId = isInsideOption( curlInfosInteger, infoVal ) ) ) {

        retVal = Curl::GetInfoTmpl<long, v8::Number>( obj, infoId );

    //Double
    } else if ( (infoId = isInsideOption( curlInfosDouble, infoVal ) ) ) {

        retVal = Curl::GetInfoTmpl<double, v8::Number>( obj, infoId );

    //Linked list
    } else if ( (infoId = isInsideOption( curlInfosLinkedList, infoVal ) ) ) {

        curl_slist *linkedList;
        curl_slist *curr;

        curlInfo = (CURLINFO) infoId;
        code = curl_easy_getinfo( obj->curl, curlInfo, &linkedList );

        if ( code != CURLE_OK ) {

            Curl::ThrowError( "curl_easy_getinfo failed!", curl_easy_strerror( code ) );
            return;
        }

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

    info.GetReturnValue().Set( retVal );
}

//Add this handle for processing on the curl_multi handler.
NAN_METHOD( Curl::Perform )
{
    Nan::HandleScope scope;

    Curl *obj = Nan::ObjectWrap::Unwrap<Curl>( info.This() );

    if ( !obj->isOpen ) {

        Nan::ThrowError( "Curl handler is closed." );
        return;
    }

    //The client should not call this method more than one time by request
    if ( obj->isInsideMultiCurl ) {

        Nan::ThrowError( "Curl session is already running." );
        return;
    }

    CURLMcode code = curl_multi_add_handle( Curl::curlMulti, obj->curl );

    if ( code != CURLM_OK ) {

        Curl::ThrowError( "curl_multi_add_handle Failed", curl_multi_strerror( code ) );
        return;
    }

    obj->isInsideMultiCurl = true;

    info.GetReturnValue().Set( info.This() );
}

NAN_METHOD( Curl::Pause )
{
    Nan::HandleScope scope;

    Curl *obj = Nan::ObjectWrap::Unwrap<Curl>( info.This() );

    if ( !obj->isOpen ) {

        Nan::ThrowError( "Curl handler is closed." );
        return;
    }

    if ( !info[0]->IsUint32() ) {

        Nan::ThrowTypeError( "Bitmask value must be an integer." );
        return;
    }

    uint32_t bitmask = (int) info[0]->Uint32Value();

    CURLcode code = curl_easy_pause( obj->curl, (int) bitmask );

    if ( code != CURLE_OK ) {

        Nan::ThrowError( curl_easy_strerror( code ) );
        return;
    }

    info.GetReturnValue().Set( info.This() );
}

NAN_METHOD( Curl::Close )
{
    Nan::HandleScope scope;

    Curl *obj = Nan::ObjectWrap::Unwrap<Curl>( info.This() );

    if ( !obj->isOpen ) {

        Nan::ThrowError( "Curl handler already closed." );
        return;
    }

    obj->Dispose();

    return;
}

//Re-initializes all options previously set on a specified CURL handle to the default values.
NAN_METHOD( Curl::Reset )
{
    Nan::HandleScope scope;

    Curl *obj = Nan::ObjectWrap::Unwrap<Curl>( info.This() );

    if ( !obj->isOpen ) {

        Nan::ThrowError( "Curl handler already closed." );
        return;
    }

    curl_easy_reset( obj->curl );

    // reset the URL, https://github.com/bagder/curl/commit/ac6da721a3740500cc0764947385eb1c22116b83
    curl_easy_setopt( obj->curl, CURLOPT_URL, "" );

    obj->DisposeCallbacks();

    //Set the callbacks again.
    curl_easy_setopt( obj->curl, CURLOPT_WRITEFUNCTION, Curl::WriteFunction );
    curl_easy_setopt( obj->curl, CURLOPT_WRITEDATA, obj );
    curl_easy_setopt( obj->curl, CURLOPT_HEADERFUNCTION, Curl::HeaderFunction );
    curl_easy_setopt( obj->curl, CURLOPT_HEADERDATA, obj );

    info.GetReturnValue().Set( info.This() );
}

//returns the amount of curl instances
NAN_METHOD( Curl::GetCount )
{
    Nan::HandleScope scope;

    info.GetReturnValue().Set( Nan::New<v8::Integer>( Curl::count ) );
}

//Returns a human readable string with the version number of libcurl and some of its important components (like OpenSSL version).
NAN_METHOD( Curl::GetVersion )
{
    Nan::HandleScope scope;

    const char *version = curl_version();

    v8::Local<v8::Value> versionObj = Nan::New<v8::String>( version ).ToLocalChecked();

    info.GetReturnValue().Set( versionObj );
}
