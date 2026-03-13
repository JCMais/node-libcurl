/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#pragma once

#include "macros.h"

#include <curl/curl.h>

#include <napi.h>
#include <string>
#include <vector>

namespace NodeLibcurl {

class CurlVersionInfo {
 private:
  struct feature {
    const char* name;
    int bitmask;
  };

  static const std::vector<feature> features;
  static const curl_version_info_data* versionInfo;

  // Helper function for setting properties
  template <typename TValue>
  static void SetObjPropertyToNullOrValue(Napi::Object obj, const std::string& key, TValue value);

 public:
  // Initialize the CurlVersionInfo object for export
  static void Init(Napi::Env env, Napi::Object exports);

  // Property getters
  static Napi::Value GetProtocols(const Napi::CallbackInfo& info);
  static Napi::Value GetFeatures(const Napi::CallbackInfo& info);
};

}  // namespace NodeLibcurl
