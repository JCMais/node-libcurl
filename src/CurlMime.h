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

namespace NodeLibcurl {

// Forward declarations
class Easy;
class CurlMime;

/**
 * Wrapper for curl_mimepart
 * Represents a single part in a MIME structure
 */
class CurlMimePart : public Napi::ObjectWrap<CurlMimePart> {
 public:
  CurlMimePart(const Napi::CallbackInfo& info);
  ~CurlMimePart();

  static Napi::Function Init(Napi::Env env, Napi::Object exports);

  // Basic MIME part methods (Phase 1)
  Napi::Value SetName(const Napi::CallbackInfo& info);
  Napi::Value SetData(const Napi::CallbackInfo& info);
  Napi::Value SetFiledata(const Napi::CallbackInfo& info);
  Napi::Value SetType(const Napi::CallbackInfo& info);
  Napi::Value SetFilename(const Napi::CallbackInfo& info);

  // Advanced methods (Phase 2)
  Napi::Value SetEncoder(const Napi::CallbackInfo& info);
  Napi::Value SetHeaders(const Napi::CallbackInfo& info);
  Napi::Value SetSubparts(const Napi::CallbackInfo& info);

  // Callback method (Phase 3)
  Napi::Value SetDataCallback(const Napi::CallbackInfo& info);

  // Public members
  curl_mimepart* part;  // Owned by parent CurlMime, do not free directly

  // Callback storage for Phase 3
  Napi::FunctionReference readCallback;
  Napi::FunctionReference seekCallback;
  Napi::FunctionReference freeCallback;

  // Self-reference to prevent GC while callbacks are active
  Napi::ObjectReference selfRef;

 private:
  // Private copy constructor and assignment operator to prevent copying
  CurlMimePart(const CurlMimePart& that) = delete;
  CurlMimePart& operator=(const CurlMimePart& that) = delete;

  // Static callback trampolines for curl_mime_data_cb (Phase 3)
  static size_t StaticReadCallback(char* buffer, size_t size, size_t nitems, void* userdata);
  static int StaticSeekCallback(void* userdata, curl_off_t offset, int origin);
  static void StaticFreeCallback(void* userdata);
};

/**
 * Wrapper for curl_mime
 * Represents a MIME structure for multipart form data
 */
class CurlMime : public Napi::ObjectWrap<CurlMime> {
 public:
  CurlMime(const Napi::CallbackInfo& info);
  ~CurlMime();

  static Napi::Function Init(Napi::Env env, Napi::Object exports);

  // Instance methods
  Napi::Value AddPart(const Napi::CallbackInfo& info);

  // Public members
  curl_mime* mime;
  CURL* easyHandle;  // Reference to parent Easy handle for curl_mime_init

 private:
  // Private copy constructor and assignment operator to prevent copying
  CurlMime(const CurlMime& that) = delete;
  CurlMime& operator=(const CurlMime& that) = delete;
};

}  // namespace NodeLibcurl
