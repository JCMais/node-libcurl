/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#pragma once

#include <curl/curl.h>

#include <napi.h>

namespace NodeLibcurl {

// Type tag for curl_pushheaders external
extern const napi_type_tag HTTP2_PUSH_FRAME_HEADERS_TYPE_TAG;

class Http2PushFrameHeaders : public Napi::ObjectWrap<Http2PushFrameHeaders> {
 public:
  static Napi::Function Init(Napi::Env env, Napi::Object exports);

  // Constructor - must be public for ObjectWrap
  Http2PushFrameHeaders(const Napi::CallbackInfo& info);

 private:
  // Copy constructors cannot be used
  Http2PushFrameHeaders(const Http2PushFrameHeaders& that) = delete;
  Http2PushFrameHeaders& operator=(const Http2PushFrameHeaders& that) = delete;

  // Instance methods
  Napi::Value GetByIndex(const Napi::CallbackInfo& info);
  Napi::Value GetByName(const Napi::CallbackInfo& info);

  // Property getters
  Napi::Value GetNumberOfHeaders(const Napi::CallbackInfo& info);

  // Members
  struct curl_pushheaders* headers;
  size_t numberOfHeaders;
};

}  // namespace NodeLibcurl
