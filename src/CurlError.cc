/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "CurlError.h"

#include "Curl.h"
#include "curl/multi.h"

#include <curl/curl.h>

#include <cassert>
#include <iostream>
#include <napi.h>
#include <string>

namespace NodeLibcurl {

Napi::Error CurlError::New(Napi::Env env, const char* message, CURLcode code, bool autoAddSuffix) {
  std::string fullMessage = message;

  if (autoAddSuffix) {
    fullMessage += ": ";
    fullMessage += curl_easy_strerror(code);
  }

  auto curl = env.GetInstanceData<Curl>();
  auto curlErrorInstance = curl->CurlEasyErrorConstructor.Value().New(
      {Napi::String::New(env, fullMessage), Napi::Number::New(env, static_cast<int>(code))});

  Napi::Error error = Napi::Error(env, curlErrorInstance);

  return error;
}

Napi::Error CurlError::New(Napi::Env env, const char* message, CURLMcode code, bool autoAddSuffix) {
  std::string fullMessage = message;

  if (autoAddSuffix) {
    fullMessage += ": ";
    fullMessage += curl_multi_strerror(code);
  }

  auto curl = env.GetInstanceData<Curl>();
  auto curlErrorInstance = curl->CurlMultiErrorConstructor.Value().New(
      {Napi::String::New(env, fullMessage), Napi::Number::New(env, static_cast<int>(code))});

  Napi::Error error = Napi::Error(env, curlErrorInstance);

  return error;
}

Napi::Error CurlError::New(Napi::Env env, const char* message, CURLSHcode code,
                           bool autoAddSuffix) {
  std::string fullMessage = message;

  if (autoAddSuffix) {
    fullMessage += ": ";
    fullMessage += curl_share_strerror(code);
  }

  auto curl = env.GetInstanceData<Curl>();
  auto curlErrorInstance = curl->CurlSharedErrorConstructor.Value().New(
      {Napi::String::New(env, fullMessage), Napi::Number::New(env, static_cast<int>(code))});

  Napi::Error error = Napi::Error(env, curlErrorInstance);

  return error;
}

Napi::Function CurlError::InitCurlEasyError(Napi::Env env) {
  Napi::Value CurlEasyError = env.Global().Get("__libcurlCurlEasyError");
  // we fallback to the global Error object if __libcurlCurlEasyError is not set
  // to keep supporting testpackage from pregyp, which just includes the .node addon directly.
  if (!CurlEasyError.IsFunction()) {
    CurlEasyError = env.Global().Get("Error");
  }
  assert(CurlEasyError.IsFunction() && "__libcurlCurlEasyError must be an object");
  return CurlEasyError.As<Napi::Function>();
}

Napi::Function CurlError::InitCurlMultiError(Napi::Env env) {
  Napi::Value CurlMultiError = env.Global().Get("__libcurlCurlMultiError");
  // see above
  if (!CurlMultiError.IsFunction()) {
    CurlMultiError = env.Global().Get("Error");
  }
  assert(CurlMultiError.IsFunction() && "__libcurlCurlMultiError must be an object");
  return CurlMultiError.As<Napi::Function>();
}

Napi::Function CurlError::InitCurlSharedError(Napi::Env env) {
  Napi::Value CurlSharedError = env.Global().Get("__libcurlCurlSharedError");
  // see above
  if (!CurlSharedError.IsFunction()) {
    CurlSharedError = env.Global().Get("Error");
  }
  assert(CurlSharedError.IsFunction() && "__libcurlCurlSharedError must be an object");
  return CurlSharedError.As<Napi::Function>();
}
}  // namespace NodeLibcurl
