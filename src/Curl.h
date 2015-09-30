#ifndef NODELIBCURL_H
#define NODELIBCURL_H
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

#include <map>
#include <vector>
#include <string>
#include <memory>
#include <functional>

#include <node.h>
#include <nan.h>

#include <curl/curl.h>

#include "CurlHttpPost.h"
#include "macros.h"

using Nan::ObjectWrap;

namespace NodeLibcurl {

    // store mapping from the CURL[*] constants that can be used in js
    struct CurlConstant
    {
        const char *name;
        int64_t value;
    };

    template<typename T>
    using deleted_unique_ptr = std::unique_ptr<T, std::function<void( T* )>>;

    const extern std::vector<CurlConstant> curlConstAuth;
    const extern std::vector<CurlConstant> curlConstProtocol;
    const extern std::vector<CurlConstant> curlConstPause;
    const extern std::vector<CurlConstant> curlConstHttp;
    const extern std::vector<CurlConstant> curlConstHeader;

    const extern std::vector<CurlConstant> curlOptionInteger;
    const extern std::vector<CurlConstant> curlOptionString;
    const extern std::vector<CurlConstant> curlOptionFunction;
    const extern std::vector<CurlConstant> curlOptionLinkedList;
    const extern std::vector<CurlConstant> curlOptionHttpPost;
    const extern std::vector<CurlConstant> curlOptionSpecific;

    const extern std::vector<CurlConstant> curlInfoString;
    const extern std::vector<CurlConstant> curlInfoDouble;
    const extern std::vector<CurlConstant> curlInfoInteger;
    const extern std::vector<CurlConstant> curlInfoLinkedList;

    const extern std::vector<CurlConstant> curlMultiOptionInteger;
    const extern std::vector<CurlConstant> curlMultiOptionStringArray;

    const extern std::vector<CurlConstant> curlCode;

    // export Curl to js
    NAN_MODULE_INIT( Initialize );

    // js exported Methods
    NAN_METHOD( GetVersion );
    NAN_METHOD( GetCount );
    NAN_GETTER( GetterVersionNum );

    // helper methods
    int32_t IsInsideCurlConstantStruct( const std::vector<CurlConstant> &curlConstants, const v8::Local<v8::Value> &searchFor );
    void ThrowError( const char *message, const char *reason = nullptr );

}
#endif
