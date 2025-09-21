#ifndef NOMINMAX
#define NOMINMAX
#endif

/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#include "Http2PushFrameHeaders.h"

namespace NodeLibcurl {

const napi_type_tag HTTP2_PUSH_FRAME_HEADERS_TYPE_TAG = {0x3ddda65f5bf2445c, 0xbdcd5768faf8210d};

Http2PushFrameHeaders::Http2PushFrameHeaders(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<Http2PushFrameHeaders>(info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    throw Napi::TypeError::New(env, "Http2PushFrameHeaders requires headers and numberOfHeaders");
  }

  // Expect external object wrapping curl_pushheaders* as first arg
  if (!info[0].IsExternal()) {
    throw Napi::TypeError::New(env,
                               "First argument must be an external pointer to curl_pushheaders");
  }

  // Expect number of headers as second arg
  if (!info[1].IsNumber()) {
    throw Napi::TypeError::New(env, "Second argument must be the number of headers");
  }

  auto maybeHeadersExternal = info[0].As<Napi::External<curl_pushheaders>>();

  if (!maybeHeadersExternal.CheckTypeTag(&HTTP2_PUSH_FRAME_HEADERS_TYPE_TAG)) {
    throw Napi::TypeError::New(env, "Argument must be an external curl_pushheaders handle.");
  }

  this->headers = maybeHeadersExternal.Data();
  this->numberOfHeaders = info[1].As<Napi::Number>().Uint32Value();
}

Napi::Function Http2PushFrameHeaders::Init(Napi::Env env, Napi::Object exports) {
  // Define the class but don't export it
  // This class is only created internally
  Napi::Function func = DefineClass(
      env, "Http2PushFrameHeaders",
      {// Instance methods
       InstanceMethod("getByIndex", &Http2PushFrameHeaders::GetByIndex),
       InstanceMethod("getByName", &Http2PushFrameHeaders::GetByName),

       // Property accessors
       InstanceAccessor(
           "numberOfHeaders", &Http2PushFrameHeaders::GetNumberOfHeaders, nullptr,
           static_cast<napi_property_attributes>(napi_enumerable | napi_configurable))});
  return func;
}

Napi::Value Http2PushFrameHeaders::GetByIndex(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "Wrong number of arguments");
  }

  Napi::Value value = info[0];

  if (!value.IsNumber()) {
    throw Napi::TypeError::New(env, "Index must be a non-negative integer");
  }

  uint32_t index = value.As<Napi::Number>().Uint32Value();
  char* result = curl_pushheader_bynum(this->headers, static_cast<size_t>(index));

  if (result == nullptr) {
    return env.Null();
  }

  return Napi::String::New(env, result);
}

Napi::Value Http2PushFrameHeaders::GetByName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "Wrong number of arguments");
  }

  Napi::Value value = info[0];

  if (!value.IsString()) {
    throw Napi::TypeError::New(env, "Name must be a string");
  }

  std::string name = value.As<Napi::String>().Utf8Value();
  char* result = curl_pushheader_byname(this->headers, name.c_str());

  if (result == nullptr) {
    return env.Null();
  }

  return Napi::String::New(env, result);
}

Napi::Value Http2PushFrameHeaders::GetNumberOfHeaders(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Number::New(env, static_cast<uint32_t>(this->numberOfHeaders));
}

}  // namespace NodeLibcurl
