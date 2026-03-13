/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#ifndef NODELIBCURL_LOCALEGUARD_H
#define NODELIBCURL_LOCALEGUARD_H

#if !defined(NODE_LIBCURL_NO_SETLOCALE) && !defined(_WIN32)

#include <locale.h>
#include <mutex>
#include <string.h>

// RAII wrapper for thread-safe locale handling
//
// Background: Libcurl, when built with libidn2, calls `idn2_lookup_ul` to retrieve
// a punycode representation of a domain. This function internally uses libunistring's
// `u8_strconv_from_encoding`, which expects an existing locale being set:
// https://github.com/libidn/libidn2/blob/02a3127d21f8a99042a8ae82f1513b3ffc0170f2/lib/lookup.c#L536
//
// Node.js (correctly) does not set any locale by default, and when this function gets
// called without a locale, an error is returned and libcurl bails out with a MALFORMED
// URL error.
//
// Solution: Instead of setting locale globally (which would impact all addon users),
// we use LocaleGuard to set locale per-thread using POSIX uselocale(). This:
// - Sets locale once per thread on first curl operation (lazy initialization)
// - Keeps the locale active for the thread's lifetime (no setup/teardown overhead)
// - Is completely thread-safe (each thread has its own locale state)
// - Can be disabled at build time with `node_libcurl_no_setlocale` option
class LocaleGuard {
 private:
  // Thread-safe one-time check if global locale is "C"
  static bool ShouldSetLocale() {
    static std::once_flag checkFlag;
    static bool needsLocale = false;

    std::call_once(checkFlag, []() {
      // setlocale(LC_ALL, NULL) is not thread-safe, but safe inside call_once
      const char* globalLocaleName = setlocale(LC_ALL, NULL);
      needsLocale = (globalLocaleName && strcmp(globalLocaleName, "C") == 0);
    });

    return needsLocale;
  }

  struct ThreadLocaleState {
    locale_t threadLocale = (locale_t)0;
    bool isInitialized = false;

    ~ThreadLocaleState() {
      if (threadLocale != (locale_t)0) {
        freelocale(threadLocale);
      }
    }
  };

  static ThreadLocaleState& GetThreadState() {
    thread_local ThreadLocaleState state;
    return state;
  }

 public:
  LocaleGuard() {
    if (!ShouldSetLocale()) {
      return;
    }

    ThreadLocaleState& state = GetThreadState();

    // Only set up locale once per thread
    if (!state.isInitialized) {
      locale_t currentLocale = uselocale((locale_t)0);

      // and only if thread is using global locale
      if (currentLocale == LC_GLOBAL_LOCALE) {
        state.threadLocale = newlocale(LC_ALL_MASK, "", (locale_t)0);
        if (state.threadLocale) {
          uselocale(state.threadLocale);
          state.isInitialized = true;
        }
      }
    }
  }

  ~LocaleGuard() {}

  LocaleGuard(const LocaleGuard&) = delete;
  LocaleGuard& operator=(const LocaleGuard&) = delete;
};

#else

// No-op implementation for Windows and when NODE_LIBCURL_NO_SETLOCALE is defined
class LocaleGuard {
 public:
  LocaleGuard() {}
  ~LocaleGuard() {}
  LocaleGuard(const LocaleGuard&) = delete;
  LocaleGuard& operator=(const LocaleGuard&) = delete;
};

#endif

#endif  // NODELIBCURL_LOCALEGUARD_H
