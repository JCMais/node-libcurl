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

class Curl {

    public:
	    struct CurlOption
	    {
		    const char *name;
		    int   value;
	    };

        static void Initialize( v8::Handle<v8::Object> exports );

    private:
        Curl( v8::Handle<v8::Object> Object );
        ~Curl(void);
        void Dispose();

        CURL  *curl;
        CurlHttpPost httpPost;
        
        std::vector<curl_slist*> curlLinkedLists;
        std::map<int, std::string> curlStrings;
        v8::Persistent<v8::Object> handle;
        bool isInsideMultiCurl;

	    static CURLM *curlMulti;
        static int runningHandles;
        static int count;
        static int transfered;
	    static std::map< CURL*, Curl* > curls;

        static v8::Persistent<v8::Function> constructor;

        static Curl* Unwrap( v8::Handle<v8::Object> );

	    static v8::Handle<v8::Value> New( const v8::Arguments & );
        static void Destructor( v8::Persistent<v8::Value>, void * );

        static size_t WriteFunction( char *, size_t, size_t, void * );
        static size_t HeaderFunction( char *, size_t, size_t, void * );

        size_t OnData( char *, size_t );
        size_t OnHeader( char *, size_t );
        void OnEnd( CURLMsg * );
        void OnError( CURLMsg * );

        template<typename ResultType, typename v8MappingType>
        static v8::Handle<v8::Value> GetInfoTmpl( const Curl &, int );

        static v8::Handle<v8::Value> Close( const v8::Arguments & );
        static v8::Handle<v8::Value> SetOpt( const v8::Arguments & );
        static v8::Handle<v8::Value> GetInfo( const v8::Arguments & );
        static v8::Handle<v8::Value> Process( const v8::Arguments & );
        static v8::Handle<v8::Value> Perform( const v8::Arguments & );
        static v8::Handle<v8::Value> GetCount( const v8::Arguments & );
        static v8::Handle<v8::Value> Raise( const char *, const char * = NULL );

};
#endif
