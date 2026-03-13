/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include "macros.h"

#include <curl/curl.h>

#include <atomic>
#include <napi.h>

namespace NodeLibcurl {

// Forward declaration
class Easy;

class Share : public Napi::ObjectWrap<Share> {
  friend class Easy;

 public:
  // Constructor for JS object creation
  static Napi::Function Init(Napi::Env env, Napi::Object exports);
  Share(const Napi::CallbackInfo& info);
  ~Share();

  // Instance methods
  Napi::Value SetOpt(const Napi::CallbackInfo& info);
  Napi::Value Close(const Napi::CallbackInfo& info);

  // Static methods
  static Napi::Value StrError(const Napi::CallbackInfo& info);

  // Debug support
  uint64_t GetDebugId() const { return id; }

 private:
  // Private methods
  void Dispose();

  // Members
  CURLSH* sh;
  bool isOpen;
  uint64_t id;

  // Static members
  static std::atomic<uint64_t> nextId;

  // Prevent copying
  Share(const Share& that) = delete;
  Share& operator=(const Share& that) = delete;
};

}  // namespace NodeLibcurl
