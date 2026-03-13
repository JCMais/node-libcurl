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

// Custom error class for libcurl errors with error code
class CurlError {
 public:
  static Napi::Error New(Napi::Env env, const char* message, CURLcode code,
                         bool autoAddSuffix = false);
  static Napi::Error New(Napi::Env env, const char* message, CURLMcode code,
                         bool autoAddSuffix = false);
  static Napi::Error New(Napi::Env env, const char* message, CURLSHcode code,
                         bool autoAddSuffix = false);

  static Napi::Function InitCurlEasyError(Napi::Env env);
  static Napi::Function InitCurlMultiError(Napi::Env env);
  static Napi::Function InitCurlSharedError(Napi::Env env);

 private:
  CurlError();
};

}  // namespace NodeLibcurl
