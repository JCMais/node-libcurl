#ifndef NOMINMAX
#define NOMINMAX
#endif

/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#include "Curl.h"
#include "macros.h"

#include <curl/curl.h>

#include <iostream>
#include <napi.h>
#include <thread>

namespace NodeLibcurl {

// Module initialization function
Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  // Note: Locale handling is done per-thread via LocaleGuard (see LocaleGuard.h)
  // This ensures libcurl's libidn2 integration works without setting global locale.
  // setlocale(AC_ALL, "")

  NODE_LIBCURL_DEBUG_LOG_STATIC(static_cast<napi_env>(env), "NodeLibcurl::InitAll");

  InitializeCurlConstantMaps();

  Curl::Init(env, exports);
  return exports;
}

// Register the module with N-API
NODE_API_MODULE(node_libcurl, InitAll)

}  // namespace NodeLibcurl
