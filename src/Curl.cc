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

//Maps for all options, probably should be better to use a unordered_map
typedef std::map<const int*, std::string> mapId;
typedef std::map<std::string, const int*> mapName;

//Export Options/Infos to constants in the given Object, and add their mapping to the respective maps.
template<typename T>
void export_curl_options( T *obj, Curl::CurlOption *optionGroup, uint32_t len, mapId *mapId, mapName *mapName )
{

    len = len / sizeof( Curl::CurlOption );

    if ( NULL == obj ) { //Null pointer
        return; //just stop
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
        //http://stackoverflow.com/a/16436560/710693
        mapName->insert( std::make_pair( sOptionName, optionId ) );
        mapId->insert( std::make_pair( optionId, sOptionName ) );
	}
}

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
mapId optionsMapId;
mapName optionsMapName;

mapId infosMapId;
mapName infosMapName;

//Initialize static properties
v8::Persistent<v8::Function> Curl::constructor;
CURLM *Curl::curlMulti = NULL;
int    Curl::runningHandles = 0;
int    Curl::count = 0;
int    Curl::transfered = 0;
std::map< CURL*, Curl* > Curl::curls;

int v8AllocatedMemoryAmount = 2*4096;

// Add Curl constructor to the exports
void Curl::Initialize( v8::Handle<v8::Object> exports ) {

    //Initialize cURL
	CURLcode code = curl_global_init( CURL_GLOBAL_ALL );

	if ( code != CURLE_OK ) {
		Curl::Raise( "curl_global_init failed!" );
	}

	Curl::curlMulti = curl_multi_init();

	if ( Curl::curlMulti == NULL ) {

		Curl::Raise( "curl_multi_init failed!" );
	}

    // Prepare constructor template
    v8::Local<v8::FunctionTemplate> tpl = v8::FunctionTemplate::New( New );

    tpl->SetClassName( v8::String::NewSymbol( "Curl" ) );
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    // Prototype Methods
    NODE_SET_PROTOTYPE_METHOD( tpl, "_setOpt", SetOpt );
    NODE_SET_PROTOTYPE_METHOD( tpl, "_getInfo", GetInfo );
    NODE_SET_PROTOTYPE_METHOD( tpl, "_perform", Perform );
	NODE_SET_PROTOTYPE_METHOD( tpl, "_close", Close );

    // Static Methods
	NODE_SET_METHOD( tpl , "_process"  , Process );
	NODE_SET_METHOD( tpl , "getCount" , GetCount );

    // Export Options and Infos cURL Constants
    v8::Local<v8::Function> tplFunction = tpl->GetFunction();

    v8::Local<v8::Object> optionsObj = v8::Object::New();
    v8::Local<v8::Object> infosObj   = v8::Object::New();

    export_curl_options( &optionsObj, curlOptionsString, sizeof( curlOptionsString ), &optionsMapId, &optionsMapName );
	export_curl_options( &optionsObj, curlOptionsInteger, sizeof( curlOptionsInteger ), &optionsMapId, &optionsMapName );
    export_curl_options( &optionsObj, curlOptionsLinkedList, sizeof( curlOptionsLinkedList ), &optionsMapId, &optionsMapName );

	export_curl_options( &infosObj, curlInfosString, sizeof( curlInfosString ), &infosMapId, &infosMapName );
	export_curl_options( &infosObj, curlInfosInteger, sizeof( curlInfosInteger ), &infosMapId, &infosMapName );
	export_curl_options( &infosObj, curlInfosDouble, sizeof( curlInfosDouble ), &infosMapId, &infosMapName );
    export_curl_options( &infosObj, curlInfosLinkedList, sizeof( curlInfosLinkedList ), &infosMapId, &infosMapName );

    //Add them to option and info objects, respectively
    tplFunction->Set( v8::String::NewSymbol( "option" ), optionsObj, static_cast<v8::PropertyAttribute>( v8::ReadOnly|v8::DontDelete ) );
    tplFunction->Set( v8::String::NewSymbol( "info" ), infosObj, static_cast<v8::PropertyAttribute>( v8::ReadOnly|v8::DontDelete ) );

    tplFunction->Set( v8::String::NewSymbol( "_v8m" ), v8::Integer::New( v8AllocatedMemoryAmount ), static_cast<v8::PropertyAttribute>( v8::ReadOnly|v8::DontDelete ) );

    //Creates the Constructor from the template and assign it to the static constructor property for future use, if necessary.
    Curl::constructor = v8::Persistent<v8::Function>::New( tplFunction );

    exports->Set( v8::String::NewSymbol( "Curl" ), Curl::constructor );
}


Curl::Curl( v8::Handle<v8::Object> obj ) : isInsideMultiCurl( false )
{
    ++Curl::count;

    //Make the garbage collector think this object is really big (and it can be, depending on the request anyway.)
    v8::V8::AdjustAmountOfExternalAllocatedMemory( v8AllocatedMemoryAmount );

    obj->SetPointerInInternalField( 0, this );

    this->handle = v8::Persistent<v8::Object>::New( obj );
    handle.MakeWeak( this, Curl::Destructor );

    this->curl = curl_easy_init();

    if ( !curl ) {

        Curl::Raise( "curl_easy_init Failed!" );

    }

    //set callbacks
    curl_easy_setopt( curl, CURLOPT_WRITEFUNCTION, Curl::WriteFunction );
    curl_easy_setopt( curl, CURLOPT_WRITEDATA, this );
    curl_easy_setopt( curl, CURLOPT_HEADERFUNCTION, Curl::HeaderFunction );
    curl_easy_setopt( curl, CURLOPT_HEADERDATA, this );

    Curl::curls[curl] = this;
}


Curl::~Curl(void)
{
    --Curl::count;

    //"return" the memory allocated by the object
    v8::V8::AdjustAmountOfExternalAllocatedMemory( -v8AllocatedMemoryAmount );

    //cleanup curl related stuff

    if ( this->curl ) {

        if ( this->isInsideMultiCurl ) {

            curl_multi_remove_handle( this->curlMulti, this->curl );

        }

        curl_easy_cleanup( this->curl );
        Curl::curls.erase( this->curl );

    }

    for ( std::vector<curl_slist*>::iterator it = this->curlLinkedLists.begin(), end = this->curlLinkedLists.end(); it != end; ++it ) {

			curl_slist *linkedList = *it;

			if ( linkedList ) {

				curl_slist_free_all( linkedList );
			}

    }
}

void Curl::Dispose()
{
	this->handle->SetPointerInInternalField( 0, NULL );
	this->handle.Dispose();

	delete this;
}

Curl* Curl::Unwrap( v8::Handle<v8::Object> value )
{
	return (Curl*) value->GetPointerFromInternalField( 0 );
}

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

//this function is called when the whatever the object is deleted
void Curl::Destructor( v8::Persistent<v8::Value> value, void *data )
{
	v8::Handle<v8::Object> object = value->ToObject();
	Curl * curl = (Curl*) object->GetPointerFromInternalField( 0 );
	curl->Dispose();
}

v8::Handle<v8::Value> Curl::Close( const v8::Arguments &args )
{
    v8::HandleScope scope;

    Curl *obj = Curl::Unwrap( args.This() );

    //std::cout << "[cURL] " << "Hi! My size is -> " << sizeof( *obj ) << std::endl;

	if ( obj )
		obj->Dispose();

	return args.This();
}


size_t Curl::WriteFunction( char *ptr, size_t size, size_t nmemb, void *userdata )
{
	Curl::transfered += size * nmemb;
	Curl *obj = (Curl*) userdata;
	return obj->OnData( ptr, size * nmemb );
}

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

    //std::cout << "[cURL] " << data << std::endl;

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

    //Curl *crl = Curl::Unwrap( this->handle );
    //char *result;
    //curl_easy_getinfo( crl->curl, (CURLINFO) CURLINFO_CONNECT_TIME, &result );

    //std::cout << "[cURL] " << result << std::endl;

	if ( cb->IsFunction() ) {

		cb->ToObject()->CallAsFunction( this->handle, 0, NULL );
	}
}

void Curl::OnError( CURLMsg *msg )
{
	static v8::Persistent<v8::String> SYM_ON_ERROR = v8::Persistent<v8::String>::New( v8::String::NewSymbol( "_onError" ) );
	v8::Handle<v8::Value> cb = this->handle->Get( SYM_ON_ERROR );

	if ( cb->IsFunction() ) {

		v8::Handle<v8::Value> argv[] = { v8::Exception::Error( v8::String::New( curl_easy_strerror( msg->data.result ) ) ), v8::Integer::New( msg->data.result )  };
		cb->ToObject()->CallAsFunction( this->handle, 2, argv );
	}
}

v8::Handle<v8::Value> Curl::SetOpt( const v8::Arguments &args ) {

    v8::HandleScope scope;

    Curl *obj = Curl::Unwrap( args.This() );

    v8::Handle<v8::Value> opt   = args[0];
    v8::Handle<v8::Value> value = args[1];

    v8::Handle<v8::Integer> optCallResult = v8::Integer::New( -1 );

    int optionId;

    //check if option is string, and the value is correct
    if ( ( optionId = isInsideOption( curlOptionsString, opt ) ) ) {

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

    //check if option is linked list, and the value is correct
    } else if ( ( optionId = isInsideOption( curlOptionsLinkedList, opt ) ) && value->IsArray() ) {

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

    return optCallResult;
}

template<typename ResultType, typename v8MappingType>
v8::Handle<v8::Value> Curl::GetInfoTmpl( const Curl &obj, int infoId )
{
    ResultType result;

    CURLINFO info = (CURLINFO) infoId;
    CURLcode code = curl_easy_getinfo( obj.curl, info, &result );

    if ( code != CURLE_OK )
        return Curl::Raise( "curl_easy_getinfo failed!", curl_easy_strerror( code ) );

    return v8MappingType::New( result );
}

template<> //workaround for null pointer, aka, hack
v8::Handle<v8::Value> Curl::GetInfoTmpl<char*,v8::String>( const Curl &obj, int infoId )
{
    char *result;

    CURLINFO info = (CURLINFO) infoId;
    CURLcode code = curl_easy_getinfo( obj.curl, info, &result );

    if ( !result ) { //null pointer
        return v8::String::New( "" );
    }

    if ( code != CURLE_OK )
        return Curl::Raise( "curl_easy_getinfo failed!", curl_easy_strerror( code ) );

    return v8::String::New( result );
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
            return Curl::Raise( "curl_easy_getinfo failed!", curl_easy_strerror( code ) );

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

static bool isRunning = 0;

//Keep in mind that this is a static method on javascript side.
//process current pending handles, returns the amount of transfered data, plus 1 if there are running handles.
v8::Handle<v8::Value> Curl::Process( const v8::Arguments &args )
{
    v8::HandleScope scope;

	Curl::transfered = 0;

    if ( Curl::runningHandles > 0 ) {

		CURLMcode code;
	    
        // remove select totally for timeout doesn't work properly
		do {
            code = curl_multi_perform( Curl::curlMulti, &Curl::runningHandles );
        } while ( code == CURLM_CALL_MULTI_PERFORM );

        if ( code != CURLM_OK ) {
            return Curl::Raise( "curl_multi_perform failed", curl_multi_strerror( code ) );
		}

		int msgs = 0;
		CURLMsg *msg = NULL;

        //check status of each handler
		while ( ( msg = curl_multi_info_read( Curl::curlMulti, &msgs ) ) ) {
            

            if ( msg->msg == CURLMSG_DONE ) {

				Curl *curl = Curl::curls[msg->easy_handle];
				CURLMsg msgCopy = *msg;

				code = curl_multi_remove_handle( Curl::curlMulti, msg->easy_handle );

                curl->isInsideMultiCurl = false;

				if ( code != CURLM_OK ) {

					return Curl::Raise( "curl_multi_remove_handle Failed", curl_multi_strerror( code ) );
				}

				if ( msgCopy.data.result == CURLE_OK ) {

					curl->OnEnd( &msgCopy );

                } else {

					curl->OnError( &msgCopy );
                }
			}
		}
	}

	return scope.Close( v8::Integer::New( Curl::transfered + (int)( Curl::runningHandles > 0 ) ) );
}

//Add this handle for processing on the curl_multi handler.
v8::Handle<v8::Value> Curl::Perform( const v8::Arguments &args ) {

    v8::HandleScope scope;

    Curl *obj = Curl::Unwrap( args.This() );

    if ( !obj )
		return Curl::Raise( "Curl is closed." );

	if ( obj->isInsideMultiCurl ) //client should not call this method more than one time by request
		return Curl::Raise( "Curl session is already running." );

    CURLMcode code = curl_multi_add_handle( Curl::curlMulti, obj->curl );

	if ( code != CURLM_OK ) {

		return Curl::Raise( "curl_multi_add_handle Failed", curl_multi_strerror( code ) );
	}

	obj->isInsideMultiCurl = true;

	++Curl::runningHandles;

	return scope.Close( args.This() );

}

//returns the amount of curl instances
v8::Handle<v8::Value> Curl::GetCount( const v8::Arguments &args )
{
    v8::HandleScope scope;
    return scope.Close( v8::Integer::New( Curl::count ) );
}

v8::Handle<v8::Value> Curl::Raise( const char *data, const char *reason )
{
    v8::HandleScope scope;

    isRunning = false;

	const char *what = data;
    std::string msg;

	if ( reason ) {

        msg = string_format( "%s: %s", data, reason );
        what = msg.c_str();
        
	}

    std::cerr << "Hello" << std::endl;

    return scope.Close( v8::ThrowException( v8::Exception::Error( v8::String::New( what ) ) ) );
    //return scope.Close( v8::String::New( "ada" ) );
}
