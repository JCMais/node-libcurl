#ifndef NODELIBCURL_EASY_H
#define NODELIBCURL_EASY_H
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

#include <map>
#include <vector>
#include <string>
#include <memory>

#include <node.h>
#include <nan.h>

#include <curl/curl.h>

#include "Curl.h"
#include "CurlHttpPost.h"
#include "macros.h"

using Nan::ObjectWrap;

namespace NodeLibcurl {

    class Easy: public ObjectWrap {

        class ToFree;

        Easy();
        explicit Easy( Easy* orig );

        Easy( const Easy &that );
        Easy& operator=( const Easy &that );

        ~Easy();

        // instance methods
        void Dispose();
        void ResetRequiredHandleOptions();
        void CallSocketEvent( int status, int events );
        void MonitorSockets();
        void UnmonitorSockets();

        size_t OnData( char *data, size_t size, size_t nmemb );
        size_t OnHeader( char *data, size_t size, size_t nmemb );

        // static members
        static uint32_t counter;

        // callbacks
        typedef std::map<CURLoption, std::shared_ptr<Nan::Callback>> CallbacksMap;
        CallbacksMap callbacks = CallbacksMap{};
        std::shared_ptr<Nan::Callback> cbOnSocketEvent; // still required since it's not related to any CURLoption.

        // members
        uv_poll_t *socketPollHandle = nullptr;
        std::shared_ptr<ToFree> toFree = nullptr;

        bool isCbProgressAlreadyAborted = false; // we need this flag because of https://github.com/curl/curl/commit/907520c4b93616bddea15757bbf0bfb45cde8101
        bool isMonitoringSockets = false;

        int32_t readDataFileDescriptor = -1; // READDATA sets that
        curl_off_t readDataOffset = -1; // SEEKDATA sets that
        uint32_t id = counter++;

        // static methods
        template<typename TResultType, typename Tv8MappingType>
        static v8::Local<v8::Value> GetInfoTmpl( const Easy *obj, int infoId );
        static v8::Local<v8::Object> CreateV8ObjectFromCurlFileInfo( curl_fileinfo *fileInfo );

        // persistent objects
        static Nan::Persistent<v8::String> onDataCbSymbol;
        static Nan::Persistent<v8::String> onHeaderCbSymbol;

    public:
        // operators
        bool operator==( const Easy &easy ) const;
        bool operator!=( const Easy &other ) const;

        // js object constructor template
        static Nan::Persistent<v8::FunctionTemplate> constructor;

        // members
        CURL  *ch;
        bool isInsideMultiHandle = false;
        bool isOpen = true;

        // static members
        static uint32_t currentOpenedHandles;

        // export Easy to js
        static NODE_LIBCURL_MODULE_INIT( Initialize );

        // js available methods
        static NAN_METHOD( New );
        static NAN_GETTER( IdGetter );
        static NAN_GETTER( IsInsideMultiHandleGetter );
        static NAN_METHOD( SetOpt );
        static NAN_METHOD( GetInfo );
        static NAN_METHOD( Send );
        static NAN_METHOD( Recv );
        static NAN_METHOD( Perform );
        static NAN_METHOD( Pause );
        static NAN_METHOD( Reset );
        static NAN_METHOD( DupHandle );
        static NAN_METHOD( OnSocketEvent );
        static NAN_METHOD( MonitorSocketEvents );
        static NAN_METHOD( UnmonitorSocketEvents );
        static NAN_METHOD( Close );
        static NAN_METHOD( StrError );

        // cURL callbacks
        static size_t ReadFunction( char *ptr, size_t size, size_t nmemb, void *userdata );
        static size_t SeekFunction( void *userdata, curl_off_t offset, int origin );
        static size_t HeaderFunction( char *ptr, size_t size, size_t nmemb, void *userdata );
        static size_t WriteFunction( char *ptr, size_t size, size_t nmemb, void *userdata );

        static long CbChunkBgn( curl_fileinfo *transferInfo, void *ptr, int remains );
        static long CbChunkEnd( void *ptr );
        static int CbDebug( CURL *handle, curl_infotype type, char *data, size_t size, void *userptr );
        static int CbFnMatch( void *ptr, const char *pattern, const char *string );
        static int CbProgress( void *clientp, double dltotal, double dlnow, double ultotal, double ulnow );
        static int CbXferinfo( void *clientp, curl_off_t dltotal, curl_off_t dlnow, curl_off_t ultotal, curl_off_t ulnow );

        // libuv callbacks
        static void OnSocket( uv_poll_t* handle, int status, int events );
        static void OnSocketClose( uv_handle_t* handle );
    };
}
#endif
