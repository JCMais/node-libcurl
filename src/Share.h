#ifndef NODELIBCURL_SHARE_H
#define NODELIBCURL_SHARE_H
/**
* @author Jonathan Cardoso Machado
* @license MIT
* @copyright 2015, Jonathan Cardoso Machado
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

#include <string>
#include <unordered_map>

#include <node.h>
#include <nan.h>

#include <curl/curl.h>

#include "Curl.h"
#include "macros.h"

using Nan::ObjectWrap;

namespace NodeLibcurl {

    class Share: public ObjectWrap {
        
        Share();

        Share( const Share &that );
        Share& operator=( const Share &that );

        ~Share();

        // instance methods
        void Dispose();

    public:

        // js object constructor template
        static Nan::Persistent<v8::FunctionTemplate> constructor;

        // members
        CURLSH *sh;
        bool isOpen;

        // export Easy to js
        static CURL_MODULE_INIT( Initialize );

        // js available methods
        static NAN_METHOD( New );
        static NAN_METHOD( SetOpt );
        static NAN_METHOD( Close );
        static NAN_METHOD( StrError );
    };
}
#endif
