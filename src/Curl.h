#ifndef NODELIBCURL_H
#define NODELIBCURL_H
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
#include <functional>

#include <node.h>
#include <nan.h>

#include <curl/curl.h>

#include "CurlHttpPost.h"
#include "macros.h"

using Nan::ObjectWrap;

namespace NodeLibcurl {

    //https://github.com/nodejs/nan/issues/461#issuecomment-140370028
#if NODE_MODULE_VERSION < IOJS_3_0_MODULE_VERSION
    typedef v8::Handle<v8::Value> ADDON_REGISTER_FUNCTION_ARGS2_TYPE;
#else
    typedef v8::Local<v8::Value> ADDON_REGISTER_FUNCTION_ARGS2_TYPE;
#endif

#define NODE_LIBCURL_MODULE_INIT( name )                                                  \
    void name( Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE exports, ADDON_REGISTER_FUNCTION_ARGS2_TYPE module )

#define NODE_LIBCURL_ADJUST_MEM( size ) if ( !isLibcurlBuiltWithThreadedResolver ) AdjustMemory( size )

    // store mapping from the CURL[*] constants that can be used in js
    struct CurlConstant
    {
        const char *name;
        int64_t value;
    };

    extern ssize_t addonAllocatedMemory;
    extern bool isLibcurlBuiltWithThreadedResolver;

    template<typename T>
    using deleted_unique_ptr = std::unique_ptr<T, std::function<void( T* )>>;

    extern const std::vector<CurlConstant> curlConstAuth;
    extern const std::vector<CurlConstant> curlConstProtocol;
    extern const std::vector<CurlConstant> curlConstPause;
    extern const std::vector<CurlConstant> curlConstHttp;
    extern const std::vector<CurlConstant> curlConstHeader;

    extern const std::vector<CurlConstant> curlOptionNotImplemented;
    extern const std::vector<CurlConstant> curlOptionInteger;
    extern const std::vector<CurlConstant> curlOptionString;
    extern const std::vector<CurlConstant> curlOptionFunction;
    extern const std::vector<CurlConstant> curlOptionLinkedList;
    extern const std::vector<CurlConstant> curlOptionHttpPost;
    extern const std::vector<CurlConstant> curlOptionSpecific;

    extern const std::vector<CurlConstant> curlInfoNotImplemented;
    extern const std::vector<CurlConstant> curlInfoString;
    extern const std::vector<CurlConstant> curlInfoDouble;
    extern const std::vector<CurlConstant> curlInfoInteger;
    extern const std::vector<CurlConstant> curlInfoSocket;
    extern const std::vector<CurlConstant> curlInfoLinkedList;

    extern const std::vector<CurlConstant> curlMultiOptionNotImplemented;
    extern const std::vector<CurlConstant> curlMultiOptionInteger;
    extern const std::vector<CurlConstant> curlMultiOptionStringArray;

    extern const std::vector<CurlConstant> curlCode;

    // export Curl to js
    NODE_LIBCURL_MODULE_INIT( Initialize );

    // js exported Methods
    NAN_METHOD( GlobalInit );
    NAN_METHOD( GlobalCleanup );
    NAN_METHOD( GetVersion );
    NAN_METHOD( GetCount );
    NAN_GETTER( GetterVersionNum );

    // helper methods
    int32_t IsInsideCurlConstantStruct( const std::vector<CurlConstant> &curlConstants, const v8::Local<v8::Value> &searchFor );
    void ThrowError( const char *message, const char *reason = nullptr );
    void AdjustMemory( ssize_t size );

}
#endif
