#ifndef CURL_H
#define CURL_H

#include <v8.h>
#include <node.h>
#include <node_buffer.h>
#include <curl/curl.h>
#include <map>
#include <vector>
#include <string>
#include <iostream>
#include <stdlib.h>
#include <string.h>

#include "CurlHttpPost.h"
#include "string_format.h"

typedef std::map<const int*, std::string> curlMapId;
typedef std::map<std::string, const int*> curlMapName;

class Curl {

    public:
        //store mapping from the options/infos names that can be used in js to their respective CURLOption id
	    struct CurlOption
	    {
		    const char *name;
		    int   value;
	    };

        //Export curl to js
        static void Initialize( v8::Handle<v8::Object> exports );

    private:

        //Constructors/Destructors
        Curl( v8::Handle<v8::Object> Object );
        ~Curl(void);
        void Dispose();

        //Context used with curl_multi_assign to create a relationship between the socket being used and the poll handler.
        struct CurlSocketContext {
            uv_mutex_t mutex;
            uv_poll_t pollHandle;
            curl_socket_t sockfd;
        };

        //Members
        CURL  *curl;
        CurlHttpPost httpPost;
        
        std::vector<curl_slist*> curlLinkedLists;
        std::map<int, std::string> curlStrings;
        v8::Persistent<v8::Object> handle;
        bool isInsideMultiCurl;

        //static members
	    static CURLM *curlMulti;
        static int runningHandles;
        static int count;
        static int transfered;
	    static std::map< CURL*, Curl* > curls;
        static uv_timer_t curlTimeout;
        static v8::Persistent<v8::Function> constructor;

        //LibUV Socket polling
        static CurlSocketContext *CreateCurlSocketContext( curl_socket_t sockfd );
        static int HandleSocket( CURL *easy, curl_socket_t s, int action, void *userp, void *socketp );
        static int HandleTimeout( CURLM *multi, long timeoutMs, void *userp );
        static void OnTimeout( uv_timer_t *req, int status );
        static void Process( uv_poll_t* handle, int status, int events );
        static void ProcessMessages();
        static void DestroyCurlSocketContext( CurlSocketContext *ctx );
        static void OnCurlSocketClose( uv_handle_t *handle );

        //cURL callbacks
        static size_t WriteFunction( char *, size_t, size_t, void * );
        static size_t HeaderFunction( char *, size_t, size_t, void * );

        //Instance methods
        size_t OnData( char *, size_t );
        size_t OnHeader( char *, size_t );
        void OnEnd( CURLMsg * );
        void OnError( CURLMsg * );

        //Helper static methods
        template<typename T>
        static void ExportConstants( T *obj, Curl::CurlOption *optionGroup, uint32_t len, curlMapId *mapId, curlMapName *mapName );

        template<typename ResultType, typename v8MappingType>
        static v8::Handle<v8::Value> GetInfoTmpl( const Curl &obj, int infoId );

        static Curl* Unwrap( v8::Handle<v8::Object> );
        static v8::Handle<v8::Value> Raise( const char *, const char * = NULL );

        //Js exported Methods
        static v8::Handle<v8::Value> New( const v8::Arguments & );
        static void Destructor( v8::Persistent<v8::Value>, void * );

        static v8::Handle<v8::Value> SetOpt( const v8::Arguments & );
        static v8::Handle<v8::Value> GetInfo( const v8::Arguments & );
        static v8::Handle<v8::Value> Perform( const v8::Arguments & );
        static v8::Handle<v8::Value> GetCount( const v8::Arguments & );
        static v8::Handle<v8::Value> Close( const v8::Arguments & );
};
#endif
