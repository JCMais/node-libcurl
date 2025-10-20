/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#pragma once

#include "napi.h"

#include <curl/curl.h>
#include <node_api.h>

#include <functional>
#include <memory>
#include <unordered_map>
#include <vector>

namespace NodeLibcurl {

// Store mapping from the CURL[*] constants that can be used in js
struct CurlConstant {
  const char* name;
  int64_t value;
};

enum CurlHandleType {
  CURL_HANDLE_TYPE_EASY = 1,
  CURL_HANDLE_TYPE_MULTI = 2,
  CURL_HANDLE_TYPE_SHARE = 3
};

// Template for deleted unique pointers
template <typename T>
using deleted_unique_ptr = std::unique_ptr<T, std::function<void(T*)>>;

// Global Constant Vectors - Thread safe as we never modify them.
extern const std::vector<CurlConstant> curlOptionBlob;
extern const std::vector<CurlConstant> curlOptionFunction;
extern const std::vector<CurlConstant> curlOptionHttpPost;
extern const std::vector<CurlConstant> curlOptionInteger;
extern const std::vector<CurlConstant> curlOptionLinkedList;
extern const std::vector<CurlConstant> curlOptionNotImplemented;
extern const std::vector<CurlConstant> curlOptionSpecific;
extern const std::vector<CurlConstant> curlOptionString;

extern const std::vector<CurlConstant> curlInfoDouble;
extern const std::vector<CurlConstant> curlInfoInteger;
extern const std::vector<CurlConstant> curlInfoLinkedList;
extern const std::vector<CurlConstant> curlInfoNotImplemented;
extern const std::vector<CurlConstant> curlInfoOffT;
extern const std::vector<CurlConstant> curlInfoSocket;
extern const std::vector<CurlConstant> curlInfoString;

extern const std::vector<CurlConstant> curlMultiOptionFunction;
extern const std::vector<CurlConstant> curlMultiOptionInteger;
extern const std::vector<CurlConstant> curlMultiOptionNotImplemented;
extern const std::vector<CurlConstant> curlMultiOptionStringArray;

// Namespace helper methods
int32_t IsInsideCurlConstantStruct(const std::vector<CurlConstant>& curlConstants,
                                   const Napi::Value& searchFor);

// This is our main class that holds our "global" state, per v8 Agent (environment)
// TODO(jonathan, migration): this could be a napi addon directly!
class Curl {
 public:
  Curl(Napi::Env env, Napi::Object exports);
  ~Curl();
  Napi::FunctionReference EasyConstructor;
  Napi::FunctionReference MultiConstructor;
  Napi::FunctionReference ShareConstructor;
  Napi::FunctionReference Http2PushFrameHeadersConstructor;
  Napi::Env env;

  std::string caCertificatesData;
  struct curl_blob caCertificatesBlob;

  void AdjustHandleMemory(CurlHandleType handleType, int delta);

  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  static void CleanupData(Napi::Env env, Curl* data);

  static Napi::Value GetVersion(const Napi::CallbackInfo& info);
  static Napi::Value GetCount(const Napi::CallbackInfo& info);
  static Napi::Value GetVersionNum(const Napi::CallbackInfo& info);
  static Napi::Value GetThreadId(const Napi::CallbackInfo& info);

 private:
  int64_t addonAllocatedMemory;
  std::unordered_map<CurlHandleType, int> activeHandleCount = {
      {CURL_HANDLE_TYPE_EASY, 0}, {CURL_HANDLE_TYPE_MULTI, 0}, {CURL_HANDLE_TYPE_SHARE, 0}};

  void InitTLS();
};

}  // namespace NodeLibcurl
