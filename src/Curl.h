#ifndef CURL_H
#define CURL_H

#include <nan.h>
#include <map>
#include <vector>
#include <string>

#include "CurlHttpPost.h"
#include "macros.h"

typedef std::map<const int*, std::string> curlMapId;
typedef std::map<std::string, const int*> curlMapName;

class Curl : public node::ObjectWrap {

public:
    //store mapping from the options/infos names that can be used in js to their respective CURLOption id
    struct CurlOption
    {
        const char *name;
        int32_t value;
        //There is an warning about overflow here. The biggest value this is going be is 1 << 31, from CURLAUTH_ONLY.
        // Since atm this is the only place with such big value, we are veryfing for that in the setOpt method, and so using the correct value there.
    };

    //Context used with curl_multi_assign to create a relationship between the socket being used and the poll handler.
    struct CurlSocketContext {
        uv_mutex_t mutex;
        uv_poll_t pollHandle;
        curl_socket_t sockfd;
    };

    Curl();

    //Export curl to js
    static void Initialize( v8::Handle<v8::Object> exports );

    //Js exported Methods
    static NAN_METHOD( New );
    static NAN_METHOD( SetOpt );
    static NAN_METHOD( GetInfo );
    static NAN_METHOD( Perform );
    static NAN_METHOD( Pause );
    static NAN_METHOD( Reset );
    static NAN_METHOD( Close );

    static NAN_METHOD( GetCount );
    static NAN_METHOD( GetVersion );

    //Callbacks
    //we need this flag because of https://github.com/bagder/curl/commit/907520c4b93616bddea15757bbf0bfb45cde8101
    bool isCbProgressAlreadyAborted;
    NanCallback *cbProgress;
    NanCallback *cbXferinfo;
    NanCallback *cbDebug;

    //Members
    CURL  *curl;
    CurlHttpPost *httpPost;

    std::vector<curl_slist*> curlLinkedLists; //a unique_ptr can been used here.
    std::map<int, std::string> curlStrings;

    bool isInsideMultiCurl;
    bool isOpen;

    //static members
    static CURLM *curlMulti;
    static int count;
    static std::map< CURL*, Curl* > curls;
    static uv_timer_t curlTimeout;

    static v8::Persistent<v8::Function> constructor;
    static v8::Persistent<v8::String> onDataCbSymbol;
    static v8::Persistent<v8::String> onHeaderCbSymbol;
    static v8::Persistent<v8::String> onErrorCbSymbol;
    static v8::Persistent<v8::String> onEndCbSymbol;


    //LibUV Socket polling
    static CurlSocketContext *CreateCurlSocketContext( curl_socket_t sockfd );
    static int HandleSocket( CURL *easy, curl_socket_t s, int action, void *userp, void *socketp );
    static int HandleTimeout( CURLM *multi, long timeoutMs, void *userp );
    static UV_TIMER_CB( OnTimeout );
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
    void OnEnd();
    void OnError( CURLcode errorCode );
    void Dispose();
    void DisposeCallbacks();

    //Helper static methods
    template<typename T>
    static void ExportConstants( T *obj, Curl::CurlOption *optionGroup, uint32_t len, curlMapId *mapId, curlMapName *mapName );

    template<typename TResultType, typename Tv8MappingType>
    static v8::Local<v8::Value> GetInfoTmpl( const Curl *obj, int infoId );
    static void ThrowError( const char *message, const char *reason = nullptr );

    //Callbacks
    static int CbProgress( void *clientp, double dltotal, double dlnow, double ultotal, double ulnow );
    static int CbXferinfo( void *clientp, curl_off_t dltotal, curl_off_t dlnow, curl_off_t ultotal, curl_off_t ulnow );
    static int CbDebug( CURL *handle, curl_infotype type, char *data, size_t size, void *userptr );

private:
    ~Curl();

};
#endif
