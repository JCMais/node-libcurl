#ifndef NOMINMAX
#define NOMINMAX
#endif

#include "curl/multi.h"

#include "macros.h"
#include "napi.h"
#include "uv.h"

#include <cassert>

/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#include "Curl.h"
#include "Easy.h"
#include "Http2PushFrameHeaders.h"
#include "LocaleGuard.h"
#include "Multi.h"

#include <cstring>
#include <iostream>
#include <string>
#include <vector>

// 85233 was allocated on Win64
#define MEMORY_PER_HANDLE 60000

namespace NodeLibcurl {

std::atomic<uint64_t> Multi::nextId = 0;

// Constructor
Multi::Multi(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Multi>(info), id(nextId++) {
  NODE_LIBCURL_DEBUG_LOG(this, "Multi::Constructor", "");
  Napi::Env env = info.Env();
  auto curl = env.GetInstanceData<Curl>();

#if NODE_LIBCURL_VER_GE(8, 17, 0)
  bool shouldUseNotificationsApi = true;
#else
  bool shouldUseNotificationsApi = false;
#endif

  if (info.Length() >= 1 && info[0].IsObject()) {
    Napi::Object options = info[0].As<Napi::Object>();
    if (options.Has("shouldUseNotificationsApi")) {
      Napi::Value value = options.Get("shouldUseNotificationsApi");
      if (value.IsBoolean()) {
        shouldUseNotificationsApi = value.As<Napi::Boolean>().Value();
      }
    }
  }

  // Initialize multi handle
  this->mh = curl_multi_init();
  if (!this->mh) {
    throw Napi::Error::New(env, "Failed to initialize multi handle");
  }

  // Set default options
  curl_multi_setopt(this->mh, CURLMOPT_SOCKETFUNCTION, Multi::HandleSocket);
  curl_multi_setopt(this->mh, CURLMOPT_SOCKETDATA, this);
  curl_multi_setopt(this->mh, CURLMOPT_TIMERFUNCTION, Multi::HandleTimeout);
  curl_multi_setopt(this->mh, CURLMOPT_TIMERDATA, this);

  uv_loop_t* loop = nullptr;
  auto napi_result = napi_get_uv_event_loop(env, &loop);
  if (napi_result != napi_ok) {
    throw Napi::Error::New(env, "Failed to get UV event loop.");
  }

  uv_timer_init(loop, &this->timeout);
  this->timeout.data = this;
  // We need to keep the reference alive for the duration of the timer.
  this->Ref();

  // Enable notification API if requested and supported
  if (shouldUseNotificationsApi) {
#if NODE_LIBCURL_VER_GE(8, 17, 0)
    // Enable notification callback
    curl_multi_setopt(this->mh, CURLMOPT_NOTIFYFUNCTION, Multi::NotifyCallback);
    curl_multi_setopt(this->mh, CURLMOPT_NOTIFYDATA, this);

    // Enable INFO_READ notifications
    CURLMcode code = curl_multi_notify_enable(this->mh, CURLMNOTIFY_INFO_READ);
    if (code == CURLM_OK) {
      this->useNotificationsApi = true;
      NODE_LIBCURL_DEBUG_LOG(this, "Multi::Constructor", "Notification API enabled");
    } else {
      NODE_LIBCURL_DEBUG_LOG(this, "Multi::Constructor",
                             "Failed to enable notifications, falling back to ProcessMessages");
    }
#else
    NODE_LIBCURL_DEBUG_LOG(this, "Multi::Constructor",
                           "shouldUseNotificationsApi enabled but compiled against "
                           "libcurl < 8.17, falling back to ProcessMessages");
#endif
  }

  napi_add_async_cleanup_hook(env, Multi::CleanupHookAsync, this, &removeHandle);

  curl->AdjustHandleMemory(CURL_HANDLE_TYPE_MULTI, 1);
}

void Multi::CleanupHookAsync(napi_async_cleanup_hook_handle handle, void* data) {
  Multi* multi = static_cast<Multi*>(data);
  NODE_LIBCURL_DEBUG_LOG(multi, "Multi::CleanupHookAsync", "");

  multi->CloseTimerAsync();
}

void Multi::CloseTimerAsync() {
  if (this->timerClosed) {
    return;
  }

  uv_handle_t* timeoutHandle = reinterpret_cast<uv_handle_t*>(&this->timeout);
  if (!uv_is_closing(timeoutHandle)) {
    NODE_LIBCURL_DEBUG_LOG(this, "Multi::CloseTimer", "closing timer handle");

    // Stop the timer if it was started; safe to call even if it wasn't.
    uv_timer_stop(&this->timeout);
    uv_close(timeoutHandle, [](uv_handle_t* handle) {
      uv_timer_t* timer = reinterpret_cast<uv_timer_t*>(handle);
      Multi* multi = static_cast<Multi*>(timer->data);
      napi_remove_async_cleanup_hook(multi->removeHandle);
      NODE_LIBCURL_DEBUG_LOG(multi, "Multi::CloseTimerAsync", "removed async cleanup hook");
      multi->Unref();
    });
    this->timerClosed = true;
  } else {
    NODE_LIBCURL_DEBUG_LOG(this, "Multi::CloseTimer", "timer handle is already closing");
  }
}

// Destructor
Multi::~Multi() {
  NODE_LIBCURL_DEBUG_LOG(this, "Multi::Destructor", "isOpen: " + std::to_string(this->isOpen));
  if (this->isOpen) {
    this->Dispose();
  }
}

void Multi::Dispose() {
  if (!this->isOpen) return;

  NODE_LIBCURL_DEBUG_LOG(this, "Multi::Dispose", "");

  this->isOpen = false;

  // no point on running the timer anymore
  uv_timer_stop(&this->timeout);

  auto curl = this->Env().GetInstanceData<Curl>();

  // Clear callbacks
  this->callbacks.clear();
  this->cbOnMessage.Reset();

  // Clean up multi handle
  if (this->mh) {
    CURLMcode code = curl_multi_cleanup(this->mh);
    assert(code == CURLM_OK);
    this->mh = nullptr;
  }

  curl->AdjustHandleMemory(CURL_HANDLE_TYPE_MULTI, -1);
}

// Debug logging methods removed - now using NODE_LIBCURL_DEBUG_LOG macros

void Multi::StopTimer() { uv_timer_stop(&this->timeout); }

// Initialize the class for export
Napi::Function Multi::Init(Napi::Env env, Napi::Object exports) {
  NODE_LIBCURL_DEBUG_LOG_STATIC(static_cast<napi_env>(env), "Multi::Init");

  Napi::Function func = DefineClass(
      env, "Multi",
      {// Instance methods
       InstanceMethod("setOpt", &Multi::SetOpt), InstanceMethod("addHandle", &Multi::AddHandle),
       InstanceMethod("removeHandle", &Multi::RemoveHandle),
       InstanceMethod("onMessage", &Multi::OnMessage), InstanceMethod("getCount", &Multi::GetCount),
       InstanceMethod("close", &Multi::Close),

       // Instance accessors
       InstanceAccessor("id", &Multi::GetterId, nullptr),

       // Static methods
       StaticMethod("strError", &Multi::StrError)});

  exports.Set("Multi", func);

  return func;
}

Napi::Value Multi::SetOpt(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw Napi::TypeError::New(env, "Multi handle is closed");
  }

  if (info.Length() < 2) {
    throw Napi::TypeError::New(env, "Wrong number of arguments");
  }

  Napi::Value opt = info[0];
  Napi::Value value = info[1];

  CURLMcode setOptRetCode = CURLM_UNKNOWN_OPTION;

  int optionId;

  // array of strings option
  if ((optionId = IsInsideCurlConstantStruct(curlMultiOptionNotImplemented, opt))) {
    throw Napi::TypeError::New(env,
                               "Unsupported option, probably because it's too complex to implement "
                               "using javascript or unecessary when using javascript.");
  } else if ((optionId = IsInsideCurlConstantStruct(curlMultiOptionStringArray, opt))) {
    if (value.IsNull()) {
      setOptRetCode = curl_multi_setopt(this->mh, static_cast<CURLMoption>(optionId), nullptr);

    } else {
      if (!value.IsArray()) {
        throw Napi::TypeError::New(env, "Option value must be an Array.");
      }

      Napi::Array array = value.As<Napi::Array>();
      uint32_t arrayLength = array.Length();
      std::vector<std::string> strings;
      std::vector<const char*> cStrings;

      for (uint32_t i = 0; i < arrayLength; ++i) {
        Napi::Value element = array.Get(i);

        if (!element.IsString()) {
          throw Napi::TypeError::New(env, "Option value must be an Array of Strings.");
        }

        strings.push_back(element.As<Napi::String>().Utf8Value());
        cStrings.push_back(strings.back().c_str());
      }

      cStrings.push_back(nullptr);

      setOptRetCode = curl_multi_setopt(this->mh, static_cast<CURLMoption>(optionId), &cStrings[0]);
    }

    // check if option is integer, and the value is correct
  } else if ((optionId = IsInsideCurlConstantStruct(curlMultiOptionInteger, opt))) {
    // If not an integer, throw error
    if (!value.IsNumber()) {
      throw Napi::TypeError::New(env, "Option value must be an integer.");
    }

    int32_t val = value.As<Napi::Number>().Int32Value();

    setOptRetCode = curl_multi_setopt(this->mh, static_cast<CURLMoption>(optionId), val);
  } else if ((optionId = IsInsideCurlConstantStruct(curlMultiOptionFunction, opt))) {
    bool isNull = value.IsNull();

    if (!value.IsFunction() && !isNull) {
      throw Napi::TypeError::New(env, "Option value must be null or a function.");
    }

    switch (optionId) {
#if NODE_LIBCURL_VER_GE(7, 44, 0)
      case CURLMOPT_PUSHFUNCTION:

        if (isNull) {
          this->callbacks.erase(CURLMOPT_PUSHFUNCTION);

          curl_multi_setopt(this->mh, CURLMOPT_PUSHDATA, nullptr);
          setOptRetCode = curl_multi_setopt(this->mh, CURLMOPT_PUSHFUNCTION, nullptr);
        } else {
          this->callbacks[CURLMOPT_PUSHFUNCTION] = Napi::Persistent(value.As<Napi::Function>());

          curl_multi_setopt(this->mh, CURLMOPT_PUSHDATA, this);
          setOptRetCode = curl_multi_setopt(this->mh, CURLMOPT_PUSHFUNCTION, Multi::CbPushFunction);
        }

        break;
#endif
    }
  }

  return Napi::Number::New(env, setOptRetCode);
}

Napi::Value Multi::AddHandle(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  auto curl = env.GetInstanceData<Curl>();

  if (!this->isOpen) {
    throw Napi::TypeError::New(env, "Multi handle is closed");
  }

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "Wrong number of arguments");
  }

  if (!info[0].IsObject() ||
      !info[0].As<Napi::Object>().InstanceOf(curl->EasyConstructor.Value())) {
    throw Napi::TypeError::New(env, "Argument must be an Easy instance");
  }

  Napi::Object obj = info[0].As<Napi::Object>();
  Easy* easy = Napi::ObjectWrap<Easy>::Unwrap(obj);

  if (!easy || !easy->isOpen) {
    throw Napi::TypeError::New(env, "Easy handle is closed or invalid");
  }

  if (easy->isInsideMultiHandle) {
    throw Napi::TypeError::New(env, "Easy handle is already inside a multi handle");
  }

  NODE_LIBCURL_DEBUG_LOG(this, "Multi::AddHandle", "adding handle " + std::to_string(easy->id));

  // reset callback error in case it is set
  easy->callbackError.Reset();

  // Check comment on node_libcurl.cc
  LocaleGuard localeGuard;
  CURLMcode code = curl_multi_add_handle(this->mh, easy->ch);

  if (code != CURLM_OK) {
    throw Napi::TypeError::New(env, "Could not add easy handle to the multi handle.");
  }

  ++this->amountOfHandles;
  easy->isInsideMultiHandle = true;

  return Napi::Number::New(env, static_cast<int>(code));
}

Napi::Value Multi::RemoveHandle(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  auto curl = env.GetInstanceData<Curl>();

  if (!this->isOpen) {
    throw Napi::TypeError::New(env, "Multi handle is closed");
  }

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "Wrong number of arguments");
  }

  if (!info[0].IsObject() ||
      !info[0].As<Napi::Object>().InstanceOf(curl->EasyConstructor.Value())) {
    throw Napi::TypeError::New(env, "Argument must be an Easy instance");
  }

  Napi::Object obj = info[0].As<Napi::Object>();
  Easy* easy = Napi::ObjectWrap<Easy>::Unwrap(obj);

  if (!easy || !easy->isOpen) {
    throw Napi::TypeError::New(env, "Easy handle is closed or invalid");
  }

  NODE_LIBCURL_DEBUG_LOG(this, "Multi::RemoveHandle",
                         "removing handle " + std::to_string(easy->id));

  CURLMcode code = curl_multi_remove_handle(this->mh, easy->ch);

  if (code != CURLM_OK) {
    throw Napi::TypeError::New(env, "Could not remove easy handle from multi handle.");
  }

  --this->amountOfHandles;
  easy->isInsideMultiHandle = false;

  return Napi::Number::New(env, static_cast<int>(code));
}

Napi::Value Multi::OnMessage(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!info.Length()) {
    throw Napi::TypeError::New(env,
                               "You must specify the callback function. If you want to remove the "
                               "current one you can pass null.");
  }

  Napi::Value arg = info[0];
  bool isNull = arg.IsNull();

  if (!arg.IsFunction() && !isNull) {
    throw Napi::TypeError::New(env,
                               "Argument must be a Function. If you want to remove the current one "
                               "you can pass null.");
  }

  if (isNull) {
    this->cbOnMessage.Reset();
  } else {
    this->cbOnMessage = Napi::Persistent(arg.As<Napi::Function>());
  }

  return info.This();
}

Napi::Value Multi::GetCount(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw Napi::TypeError::New(env, "Multi handle is closed");
  }

  return Napi::Number::New(env, this->amountOfHandles);
}

Napi::Value Multi::Close(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw Napi::TypeError::New(env, "Multi handle already closed.");
  }

  NODE_LIBCURL_DEBUG_LOG(this, "Multi::Close", "");

  this->Dispose();

  return env.Undefined();
}

Napi::Value Multi::GetterId(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), this->id);
}

Napi::Value Multi::StrError(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsNumber()) {
    throw Napi::TypeError::New(env, "Argument must be an error code");
  }

  int32_t errorCode = info[0].As<Napi::Number>().Int32Value();
  const char* errorMsg = curl_multi_strerror(static_cast<CURLMcode>(errorCode));

  return Napi::String::New(env, errorMsg);
}

void Multi::ProcessMessages() {
  NODE_LIBCURL_DEBUG_LOG(this, "Multi::ProcessMessages", "isOpen: " + std::to_string(this->isOpen));
  if (!this->isOpen) return;

  int msgsLeft = 0;
  CURLMsg* msg = nullptr;

  while (this->isOpen && (msg = curl_multi_info_read(this->mh, &msgsLeft))) {
    NODE_LIBCURL_DEBUG_LOG(
        this, "Multi::ProcessMessages",
        "msg->msg: " + std::to_string(msg->msg) + " isOpen: " + std::to_string(this->isOpen));
    if (msg->msg == CURLMSG_DONE) {
      CURL* easy = msg->easy_handle;
      CURLcode result = msg->data.result;

      this->CallOnMessageCallback(easy, result);
    }
  }
}

void Multi::CallOnMessageCallback(CURL* easy, CURLcode statusCode) {
  if (this->cbOnMessage.IsEmpty()) return;
  if (!this->isOpen) return;

  Napi::Env env = Env();
  Napi::HandleScope scope(env);

  // From https://curl.haxx.se/libcurl/c/CURLINFO_PRIVATE.html
  // > Please note that for internal reasons, the value is returned as a char
  // pointer, although effectively being a 'void *'.
  char* ptr = nullptr;
  CURLcode code = curl_easy_getinfo(easy, CURLINFO_PRIVATE, &ptr);

  if (code != CURLE_OK) {
    Napi::Error::New(env, "Error retrieving current handle instance.").ThrowAsJavaScriptException();
    return;
  }

  assert(ptr != nullptr && "Invalid handle returned from CURLINFO_PRIVATE.");
  Easy* easyObj = reinterpret_cast<Easy*>(ptr);

  bool hasError = !easyObj->callbackError.IsEmpty();

  Napi::Function callback = this->cbOnMessage.Value();

  // Create arguments: error (null or Error object), Easy instance
  Napi::Value error = env.Null();
  Napi::Number errorCode = Napi::Number::New(
      env, static_cast<int32_t>(statusCode == CURLE_OK && hasError ? CURLE_ABORTED_BY_CALLBACK
                                                                   : statusCode));

  if (statusCode != CURLE_OK || hasError) {
    error = hasError ? easyObj->callbackError.Value()
                     : Napi::Error::New(env, curl_easy_strerror(statusCode)).Value();
  }

  NODE_LIBCURL_DEBUG_LOG(this, "Multi::CallOnMessageCallback",
                         "statusCode: " + std::to_string(statusCode));

  try {
    callback.Call(this->Value(), {error, easyObj->Value(), errorCode});

  } catch (const Napi::Error&) {
    // ignore any and all errors
  }

  // Some re-entrant calls may have closed the Multi handle, it is not safe to continue
  if (!this->isOpen) return;
}

// Socket context management
Multi::CurlSocketContext* Multi::CreateCurlSocketContext(curl_socket_t sockfd,
                                                         Multi* multi) noexcept {
  auto it = multi->socketContextMap.find(sockfd);

  // calling uv_poll_init_socket multiple times for the same socket will return UV_EEXIST
  // which would cause libcurl to be stuck. This happens because libcurl is calling the Socket
  // callback with an empty socketp for an existing socket.
  // This only happens with libcurl <= 7.81, but we are keeping it for all
  // versions.
  if (it != multi->socketContextMap.end()) {
    NODE_LIBCURL_DEBUG_LOG(multi, "Multi::CreateCurlSocketContext",
                           "Socket context already exists for socket: " + std::to_string(sockfd));
    return it->second;
  }

  CurlSocketContext* ctx = new (std::nothrow) CurlSocketContext();
  // not enough memory to allocate the ctx
  assert(ctx && "Multi::CreateCurlSocketContext - Failed to create socket context");

  ctx->sockfd = sockfd;
  ctx->multi = multi;

  uv_loop_t* loop = nullptr;
  auto napi_result = napi_get_uv_event_loop(multi->Env(), &loop);
  assert(napi_result == napi_ok && "Multi::CreateCurlSocketContext - Failed to get UV event loop");

  // uv_poll simply watches file descriptors using the operating system
  // notification mechanism
  //   whenever the OS notices a change of state in file descriptors being
  //   polled, libuv will invoke the associated callback.
  int result = uv_poll_init_socket(loop, &ctx->pollHandle, sockfd);
  if (result != 0) {
    auto errorMessage = "Multi::CreateCurlSocketContext Failed to initialize socket: " +
                        std::string(uv_err_name(result));
    std::cerr << errorMessage << std::endl;
    // TODO(jonathan): this fails on libcurl <= 7.81, works on >= 7.82
    // looks like there is a extra call to SocketFunction to delete a socket with socketp 0 on
    // <=7.81
    assert(false &&
           "Multi::CreateCurlSocketContext - failed to initialize socket - See message above");
  }

  NODE_LIBCURL_DEBUG_LOG(multi, "Multi::CreateCurlSocketContext",
                         "Initialized socket: " + std::to_string(sockfd));

  ctx->pollHandle.data = ctx;
  multi->socketContextMap[sockfd] = ctx;

  return ctx;
}

void Multi::DestroyCurlSocketContext(CurlSocketContext* ctx) {
  auto handle = reinterpret_cast<uv_handle_t*>(&ctx->pollHandle);

  auto it = ctx->multi->socketContextMap.find(ctx->sockfd);
  if (it != ctx->multi->socketContextMap.end()) {
    ctx->multi->socketContextMap.erase(it);
  }

  if (!uv_is_closing(handle)) {
    uv_close(handle, [](uv_handle_t* handle) {
      auto ctx = static_cast<CurlSocketContext*>(handle->data);
      NODE_LIBCURL_DEBUG_LOG(ctx->multi, "Multi::DestroyCurlSocketContext",
                             "Closed socket context for socket: " + std::to_string(ctx->sockfd));
      delete ctx;
    });
  }
}

// libcurl callback implementations
int Multi::HandleSocket(CURL* easy, curl_socket_t s, int action, void* userp, void* socketp) {
  CurlSocketContext* ctx = nullptr;
  Multi* obj = static_cast<Multi*>(userp);

  if (action == CURL_POLL_IN || action == CURL_POLL_OUT || action == CURL_POLL_INOUT ||
      action == CURL_POLL_NONE) {
    // create ctx if it doesn't exists and assign it to the current socket,
    if (socketp) {
      ctx = static_cast<Multi::CurlSocketContext*>(socketp);
    } else {
      ctx = Multi::CreateCurlSocketContext(s, obj);
    }

    assert(ctx && "Multi::HandleSocket - Failed to create socket context");

    curl_multi_assign(obj->mh, s, static_cast<void*>(ctx));

    // set event based on the current action
    int events = 0;

    if (action != CURL_POLL_IN) events |= UV_WRITABLE;
    if (action != CURL_POLL_OUT) events |= UV_READABLE;

    NODE_LIBCURL_DEBUG_LOG(obj, "Multi::HandleSocket",
                           "Starting poll for socket: " + std::to_string(s) +
                               " with events: " + std::to_string(events));
    return uv_poll_start(&ctx->pollHandle, events, Multi::OnSocket);
  }

  if (action == CURL_POLL_REMOVE) {
    if (socketp) {
      ctx = static_cast<CurlSocketContext*>(socketp);

      NODE_LIBCURL_DEBUG_LOG(obj, "Multi::HandleSocket",
                             "Stopping poll for socket: " + std::to_string(s));

      uv_poll_stop(&ctx->pollHandle);

      Multi::DestroyCurlSocketContext(ctx);
      curl_multi_assign(obj->mh, s, nullptr);
    }

    return 0;
  }

  // see this: https://github.com/curl/curl/issues/14860#issuecomment-2452663239
  return -1;
}
// This function will be called when the timeout value changes from libcurl.
// The timeout value is at what latest time the application should call one of
// the "performing" functions of the multi interface (curl_multi_socket_action
// and curl_multi_perform) - to allow libcurl to keep timeouts and retries etc
// to work.
int Multi::HandleTimeout(CURLM* multi,
                         long timeoutMs,  // NOLINT(runtime/int)
                         void* userp) {
  Multi* obj = static_cast<Multi*>(userp);

  if (obj->timerClosed) {
    return 0;
  }

  if (timeoutMs < 0) {
    int uvStop = uv_timer_stop(&obj->timeout);
    return uvStop;
  }

  // we should not call libcurl functions directly from this callback
  //  see https://github.com/curl/curl/issues/3537
  if (timeoutMs >= 0) {
    return uv_timer_start(&obj->timeout, Multi::OnTimeout, timeoutMs, 0);
  }

  return 0;
}

int Multi::CbPushFunction(CURL* parent, CURL* child, size_t numberOfHeaders,
                          struct curl_pushheaders* headers, void* userPtr) {
  // Note:
  //  We cannot throw js errors inside this callback
  //   as there is no way to signal libcurl to mark this request as failed
  //   and stop calling this callback for this connection (in case there are more pushes)
  //   this means that we must not rethrow errors we catch from user land.
  //   doing so would cause the whole library code to fall apart as it would not be safe to
  //   use other v8 objects.
  int returnValue = CURL_PUSH_DENY;

  Multi* obj = static_cast<Multi*>(userPtr);
  assert(obj);
  assert(obj->isOpen);

  auto it = obj->callbacks.find(CURLMOPT_PUSHFUNCTION);
  assert(it != obj->callbacks.end() && "PUSHFUNCTION callback not set.");

  if (it->second.IsEmpty()) {
    return CURL_PUSH_DENY;
  }

  char* parentEasyPtr = nullptr;
  CURLcode code = curl_easy_getinfo(parent, CURLINFO_PRIVATE, &parentEasyPtr);
  assert(code == CURLE_OK &&
         "It was not possible to retrieve the current Easy instance from the libcurl easy handle");
  assert(parentEasyPtr != nullptr && "Invalid handle returned from CURLINFO_PRIVATE.");

  Easy* parentEasyObj = reinterpret_cast<Easy*>(parentEasyPtr);
  assert(parentEasyObj->isOpen &&
         "The Easy instance doing the current request was closed prematurely");

  Napi::Env env = it->second.Env();
  Napi::HandleScope scope(env);
  auto curl = env.GetInstanceData<Curl>();

  try {
    Napi::Object parentEasyJsObj = parentEasyObj->Value();
    Napi::Object childEasyJsObj = Easy::FromCURLHandle(env, child);

    auto headersExternal = Napi::External<curl_pushheaders>::New(env, headers);
    headersExternal.TypeTag(&HTTP2_PUSH_FRAME_HEADERS_TYPE_TAG);

    auto http2PushFrameJsObj = curl->Http2PushFrameHeadersConstructor.New({
        headersExternal,
        Napi::Number::New(env, numberOfHeaders),
    });

    Napi::Function callback = it->second.Value();
    // TODO(jonathan, migration): capture this when perform is called or similar (either on Easy or
    // Multi)
    Napi::AsyncContext asyncContext(env, "Multi::CbPushFunction");

    Napi::Value returnValueCallback = callback.MakeCallback(obj->Value(),
                                                            {
                                                                parentEasyJsObj,
                                                                childEasyJsObj,
                                                                http2PushFrameJsObj,
                                                            },
                                                            asyncContext);

    if (!returnValueCallback.IsEmpty() && returnValueCallback.IsNumber()) {
      returnValue = returnValueCallback.As<Napi::Number>().Int32Value();
    }
  } catch (const Napi::Error&) {
    // See the note at the top of this function, we must not rethrow this error.
    // Show some Debug message?
    return returnValue;
  }

  return returnValue;
}

#if NODE_LIBCURL_VER_GE(8, 17, 0)
void Multi::NotifyCallback(CURLM* multi, unsigned int notification, CURL* easy, void* notifyp) {
  Multi* obj = static_cast<Multi*>(notifyp);
  assert(obj && "Multi::NotifyCallback - Invalid Multi instance");

  NODE_LIBCURL_DEBUG_LOG(obj, "Multi::NotifyCallback",
                         "notification: " + std::to_string(notification));

  if (notification == CURLMNOTIFY_INFO_READ) {
    obj->ProcessMessages();
  }
}
#endif

// function called when the previous timeout set reaches 0
UV_TIMER_CB(Multi::OnTimeout) {
  Multi* obj = static_cast<Multi*>(timer->data);

  NODE_LIBCURL_DEBUG_LOG(obj, "Multi::OnTimeout", "");

  // Check comment on node_libcurl.cc
  LocaleGuard localeGuard;
  CURLMcode code = curl_multi_socket_action(obj->mh, CURL_SOCKET_TIMEOUT, 0, &obj->runningHandles);

  assert((CURLM_OK == code || true) &&
         "Calling curl_multi_socket_action from within Multi::OnTimeout failed. This is possibly a "
         "bug on node-libcurl or libcurl itself. Please report this issue to node-libcurl.");

  // When notifications are enabled, libcurl will call our NotifyCallback when needed
  if (!obj->useNotificationsApi) {
    obj->ProcessMessages();
  }
}

void Multi::OnSocket(uv_poll_t* handle, int status, int events) {
  int flags = 0;

  CURLMcode code;

  if (status < 0) flags = CURL_CSELECT_ERR;
  if (events & UV_READABLE) flags |= CURL_CSELECT_IN;
  if (events & UV_WRITABLE) flags |= CURL_CSELECT_OUT;

  Multi::CurlSocketContext* ctx = static_cast<Multi::CurlSocketContext*>(handle->data);

  NODE_LIBCURL_DEBUG_LOG(ctx->multi, "Multi::OnSocket", "events: " + std::to_string(events));

  // Check comment on node_libcurl.cc
  LocaleGuard localeGuard;
  // Before version 7.20.0: If you receive CURLM_CALL_MULTI_PERFORM, this
  // basically means that you should call curl_multi_socket_action again
  // before you wait for more actions on libcurl's sockets.
  // You don't have to do it immediately, but the return code means that
  // libcurl may have more data available to return or that there may be more data
  // to send off before it is "satisfied".
  do {
    code =
        curl_multi_socket_action(ctx->multi->mh, ctx->sockfd, flags, &ctx->multi->runningHandles);
  } while (code == CURLM_CALL_MULTI_PERFORM);

  if (code != CURLM_OK) {
    auto env = ctx->multi->Env();
    auto scope = Napi::HandleScope(env);
    std::string errorMsg =
        std::string("curl_multi_socket_action failed. Reason: ") + curl_multi_strerror(code);

    Napi::Error::New(ctx->multi->Env(), errorMsg).ThrowAsJavaScriptException();
    return;
  }

  // When notifications are enabled, libcurl will call our NotifyCallback when needed
  if (!ctx->multi->useNotificationsApi) {
    ctx->multi->ProcessMessages();
  }
}

}  // namespace NodeLibcurl
