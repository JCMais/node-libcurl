#include "Curl.h"

// Set curl constants
#include "generated-stubs/curlOptionsString.h"
#include "generated-stubs/curlOptionsInteger.h"
#include "generated-stubs/curlInfosString.h"
#include "generated-stubs/curlInfosInteger.h"
#include "generated-stubs/curlInfosDouble.h"

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

//Function that checks if given option is inside the given Curl::CurlOption struct, if it is, returns the optionId
#define isInsideOption( options, option ) isInsideCurlOption( options, sizeof( options ), option )
int isInsideCurlOption( const Curl::CurlOption *curlOptions, const int lenOfOption, const v8::Handle<v8::Value> &option ) {

    v8::HandleScope scope;

    bool isString = option->IsString();
    bool isInt    = option->IsInt32();

    std::string optionName = "";
    int32_t optionId = -1;

    if ( !isString && !isInt ) {
        v8::ThrowException(v8::Exception::TypeError(
            v8::String::New( "First argument must be the a integer with the option internal id, or the option name. You can use the constants for better handling." )
        ));

        return 0;
    }

    if ( isString ) {

        v8::String::Utf8Value optionNameV8( option );

        optionName = std::string( *optionNameV8 );

        //should delete optionNameV8 or v8 take care of that?

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

//Initialize maps
curlMapId optionsMapId;
curlMapName optionsMapName;

curlMapId infosMapId;
curlMapName infosMapName;

//Initialize static properties
v8::Persistent<v8::Function> Curl::constructor;
CURLM *Curl::curlMulti = NULL;
int    Curl::runningHandles = 0;
int    Curl::count = 0;
int32_t Curl::transfered = 0;
std::map< CURL*, Curl* > Curl::curls;
uv_timer_t Curl::curlTimeout;

int v8AllocatedMemoryAmount = 4*4096;

// Add Curl constructor to the module exports
void Curl::Initialize( v8::Handle<v8::Object> exports ) {

    v8::HandleScope scope;

    //*** Initialize cURL ***//
	CURLcode code = curl_global_init( CURL_GLOBAL_ALL );
    if ( code != CURLE_OK ) {
        Curl::Raise( "curl_global_init failed!" );
	}

	Curl::curlMulti = curl_multi_init();
    if ( Curl::curlMulti == NULL ) {
        Curl::Raise( "curl_multi_init failed!" );
	}

    //init uv timer to be used with HandleTimeout
    int timerStatus = uv_timer_init( uv_default_loop(), &Curl::curlTimeout );
    assert( timerStatus == 0 );

    //set curl_multi callbacks to use libuv
    curl_multi_setopt( Curl::curlMulti, CURLMOPT_SOCKETFUNCTION, Curl::HandleSocket );
    curl_multi_setopt( Curl::curlMulti, CURLMOPT_TIMERFUNCTION, Curl::HandleTimeout );
    //curl_multi_setopt( Curl::curlMulti, CURLMOPT_MAXCONNECTS, 20 );

    //** Construct Curl js "class"
    v8::Local<v8::FunctionTemplate> tpl = v8::FunctionTemplate::New( Curl::New );

    tpl->SetClassName( v8::String::NewSymbol( "Curl" ) );
    tpl->InstanceTemplate()->SetInternalFieldCount( 1 ); //to wrap this

    // Prototype Methods
    NODE_SET_PROTOTYPE_METHOD( tpl, "_setOpt", SetOpt );
    NODE_SET_PROTOTYPE_METHOD( tpl, "_getInfo", GetInfo );
    NODE_SET_PROTOTYPE_METHOD( tpl, "_perform", Perform );
	NODE_SET_PROTOTYPE_METHOD( tpl, "_close", Close );

    // Static Methods
	NODE_SET_METHOD( tpl , "getCount" , GetCount );

    // Export cURL Constants
    v8::Local<v8::Function> tplFunction = tpl->GetFunction();

    v8::Local<v8::Object> optionsObj = v8::Object::New();
    v8::Local<v8::Object> infosObj   = v8::Object::New();

    Curl::ExportConstants( &optionsObj, curlOptionsString, sizeof( curlOptionsString ), &optionsMapId, &optionsMapName );
	Curl::ExportConstants( &optionsObj, curlOptionsInteger, sizeof( curlOptionsInteger ), &optionsMapId, &optionsMapName );
    Curl::ExportConstants( &optionsObj, curlOptionsLinkedList, sizeof( curlOptionsLinkedList ), &optionsMapId, &optionsMapName );

	Curl::ExportConstants( &infosObj, curlInfosString, sizeof( curlInfosString ), &infosMapId, &infosMapName );
	Curl::ExportConstants( &infosObj, curlInfosInteger, sizeof( curlInfosInteger ), &infosMapId, &infosMapName );
	Curl::ExportConstants( &infosObj, curlInfosDouble, sizeof( curlInfosDouble ), &infosMapId, &infosMapName );
    Curl::ExportConstants( &infosObj, curlInfosLinkedList, sizeof( curlInfosLinkedList ), &infosMapId, &infosMapName );

    //Add them to option and info objects, respectively (marking them as readonly
    tplFunction->Set( v8::String::NewSymbol( "option" ), optionsObj, static_cast<v8::PropertyAttribute>( v8::ReadOnly|v8::DontDelete ) );
    tplFunction->Set( v8::String::NewSymbol( "info" ),     infosObj, static_cast<v8::PropertyAttribute>( v8::ReadOnly|v8::DontDelete ) );

    //Static members
    tplFunction->Set( v8::String::NewSymbol( "_v8m" ), v8::Integer::New( v8AllocatedMemoryAmount ), static_cast<v8::PropertyAttribute>( v8::ReadOnly|v8::DontDelete ) );

    //Creates the Constructor from the template and assign it to the static constructor property for future use.
    Curl::constructor = v8::Persistent<v8::Function>::New( tplFunction );

    exports->Set( v8::String::NewSymbol( "Curl" ), Curl::constructor );
}

Curl::Curl( v8::Handle<v8::Object> obj ) : isInsideMultiCurl( false )
{
    v8::HandleScope scope;

    ++Curl::count;

    //Make the garbage collector think this object is really big (and it can be, depending on the request anyway.)
    //v8::V8::AdjustAmountOfExternalAllocatedMemory( v8AllocatedMemoryAmount );

    obj->SetPointerInInternalField( 0, this );

    this->handle = v8::Persistent<v8::Object>::New( obj );
    handle.MakeWeak( this, Curl::Destructor );

    this->curl = curl_easy_init();

    if ( !this->curl ) {

        Curl::Raise( "curl_easy_init Failed!" );

    }

    //set callbacks
    curl_easy_setopt( this->curl, CURLOPT_WRITEFUNCTION, Curl::WriteFunction );
    curl_easy_setopt( this->curl, CURLOPT_WRITEDATA, this );
    curl_easy_setopt( this->curl, CURLOPT_HEADERFUNCTION, Curl::HeaderFunction );
    curl_easy_setopt( this->curl, CURLOPT_HEADERDATA, this );
    //curl_easy_setopt(curl, CURLOPT_DEBUGFUNCTION, my_trace);

    Curl::curls[curl] = this;
}


Curl::~Curl(void)
{
    --Curl::count;

    //"return" the memory allocated by the object
    //v8::V8::AdjustAmountOfExternalAllocatedMemory( -v8AllocatedMemoryAmount );

    //cleanup curl related stuff
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
}

//Dispose persistent handler, and delete itself
void Curl::Dispose()
{
	this->handle->SetPointerInInternalField( 0, NULL );

	this->handle.Dispose();
    this->handle.Clear();

	delete this;
}

//The curl_multi_socket_action(3) function informs the application about updates
//  in the socket (file descriptor) status by doing none, one, or multiple calls to this function
int Curl::HandleSocket( CURL *easy, curl_socket_t s, int action, void *userp, void *socketp )
{
    CurlSocketContext *ctx;
    uv_err_s error;

    std::cerr << "Action: " << action << std::endl;
    std::cerr << "Socket: " << socketp << std::endl;

    if ( action == CURL_POLL_IN || action == CURL_POLL_OUT || action == CURL_POLL_INOUT || action == CURL_POLL_NONE ) {

        //create ctx if it doesn't exists and assign it to the current socket,
        ctx = ( socketp ) ? static_cast<Curl::CurlSocketContext*>(socketp) : Curl::CreateCurlSocketContext( s );
        curl_multi_assign( Curl::curlMulti, s, static_cast<void*>( ctx ) );

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
        curl_multi_assign( Curl::curlMulti, s, NULL );

        Curl::DestroyCurlSocketContext( ctx );

        return 0;
    }

    //this should NEVER happen, I don't even know why this is here.
    error = uv_last_error( uv_default_loop() );
    std::cerr << uv_err_name( error ) << " " << uv_strerror( error );
    abort();
}

//Creates a Context to be used to store data between events
Curl::CurlSocketContext* Curl::CreateCurlSocketContext( curl_socket_t sockfd )
{
    int r;
    uv_err_s error;
    Curl::CurlSocketContext *ctx;

    ctx = static_cast<Curl::CurlSocketContext*>( malloc( sizeof( *ctx ) ) );

    ctx->sockfd = sockfd;

    //uv_poll simply watches file descriptors using the operating system notification mechanism
    //Whenever the OS notices a change of state in file descriptors being polled, libuv will invoke the associated callback.
    r = uv_poll_init_socket( uv_default_loop(), &ctx->pollHandle, sockfd );

    if ( r == -1 ) {

        error = uv_last_error( uv_default_loop() );
        std::cerr << uv_err_name( error ) << uv_strerror( error );
        abort();

    } else {

        ctx->pollHandle.data = ctx;

    }

    return ctx;
}

//This function will be called when the timeout value changes from LibCurl.
//The timeout value is at what latest time the application should call one of
//the "performing" functions of the multi interface (curl_multi_socket_action(3) and curl_multi_perform(3)) - to allow libcurl to keep timeouts and retries etc to work.
int Curl::HandleTimeout( CURLM *multi /* multi handle */ , long timeoutMs /* timeout in milliseconds */ , void *userp /* TIMERDATA */ )
{
    //A timeout value of -1 means that there is no timeout at all, and 0 means that the timeout is already reached.
    if ( timeoutMs <= 0 )
        timeoutMs = 1; //but we are going to wait a little

    return uv_timer_start( &Curl::curlTimeout, Curl::OnTimeout, timeoutMs, 0 );
}

//Function called when the previous timeout set reaches 0
void Curl::OnTimeout( uv_timer_t *req, int status ) {

    //timeout expired, let libcurl update handlers and timeouts
    curl_multi_socket_action( Curl::curlMulti, CURL_SOCKET_TIMEOUT, 0, &Curl::runningHandles );

    Curl::ProcessMessages();
}

//Called when libcurl thinks there is something to process
void Curl::Process( uv_poll_t* handle, int status, int events )
{
    //stop the timer, so curl_multi_socket_action is fired without a socket by the timeout cb
    uv_timer_stop( &Curl::curlTimeout );

    int flags = 0;

    CURLMcode code;

    if ( events & UV_READABLE ) flags |= CURL_CSELECT_IN;
    if ( events & UV_WRITABLE ) flags |= CURL_CSELECT_OUT;

    CurlSocketContext *ctx;

    //reinterpret?
    ctx = (CurlSocketContext*) handle->data;

    do {

        code = curl_multi_socket_action( Curl::curlMulti, ctx->sockfd, flags, &Curl::runningHandles );

    } while ( code == CURLM_CALL_MULTI_PERFORM ); //@todo is that loop really needed?

	if ( code != CURLM_OK ) {

		Curl::Raise( "curl_multi_remove_handle Failed", curl_multi_strerror( code ) );
        return;
	}

    
    Curl::ProcessMessages();
}

void Curl::ProcessMessages()
{
    CURLMcode code;
    CURLMsg *msg;
    int pending = 0;

    while( ( msg = curl_multi_info_read( Curl::curlMulti, &pending ) ) ) {

        if ( msg->msg == CURLMSG_DONE ) {

			Curl *curl = Curl::curls[msg->easy_handle];
			CURLMsg msgCopy = *msg;

			code = curl_multi_remove_handle( Curl::curlMulti, msg->easy_handle );

            curl->isInsideMultiCurl = false;

			if ( code != CURLM_OK ) {

				Curl::Raise( "curl_multi_remove_handle Failed", curl_multi_strerror( code ) );
                return;
			}

			if ( msgCopy.data.result == CURLE_OK ) {

				curl->OnEnd( &msgCopy );

            } else {

				curl->OnError( &msgCopy );
            }
		}
    }
}

//Callend when libcurl thinks the socket can be destroyed
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
	Curl::transfered += size * nmemb;

	Curl *obj = (Curl*) userdata;
	return obj->OnData( ptr, size * nmemb );
}

//Called by libcurl when some chunk of data (from headers) is available
size_t Curl::HeaderFunction( char *ptr, size_t size, size_t nmemb, void *userdata )
{
    Curl::transfered += size * nmemb;

	Curl *obj = (Curl*) userdata;
	return obj->OnHeader( ptr, size * nmemb );
}

size_t Curl::OnData( char *data, size_t n )
{
    //@TODO If the callback close the connection, an error will be throw!
    //@TODO Implement: From 7.18.0, the function can return CURL_WRITEFUNC_PAUSE which then will cause writing to this connection to become paused. See curl_easy_pause(3) for further details.
    v8::HandleScope scope;

	static v8::Persistent<v8::String> SYM_ON_WRITE = v8::Persistent<v8::String>::New(v8::String::NewSymbol( "_onData" ) );
	v8::Handle<v8::Value> cb = this->handle->Get( SYM_ON_WRITE );

    size_t ret = n;

	if ( cb->IsFunction() ) {

		node::Buffer *buffer = node::Buffer::New( data, n );
		v8::Handle<v8::Value> argv[] = { buffer->handle_ };
		v8::Handle<v8::Value> retVal = cb->ToObject()->CallAsFunction( handle, 1, argv );

		if ( retVal.IsEmpty() )
			ret = 0;
		else
			ret = retVal->Int32Value();
	}

	return ret;
}


size_t Curl::OnHeader( char *data, size_t n )
{
    v8::HandleScope scope;

	static v8::Persistent<v8::String> SYM_ON_HEADER = v8::Persistent<v8::String>::New( v8::String::NewSymbol( "_onHeader" ) );
	v8::Handle<v8::Value> cb = this->handle->Get( SYM_ON_HEADER );

    size_t ret = n;

	if ( cb->IsFunction() ) {

		node::Buffer * buffer = node::Buffer::New( data, n );
		v8::Handle<v8::Value> argv[] = { buffer->handle_ };
		v8::Handle<v8::Value> retVal = cb->ToObject()->CallAsFunction( handle, 1, argv );

		if ( retVal.IsEmpty() )
			ret = 0;
		else
			ret = retVal->Int32Value();
	}

	return ret;
}

void Curl::OnEnd( CURLMsg *msg )
{
    v8::HandleScope scope;

	static v8::Persistent<v8::String> SYM_ON_END = v8::Persistent<v8::String>::New( v8::String::NewSymbol( "_onEnd" ) );

	v8::Handle<v8::Value> cb = this->handle->Get( SYM_ON_END );

	if ( cb->IsFunction() ) {

		cb->ToObject()->CallAsFunction( this->handle, 0, NULL );
	}
}

void Curl::OnError( CURLMsg *msg )
{
    v8::HandleScope scope;

	static v8::Persistent<v8::String> SYM_ON_ERROR = v8::Persistent<v8::String>::New( v8::String::NewSymbol( "_onError" ) );
	v8::Handle<v8::Value> cb = this->handle->Get( SYM_ON_ERROR );

	if ( cb->IsFunction() ) {

		v8::Handle<v8::Value> argv[] = { v8::Exception::Error( v8::String::New( curl_easy_strerror( msg->data.result ) ) ), v8::Integer::New( msg->data.result )  };
		cb->ToObject()->CallAsFunction( this->handle, 2, argv );
	}
}

//Export Options/Infos to constants in the given Object, and add their mapping to the respective maps.
template<typename T>
void Curl::ExportConstants( T *obj, Curl::CurlOption *optionGroup, uint32_t len, curlMapId *mapId, curlMapName *mapName )
{

    len = len / sizeof( Curl::CurlOption );

    if ( !obj ) { //Null pointer, just stop
        return; //
    }

	for ( uint32_t i = 0; i < len; ++i ) {

		const Curl::CurlOption &option = optionGroup[i];

        const int *optionId = &option.value;

        //I dont like to mess with memory
        std::string sOptionName( option.name );

		(*obj)->Set(
			v8::String::New( ( sOptionName ).c_str() ),
			v8::Integer::New( option.value ),
            static_cast<v8::PropertyAttribute>( v8::ReadOnly | v8::DontDelete )
		);

        //add to vector, and add pointer to respective map
        //using insert because of http://stackoverflow.com/a/16436560/710693
        mapName->insert( std::make_pair( sOptionName, optionId ) );
        mapId->insert( std::make_pair( optionId, sOptionName ) );
	}
}

template<typename ResultType, typename v8MappingType>
v8::Handle<v8::Value> Curl::GetInfoTmpl( const Curl &obj, int infoId )
{
    v8::HandleScope scope;

    ResultType result;

    CURLINFO info = (CURLINFO) infoId;
    CURLcode code = curl_easy_getinfo( obj.curl, info, &result );

    if ( code != CURLE_OK )
        return Curl::Raise( "curl_easy_getinfo failed!", curl_easy_strerror( code ) );

    return scope.Close( v8MappingType::New( result ) );
}

template<> //workaround for null pointer, aka, hack
v8::Handle<v8::Value> Curl::GetInfoTmpl<char*,v8::String>( const Curl &obj, int infoId )
{
    v8::HandleScope scope;

    char *result;

    CURLINFO info = (CURLINFO) infoId;
    CURLcode code = curl_easy_getinfo( obj.curl, info, &result );

    if ( !result ) { //null pointer
        return v8::String::New( "" );
    }

    if ( code != CURLE_OK )
        return Curl::Raise( "curl_easy_getinfo failed!", curl_easy_strerror( code ) );

    return scope.Close( v8::String::New( result ) );
}

Curl* Curl::Unwrap( v8::Handle<v8::Object> value )
{
	return (Curl*) value->GetPointerFromInternalField( 0 );
}

//Create a Exception with the given message and reason
v8::Handle<v8::Value> Curl::Raise( const char *message, const char *reason )
{
    v8::HandleScope scope;

	const char *what = message;
    std::string msg;

	if ( reason ) {

        msg = string_format( "%s: %s", message, reason );
        what = msg.c_str();

	}

    return scope.Close( v8::ThrowException( v8::Exception::Error( v8::String::New( what ) ) ) );
}

//Javascript Constructor
v8::Handle<v8::Value> Curl::New( const v8::Arguments &args ) {

    v8::HandleScope scope;

    if ( args.IsConstructCall() ) {
        // Invoked as constructor: `new Curl(...)`

        Curl *obj = new Curl( args.This() );

        static v8::Persistent<v8::String> SYM_ON_HEADER = v8::Persistent<v8::String>::New( v8::String::NewSymbol( "_onCreated" ) );
        v8::Handle<v8::Value> cb = obj->handle->Get( SYM_ON_HEADER );

        if ( cb->IsFunction() ) {
	        cb->ToObject()->CallAsFunction( obj->handle, 0, NULL );
        }

        return args.This();

    } else {
        // Invoked as plain function `Curl(...)`, turn into construct call.

        const int argc = 1;
        v8::Local<v8::Value> argv[argc] = { args[0] };

        return scope.Close( constructor->NewInstance( argc, argv ) );
  }
}

//Javascript Constructor
//This is called by v8 when there are no more references to the Curl instance on js.
void Curl::Destructor( v8::Persistent<v8::Value> value, void *data )
{
	v8::Handle<v8::Object> object = value->ToObject();
	Curl * curl = (Curl*) object->GetPointerFromInternalField( 0 );
	curl->Dispose();
}

v8::Handle<v8::Value> Curl::SetOpt( const v8::Arguments &args ) {

    v8::HandleScope scope;

    Curl *obj = Curl::Unwrap( args.This() );

    v8::Handle<v8::Value> opt   = args[0];
    v8::Handle<v8::Value> value = args[1];

    v8::Handle<v8::Integer> optCallResult = v8::Integer::New( -1 );

    int optionId;

    //check if option is linked list, and the value is correct
    if ( ( optionId = isInsideOption( curlOptionsLinkedList, opt ) ) ) {

        //special case, array of objects
        if ( optionId == CURLOPT_HTTPPOST ) {

            CurlHttpPost &httpPost = obj->httpPost;

            v8::Handle<v8::Array> rows = v8::Handle<v8::Array>::Cast( value );

            //we could append, but lets reset, that is the desired behavior
		    httpPost.reset();

            // [{ key : val }]
		    for ( uint32_t i = 0, len = rows->Length(); i < len; ++i ) {

                // single object { }
			    v8::Handle<v8::Object> postData = v8::Handle<v8::Object>::Cast( rows->Get( i ) );

			    httpPost.append();

                const v8::Local<v8::Array> props = postData->GetPropertyNames();
                const uint32_t postDataLength = props->Length();

                for ( uint32_t j = 0 ; j < postDataLength ; ++j ) {

                    int httpPostId = -1;

                    const v8::Local<v8::Value> postDataKey = props->Get( j );
                    const v8::Local<v8::Value> postDataValue = postData->Get( postDataKey );

                    //convert postDataKey to field id
                    v8::String::Utf8Value fieldName( postDataKey );
                    std::string optionName = std::string( *fieldName );
                    stringToUpper( optionName );

                    for ( uint32_t k = 0, kLen = sizeof( curlHttpPostOptions ) / sizeof( Curl::CurlOption ); k < kLen; ++k ) {

                        if ( curlHttpPostOptions[k].name == optionName )
                            httpPostId = curlHttpPostOptions[k].value;

                    }

                    if ( httpPostId == -1 ) {
                        //not found
                    }

                    //check if value is array and option is not content, nor

                    v8::String::Utf8Value string( postDataValue );
                    char *str = (char *) malloc( string.length() + 1 );
                    strcpy( str, *string );

                    httpPost.set( httpPostId, str, string.length() );

                    //should we?
                    delete str;
                }
		    }

	        optCallResult = v8::Integer::New( curl_easy_setopt( obj->curl, CURLOPT_HTTPPOST, obj->httpPost.first ) );


        } else {

            if ( value->IsNull() ) {
		        optCallResult = v8::Integer::New(
                    curl_easy_setopt(
                        obj->curl, (CURLoption) optionId, NULL
                    )
                );

            } else {

                if ( !value->IsArray() ) {
                    return scope.Close( v8::ThrowException(v8::Exception::TypeError(
                        v8::String::New( "Option value should be an array." )
                    )));
                }

                //convert value to curl linked list (curl_slist)
		        curl_slist *slist = NULL;
		        v8::Handle<v8::Array> array = v8::Handle<v8::Array>::Cast( value );

		        for ( uint32_t i = 0, len = array->Length(); i < len; ++i )
		        {
			        slist = curl_slist_append( slist, *v8::String::Utf8Value( array->Get( i ) ) );
		        }

                obj->curlLinkedLists.push_back( slist );

		        optCallResult = v8::Integer::New(
                    curl_easy_setopt(
                        obj->curl, (CURLoption) optionId, slist
                    )
                );
            }
        }

        //check if option is string, and the value is correct
    } else if ( ( optionId = isInsideOption( curlOptionsString, opt ) ) ) {

        if ( !value->IsString() ) {
            return scope.Close( v8::ThrowException(v8::Exception::TypeError(
                v8::String::New( "Option value should be a string." )
            )));
        }

        // Create a string copy
        bool isNull = value->IsNull();
        std::string valueAsString;

        if ( !isNull ) {

            //Curl don't copies the string before version 7.17
		    v8::String::Utf8Value value( args[1] );
		    int length = value.length();
		    obj->curlStrings[optionId] = std::string( *value, length );
        }

        optCallResult = v8::Integer::New(
            curl_easy_setopt(
                obj->curl, (CURLoption) optionId, ( !isNull ) ? obj->curlStrings[optionId].c_str() : NULL
            )
        );


    //check if option is a integer, and the value is correct
    } else if ( ( optionId = isInsideOption( curlOptionsInteger, opt ) )  ) {

        int32_t val = value->Int32Value();

        //If not integer, but a not falsy value, val = 1
        if ( !value->IsInt32() ) {
            val = value->BooleanValue();
        }

        optCallResult = v8::Integer::New(
            curl_easy_setopt(
                obj->curl, (CURLoption) optionId, val
            )
        );

    }

    return scope.Close( optCallResult );
}


v8::Handle<v8::Value> Curl::GetInfo( const v8::Arguments &args )
{
    v8::HandleScope scope;

    Curl *obj = Curl::Unwrap( args.This() );

    v8::Handle<v8::Value> infoVal = args[0];

    v8::Handle<v8::Value> retVal = v8::Undefined();

    int infoId;

    CURLINFO info;
    CURLcode code;

    v8::String::Utf8Value val( infoVal );
    std::string valStr = std::string( *val );

    //String Info
    if ( (infoId = isInsideOption( curlInfosString, infoVal ) ) ) {

        retVal = Curl::GetInfoTmpl<char*, v8::String>( *(obj), infoId );

    } else if ( (infoId = isInsideOption( curlInfosInteger, infoVal ) ) ) {

        retVal = Curl::GetInfoTmpl<int, v8::Integer>(  *(obj), infoId );

    } else if ( (infoId = isInsideOption( curlInfosDouble, infoVal ) ) ) {

        retVal = Curl::GetInfoTmpl<double, v8::Number>( *(obj), infoId );

    } else if ( (infoId = isInsideOption( curlInfosLinkedList, infoVal ) ) ) {

        curl_slist *linkedList;
        curl_slist *curr;

        info = (CURLINFO) infoId;
        code = curl_easy_getinfo( obj->curl, info, &linkedList );

        if ( code != CURLE_OK )
            return scope.Close( Curl::Raise( "curl_easy_getinfo failed!", curl_easy_strerror( code ) ) );

        v8::Handle<v8::Array> arr = v8::Array::New();

        if ( linkedList ) {

            curr = linkedList;

            while ( curr ) {

                arr->Set( arr->Length(), v8::String::New( curr->data ) );
                curr = curr->next;
            }

            curl_slist_free_all( linkedList );
        }

        retVal = arr;
    }

    return scope.Close( retVal );

}

//Add this handle for processing on the curl_multi handler.
v8::Handle<v8::Value> Curl::Perform( const v8::Arguments &args ) {

    v8::HandleScope scope;

    Curl *obj = Curl::Unwrap( args.This() );

    if ( !obj )
		return scope.Close( Curl::Raise( "Curl is closed." ) );

	if ( obj->isInsideMultiCurl ) //client should not call this method more than one time by request
		return scope.Close( Curl::Raise( "Curl session is already running." ) );

    CURLMcode code = curl_multi_add_handle( Curl::curlMulti, obj->curl );

	if ( code != CURLM_OK ) {

		return scope.Close( Curl::Raise( "curl_multi_add_handle Failed", curl_multi_strerror( code ) ) );
	}

	obj->isInsideMultiCurl = true;

	return scope.Close( args.This() );

}

//returns the amount of curl instances
v8::Handle<v8::Value> Curl::GetCount( const v8::Arguments &args )
{
    v8::HandleScope scope;
    return scope.Close( v8::Integer::New( Curl::count ) );
}

v8::Handle<v8::Value> Curl::Close( const v8::Arguments &args )
{
    Curl *obj = Curl::Unwrap( args.This() );

	if ( obj )
		obj->Dispose();

	return args.This();
}
