#ifndef NOMINMAX
#define NOMINMAX
#endif

/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "Share.h"

#include "Curl.h"
#include "CurlError.h"

#include <cassert>
#include <iostream>

// 464 was allocated on Win64
//  Value too small to bother letting v8 know about it
#define MEMORY_PER_HANDLE 464

namespace NodeLibcurl {

// Static member initialization
std::atomic<uint64_t> Share::nextId = 0;

Share::Share(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<Share>(info), isOpen(true), id(nextId++) {
  NODE_LIBCURL_DEBUG_LOG(this, "Share::Constructor", "");
  Napi::Env env = info.Env();
  auto curl = this->Env().GetInstanceData<Curl>();

  // Check if called with 'new'
  if (!info.IsConstructCall()) {
    throw Napi::TypeError::New(env, "You must use \"new\" to instantiate this object.");
  }

  this->sh = curl_share_init();

  if (!this->sh) {
    throw CurlError::New(env, "Failed to initialize share handle", CURLSHE_NOMEM);
  }

  curl->AdjustHandleMemory(CURL_HANDLE_TYPE_SHARE, 1);
}

Share::~Share() {
  NODE_LIBCURL_DEBUG_LOG(this, "Share::Destructor", "isOpen: " + std::to_string(this->isOpen));
  if (this->isOpen) {
    this->Dispose();
  }
}

void Share::Dispose() {
  NODE_LIBCURL_DEBUG_LOG(this, "Share::Dispose", "");
  assert(this->isOpen && "This handle was already closed.");
  assert(this->sh && "The share handle ran away.");

  this->isOpen = false;

  CURLSHcode code = curl_share_cleanup(this->sh);
  assert(code == CURLSHE_OK);

  auto curl = this->Env().GetInstanceData<Curl>();
  curl->AdjustHandleMemory(CURL_HANDLE_TYPE_SHARE, -1);
}

Napi::Function Share::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  // Define the class
  Napi::Function func =
      DefineClass(env, "Share",
                  {// Instance methods
                   InstanceMethod("setOpt", &Share::SetOpt), InstanceMethod("close", &Share::Close),

                   // Static methods
                   StaticMethod("strError", &Share::StrError)});

  exports.Set("Share", func);
  return func;
}

Napi::Value Share::SetOpt(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!this->isOpen) {
    throw CurlError::New(env, "Share handle is closed.", CURLSHE_INVALID);
  }

  if (info.Length() < 2) {
    throw Napi::TypeError::New(env, "Wrong number of arguments");
  }

  Napi::Value opt = info[0];
  Napi::Value value = info[1];

  if (!value.IsNumber()) {
    throw Napi::TypeError::New(env, "Option value must be an integer.");
  }

  CURLSHcode setOptRetCode = CURLSHE_BAD_OPTION;
  int32_t optionId = -1;

  // Handle option as either integer or string
  if (opt.IsNumber()) {
    optionId = opt.As<Napi::Number>().Int32Value();
  } else if (opt.IsString()) {
    std::string optionString = opt.As<Napi::String>().Utf8Value();

    if (optionString == "SHARE") {
      optionId = static_cast<int>(CURLSHOPT_SHARE);
    } else if (optionString == "UNSHARE") {
      optionId = static_cast<int>(CURLSHOPT_UNSHARE);
    }
  }

  int32_t optionValue = value.As<Napi::Number>().Int32Value();
  setOptRetCode = curl_share_setopt(this->sh, static_cast<CURLSHoption>(optionId), optionValue);

  return Napi::Number::New(env, setOptRetCode);
}

Napi::Value Share::Close(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!this->isOpen) {
    throw CurlError::New(env, "Share handle already closed.", CURLSHE_INVALID);
  }

  this->Dispose();

  return env.Undefined();
}

Napi::Value Share::StrError(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "Wrong number of arguments");
  }

  Napi::Value errCode = info[0];

  if (!errCode.IsNumber()) {
    throw Napi::TypeError::New(env, "Invalid errCode passed to Share.strError.");
  }

  int32_t code = errCode.As<Napi::Number>().Int32Value();
  const char* errorMsg = curl_share_strerror(static_cast<CURLSHcode>(code));

  return Napi::String::New(env, errorMsg);
}

}  // namespace NodeLibcurl
