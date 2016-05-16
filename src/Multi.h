#ifndef NODELIBCURL_MULTI_H
#define NODELIBCURL_MULTI_H
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
#include <memory>
#include <functional>

#include <node.h>
#include <nan.h>
#include <curl/curl.h>

#include "macros.h"
#include "make_unique.h"
#include "Curl.h"
#include "Easy.h"

using Nan::ObjectWrap;

namespace NodeLibcurl {

    class Multi: public ObjectWrap {

        // instance methods
        Multi();
        ~Multi();

        Multi( const Multi &that );
        Multi& operator=( const Multi &that );

        void Dispose();
        void ProcessMessages();
        void CallOnMessageCallback( CURL *easy, CURLcode statusCode );
        void RemoveOnMessageCallback();

        // context used with curl_multi_assign to create a relationship between the socket being used and the poll handle.
        struct CurlSocketContext {
            uv_mutex_t mutex;
            uv_poll_t pollHandle;
            curl_socket_t sockfd;
            Multi *multi;
        };

        // members
        CURLM *mh;
        bool isOpen;
        int amountOfHandles;
        int runningHandles;

        deleted_unique_ptr<uv_timer_t> timeout;

        Nan::Callback *cbOnMessage;

        // static helper methods
        static CurlSocketContext *CreateCurlSocketContext( curl_socket_t sockfd, Multi *multi );
        static void DestroyCurlSocketContext( CurlSocketContext *ctx );

    public:

        // js object constructor template
        static Nan::Persistent<v8::FunctionTemplate> constructor;

        // export Multi to js
        static CURL_MODULE_INIT( Initialize );

        // js available Methods
        static NAN_METHOD( New );
        static NAN_METHOD( SetOpt );
        static NAN_METHOD( AddHandle );
        static NAN_METHOD( OnMessage );
        static NAN_METHOD( RemoveHandle );
        static NAN_METHOD( GetCount );
        static NAN_METHOD( Close );
        static NAN_METHOD( StrError );

        // libcurl multi_setopt callbacks
        static int HandleSocket( CURL *easy, curl_socket_t s, int action, void *userp, void *socketp );
        static int HandleTimeout( CURLM *multi, long timeoutMs, void *userp );

        // libuv events
        static UV_TIMER_CB( OnTimeout );
        static void OnTimerClose( uv_handle_t *handle );
        static void OnSocket( uv_poll_t* handle, int status, int events );
        static void OnSocketClose( uv_handle_t *handle );
    };

}
#endif
