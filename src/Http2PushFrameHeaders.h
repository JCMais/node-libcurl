/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#ifndef NODELIBCURL_HTTP_2_PUSH_FRAME_HEADERS_H
#define NODELIBCURL_HTTP_2_PUSH_FRAME_HEADERS_H

#include <curl/curl.h>
#include <nan.h>
#include <node.h>

namespace NodeLibcurl {

class Http2PushFrameHeaders : public Nan::ObjectWrap {
  // Private as this can only be created using NewInstance
  Http2PushFrameHeaders(struct curl_pushheaders* headers, size_t numberOfHeaders);
  // Copy constructors cannot be used.
  Http2PushFrameHeaders(const Http2PushFrameHeaders& that);
  Http2PushFrameHeaders& operator=(const Http2PushFrameHeaders& that);

  struct curl_pushheaders* headers;
  size_t numberOfHeaders;

  // js object template
  static Nan::Persistent<v8::ObjectTemplate> objectTemplate;

  // js available Methods
  static NAN_METHOD(GetByIndex);
  static NAN_METHOD(GetByName);
  static NAN_GETTER(GetterNumberOfHeaders);

 public:
  static v8::Local<v8::Object> NewInstance(struct curl_pushheaders* headers,
                                           size_t numberOfHeaders);

  static NAN_MODULE_INIT(Initialize);
};

}  // namespace NodeLibcurl
#endif
