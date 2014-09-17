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
        int32_t value;
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

    //Function handlers
    struct CurlCallback {
        //we need this flag because of https://github.com/bagder/curl/commit/907520c4b93616bddea15757bbf0bfb45cde8101
        bool isProgressCbAlreadyAborted;
        v8::Persistent<v8::Function> progress;
        v8::Persistent<v8::Function> xferinfo;
        v8::Persistent<v8::Function> debug;
    };

    CurlCallback callbacks;

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
    static size_t WriteFunction( char *ptr, size_t size, size_t nmemb, void *userdata );
    static size_t HeaderFunction( char *ptr, size_t size, size_t nmemb, void *userdata );

    //Instance methods
    size_t OnData( char *data, size_t size, size_t nmemb );
    size_t OnHeader( char *data, size_t size, size_t nmemb );
    void OnEnd( CURLMsg *msg );
    void OnError( CURLMsg *msg );
    void DisposeCallbacks();

    //Helper static methods
    template<typename T>
    static void ExportConstants( T *obj, Curl::CurlOption *optionGroup, uint32_t len, curlMapId *mapId, curlMapName *mapName );

    template<typename TResultType, typename Tv8MappingType>
    static v8::Handle<v8::Value> GetInfoTmpl( const Curl &obj, int infoId );

    static Curl* Unwrap( v8::Handle<v8::Object> );
    static v8::Handle<v8::Value> Raise( const char *message, const char *reason = NULL );

    //Callbacks
    static int CbProgress( void *clientp, double dltotal, double dlnow, double ultotal, double ulnow );
    static int CbXferinfo( void *clientp, curl_off_t dltotal, curl_off_t dlnow, curl_off_t ultotal, curl_off_t ulnow );
    static int CbDebug( CURL *handle, curl_infotype type, char *data, size_t size, void *userptr );

    //Js exported Methods
    static v8::Handle<v8::Value> New( const v8::Arguments &args );
    static void Destructor( v8::Persistent<v8::Value> value, void *data );

    static v8::Handle<v8::Value> SetOpt( const v8::Arguments &args );
    static v8::Handle<v8::Value> GetInfo( const v8::Arguments &args );
    static v8::Handle<v8::Value> Perform( const v8::Arguments &args );
    static v8::Handle<v8::Value> Pause( const v8::Arguments &args );
    static v8::Handle<v8::Value> Reset( const v8::Arguments &args );
    static v8::Handle<v8::Value> Close( const v8::Arguments &args );

    static v8::Handle<v8::Value> GetCount( const v8::Arguments &args );
    static v8::Handle<v8::Value> GetVersion( const v8::Arguments &args );

};
#endif
