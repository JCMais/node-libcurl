/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#ifndef NODELIBCURL_MACROS_H
#define NODELIBCURL_MACROS_H

#include <uv.h>

#if UV_VERSION_MAJOR < 1 && UV_VERSION_MINOR < 11

#define UV_TIMER_CB(cb) void cb(uv_timer_t* timer, int status)

#define UV_CALL_TIMER_CB(cb, timer, status) cb(timer, status)

#else

#define UV_TIMER_CB(cb) void cb(uv_timer_t* timer)

#define UV_CALL_TIMER_CB(cb, timer, status) cb(timer)

#endif

#if UV_VERSION_MAJOR < 1

#define UV_ERROR_STRING(err) uv_strerror(uv_last_error(uv_default_loop()))

#else

#define UV_ERROR_STRING(err) uv_strerror(err)

#endif

// inspired from the LUA bindings.
#define NODE_LIBCURL_MAKE_VERSION(MAJ, MIN, PAT) ((MAJ << 16) + (MIN << 8) + PAT)
#define NODE_LIBCURL_VER_GE(MAJ, MIN, PAT) \
  (LIBCURL_VERSION_NUM >= NODE_LIBCURL_MAKE_VERSION(MAJ, MIN, PAT))

#if !defined(NODE_LIBCURL_NO_SETLOCALE) && !defined(_WIN32)
#define SETLOCALE_WRAPPER(code)                         \
  std::string localeOriginal = setlocale(LC_ALL, NULL); \
  bool hasLocaleChanged = false;                        \
  if (localeOriginal == "C") {                          \
    hasLocaleChanged = true;                            \
    setlocale(LC_ALL, "");                              \
  }                                                     \
  code if (hasLocaleChanged) { setlocale(LC_ALL, localeOriginal.c_str()); }
#else
#define SETLOCALE_WRAPPER(code) code
#endif

#endif
