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
  // Some background story on this commented code and other usages of setlocale
  // elsewhere on the addon: Libcurl, when built with libidn2, calls function
  // `idn2_lookup_ul` to retrieve a punycode representation
  //  of a domain. This function internally uses libunistring
  //  `u8_strconv_from_encoding`, which expects an existing locale being set:
  //  https://github.com/libidn/libidn2/blob/02a3127d21f8a99042a8ae82f1513b3ffc0170f2/lib/lookup.c#L536
  // Node.js (correctly) does not set any locale by default, and so when this
  // function gets called
  //  an error is returned, and libcurl bails out with MALFORMED URL error.
  // We could just call setlocale here, like the commented code, and it would
  // work, however this would
  //  impact addon users that, in some way, use locale.
  // (I've opened this issue to make sure
  // https://github.com/nodejs/help/issues/1878) Instead of doing that, we are
  // instead calling setlocale on some specific parts of the code, to be
  //  more specific, on Easy#SetPerform, Multi#AddHandle and Multi#OnSocket
  // That code is behind a DEFINE guard, which the user can disable by passing
  //  `node_libcurl_no_setlocale` option when building, this will define
  //  NODE_LIBCURL_NO_SETLOCALE.
  // https://docs.microsoft.com/en-us/cpp/c-runtime-library/reference/setlocale-wsetlocale?view=vs-2019
  // setlocale(AC_ALL, "")

  NODE_LIBCURL_DEBUG_LOG_STATIC(static_cast<napi_env>(env), "NodeLibcurl::InitAll");

  Curl::Init(env, exports);
  return exports;
}

// Register the module with N-API
NODE_API_MODULE(node_libcurl, InitAll)

}  // namespace NodeLibcurl
