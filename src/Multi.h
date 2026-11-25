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

  // Runs from node_api_post_finalizer, outside the GC, so Dispose can call
  // Node-API functions that are not allowed inside a GC finalizer.
  void Finalize(Napi::Env env) override;

  // Static methods for JS class initialization
  static Napi::Function Init(Napi::Env env, Napi::Object exports);

  // Instance methods exposed to JS
  Napi::Value SetOpt(const Napi::CallbackInfo& info);
  Napi::Value AddHandle(const Napi::CallbackInfo& info);
  Napi::Value RemoveHandle(const Napi::CallbackInfo& info);
  Napi::Value Perform(const Napi::CallbackInfo& info);
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
  void CloseTimerAsync();
  void Dispose(bool rejectPending = false);
  void CleanupMultiHandle();
  void TrackHandle(Easy* easy);
  void ResolvePushOwnership();
  CURLMcode SocketAction(curl_socket_t sockfd, int flags);
  void ProcessMessages();
  void CallOnMessageCallback(CURL* easy, CURLcode statusCode);

  // Socket context helpers
  static CurlSocketContext* CreateCurlSocketContext(curl_socket_t sockfd, Multi* multi) noexcept;
  static void DestroyCurlSocketContext(CurlSocketContext* ctx);

  // Callback management
  typedef std::map<CURLMoption, Napi::FunctionReference> CallbacksMap;
  CallbacksMap callbacks;
  Napi::FunctionReference cbOnMessage;

  // Promise-based perform tracking
  std::map<CURL*, std::shared_ptr<Napi::Promise::Deferred>> handlePromiseMap;

  // Keep Easy wrappers alive until their handles are removed.
  std::map<CURL*, Easy*> attachedHandles;
  std::map<CURL*, Easy*> pendingPushes;
  bool rejectPendingOnClose = false;

  // Timer for timeout handling
  uv_timer_t timeout;
  bool timerClosed = false;
  napi_async_cleanup_hook_handle removeHandle;
  uint64_t id;

  // Both libuv callbacks below (OnSocket / OnTimeout) call into JS from outside
  // any JS context, so they need a callback scope. One long-lived async context
  // per Multi is enough, and avoids a napi_async_init per socket event.
  // Shared so an open scope can keep it alive across close() (see SocketAction).
  std::shared_ptr<Napi::AsyncContext> asyncContext;

  // libcurl rejects curl_multi_cleanup with CURLM_RECURSIVE_API_CALL while
  // curl_multi_socket_action is on the stack (for example, close() called from
  // onMessage with the notifications API, or from an Easy callback). Dispose
  // then sets cleanupPending, and SocketAction runs the cleanup once libcurl
  // has returned.
  bool isInsideSocketAction = false;
  bool cleanupPending = false;

  std::map<curl_socket_t, CurlSocketContext*> socketContextMap;

  // Notification API support (libcurl >= 8.17.0)
  bool useNotificationsApi = false;

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

#if NODE_LIBCURL_VER_GE(8, 17, 0)
  // libcurl notification callback (available since 8.17.0)
  static void NotifyCallback(CURLM* multi, unsigned int notification, CURL* easy, void* notifyp);
#endif

  // Debug logging removed - now using NODE_LIBCURL_DEBUG_LOG macros

  // Prevent copying
  Multi(const Multi& that) = delete;
  Multi& operator=(const Multi& that) = delete;
};

}  // namespace NodeLibcurl
