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
#include <map>
#include <memory>
#include <napi.h>
#include <uv.h>

namespace NodeLibcurl {

// Forward declaration
class Easy;

class Multi : public Napi::ObjectWrap<Multi> {
 public:
  // Constructor and destructor
  Multi(const Napi::CallbackInfo& info);
  ~Multi();

  // Static methods for JS class initialization
  static Napi::Function Init(Napi::Env env, Napi::Object exports);

  // Instance methods exposed to JS
  Napi::Value SetOpt(const Napi::CallbackInfo& info);
  Napi::Value AddHandle(const Napi::CallbackInfo& info);
  Napi::Value RemoveHandle(const Napi::CallbackInfo& info);
  Napi::Value OnMessage(const Napi::CallbackInfo& info);
  Napi::Value GetCount(const Napi::CallbackInfo& info);
  Napi::Value Close(const Napi::CallbackInfo& info);
  Napi::Value GetterId(const Napi::CallbackInfo& info);

  // Static methods
  static Napi::Value StrError(const Napi::CallbackInfo& info);

  // Debug support
  uint64_t GetDebugId() const { return id; }

  // Public members
  CURLM* mh;
  bool isOpen = true;
  int amountOfHandles = 0;
  int runningHandles = 0;

 private:
  // Context for socket operations
  struct CurlSocketContext {
    uv_poll_t pollHandle;
    curl_socket_t sockfd;
    Multi* multi;
  };

  // Private methods
  void StopTimer();
  void CloseTimerAsync();
  void Dispose();
  void ProcessMessages();
  void CallOnMessageCallback(CURL* easy, CURLcode statusCode);

  // Socket context helpers
  static CurlSocketContext* CreateCurlSocketContext(curl_socket_t sockfd, Multi* multi) noexcept;
  static void DestroyCurlSocketContext(CurlSocketContext* ctx);

  // Callback management
  typedef std::map<CURLMoption, Napi::FunctionReference> CallbacksMap;
  CallbacksMap callbacks;
  Napi::FunctionReference cbOnMessage;

  // Timer for timeout handling
  uv_timer_t timeout;
  bool timerClosed = false;
  napi_async_cleanup_hook_handle removeHandle;
  uint64_t id;

  // Static members
  static std::atomic<uint64_t> nextId;

  // libcurl multi callbacks
  static int HandleSocket(CURL* easy, curl_socket_t s, int action, void* userp, void* socketp);
  static int HandleTimeout(CURLM* multi, long timeoutMs, void* userp);
  static int CbPushFunction(CURL* parent, CURL* child, size_t numberOfHeaders,
                            struct curl_pushheaders* headers, void* userPtr);

  // libuv event callbacks
  static void OnTimeout(uv_timer_t* timer);
  static void OnSocket(uv_poll_t* handle, int status, int events);
  static void CleanupHook(void* data);
  static void CleanupHookAsync(napi_async_cleanup_hook_handle handle, void* data);

  // Debug logging removed - now using NODE_LIBCURL_DEBUG_LOG macros

  // Prevent copying
  Multi(const Multi& that) = delete;
  Multi& operator=(const Multi& that) = delete;
};

}  // namespace NodeLibcurl
