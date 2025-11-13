#ifndef NOMINMAX
#define NOMINMAX
#endif

#include "curl/curl.h"
#include "napi.h"

#include <cassert>

/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#include "Curl.h"
#include "CurlError.h"
#include "CurlHttpPost.h"
#include "CurlMime.h"
#include "Easy.h"
#include "LocaleGuard.h"
#include "Share.h"
#include "macros.h"

#include <algorithm>
#include <cstring>
#include <iostream>

// 36055 was allocated on Win64
#define MEMORY_PER_HANDLE 30000

#define TIME_IN_THE_FUTURE "30001231 23:59:59"

namespace NodeLibcurl {

// Static member initialization
std::atomic<uint64_t> Easy::nextId = 0;

const napi_type_tag EASY_TYPE_TAG = {
    // this is basically a
    0xf641cc92779c4526, 0xaca73000a471ece6};

// ToFree class for memory management
class Easy::ToFree {
 public:
  std::vector<std::vector<char>> str;
  std::vector<curl_slist*> slist;
  std::vector<curl_mime*> mime;
  std::vector<std::unique_ptr<CurlHttpPost>> post;

  ~ToFree() {
    for (auto& list : slist) {
      if (list) curl_slist_free_all(list);
    }
    for (auto& m : mime) {
      if (m) curl_mime_free(m);
    }
  }
};

// Constructor
Easy::Easy(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<Easy>(info), id(nextId++), toFree(std::make_shared<ToFree>()) {
  NODE_LIBCURL_DEBUG_LOG(this, "Easy::Constructor", "");
  Napi::Env env = info.Env();

  Curl* curl = env.GetInstanceData<Curl>();

  bool isFromDuplicate = false;
  // Check constructor arguments to determine initialization mode
  if (info.Length() > 0 && !info[0].IsUndefined()) {
    isFromDuplicate = true;
    // Case 1: Copy constructor from another Easy instance
    if (info[0].IsObject()) {
      auto easyConstructor = curl->EasyConstructor.Value();
      auto possiblyAnotherEasy = info[0].As<Napi::Object>();

      if (!possiblyAnotherEasy.InstanceOf(easyConstructor)) {
        throw CurlError::New(env, "Argument must be an instance of an Easy handle.",
                             CURLE_BAD_FUNCTION_ARGUMENT);
      }

      Easy* orig = Easy::Unwrap(possiblyAnotherEasy);

      // Duplicate the handle
      this->ch = curl_easy_duphandle(orig->ch);
      assert(this->ch && "Failed to duplicate libcurl easy handle");

      this->CopyOtherData(orig);

    } else if (info[0].IsExternal()) {
      // Case 2: From an external CURL handle (used internally by Multi)
      auto maybeHandleExternal = info[0].As<Napi::External<CURL>>();

      if (!maybeHandleExternal.CheckTypeTag(&EASY_TYPE_TAG)) {
        throw CurlError::New(env, "Argument must be an external CURL handle.",
                             CURLE_BAD_FUNCTION_ARGUMENT);
      }

      CURL* curlEasyHandle = maybeHandleExternal.Data();
      this->ch = curlEasyHandle;

      // Get the original Easy instance from the handle's private data
      char* origEasyPtr = nullptr;
      CURLcode code = curl_easy_getinfo(curlEasyHandle, CURLINFO_PRIVATE, &origEasyPtr);

      if (code == CURLE_OK && origEasyPtr != nullptr) {
        Easy* orig = reinterpret_cast<Easy*>(origEasyPtr);
        assert(orig && "Failed to get original Easy instance from the handle's private data");
        this->CopyOtherData(orig);
      }

    } else {
      throw CurlError::New(
          env, "Argument must be an instance of an Easy handle or external CURL handle.",
          CURLE_BAD_FUNCTION_ARGUMENT);
    }
  } else {
    // Case 3: Default constructor - create new handle
    this->ch = curl_easy_init();
    if (!this->ch) {
      throw CurlError::New(env, "Could not initialize libcurl easy handle.", CURLE_FAILED_INIT);
    }
  }

  curl->AdjustHandleMemory(CURL_HANDLE_TYPE_EASY, 1);

  // Common setup for all constructor modes
  this->ResetRequiredHandleOptions(isFromDuplicate);
}

// Destructor
Easy::~Easy() {
  NODE_LIBCURL_DEBUG_LOG(this, "Easy::Destructor", "isOpen: " + std::to_string(this->isOpen));
  if (this->isOpen) {
    this->Dispose();
  }
}

// Dispose persistent objects and references stored during the life of this obj.
void Easy::Dispose() {
  NODE_LIBCURL_DEBUG_LOG(this, "Easy::Dispose", "");
  // this call should only be done when the handle is still open
  assert(this->isOpen && "This handle was already closed.");
  assert(this->ch && "The curl handle ran away.");

  curl_easy_cleanup(this->ch);
  this->ch = nullptr;
  this->isOpen = false;

  const auto curl = this->Env().GetInstanceData<Curl>();
  curl->AdjustHandleMemory(CURL_HANDLE_TYPE_EASY, -1);

  if (this->isMonitoringSockets) {
    this->UnmonitorSockets();
  }

  this->DisposeInternalData();
}

// This does not dispose the handle, just the internal data, keeping the handle alive.
void Easy::DisposeInternalData() {
  this->callbacks.clear();
  this->hstsReadCache.clear();

  this->cbOnSocketEvent.Reset();
  this->callbackError.Reset();

  // not clear! This is shared with other handles, so we cannot clear it.
  this->cbOnSocketEventAsyncContext.reset();
  this->toFree.reset();

  this->isCbProgressAlreadyAborted = false;
  this->readDataFileDescriptor = -1;
  this->readDataOffset = -1;
}

void Easy::ResetRequiredHandleOptions(bool isFromDuplicate) {
  curl_easy_setopt(this->ch, CURLOPT_PRIVATE, this);  // to be used with Multi handle

  curl_easy_setopt(this->ch, CURLOPT_HEADERFUNCTION, Easy::HeaderFunction);
  curl_easy_setopt(this->ch, CURLOPT_HEADERDATA, this);

  curl_easy_setopt(this->ch, CURLOPT_READFUNCTION, Easy::ReadFunction);
  curl_easy_setopt(this->ch, CURLOPT_READDATA, this);

  curl_easy_setopt(this->ch, CURLOPT_SEEKFUNCTION, Easy::SeekFunction);
  curl_easy_setopt(this->ch, CURLOPT_SEEKDATA, this);

  curl_easy_setopt(this->ch, CURLOPT_WRITEFUNCTION, Easy::WriteFunction);
  curl_easy_setopt(this->ch, CURLOPT_WRITEDATA, this);

  // make sure to reset the *DATA options when duplicating a handle. We are
  // setting all of them, even if they are not set.
  if (isFromDuplicate) {
    curl_easy_setopt(this->ch, CURLOPT_CHUNK_DATA, this);
    curl_easy_setopt(this->ch, CURLOPT_DEBUGDATA, this);
    curl_easy_setopt(this->ch, CURLOPT_FNMATCH_DATA, this);
    curl_easy_setopt(this->ch, CURLOPT_PROGRESSDATA, this);
#if NODE_LIBCURL_VER_GE(7, 32, 0)
    curl_easy_setopt(this->ch, CURLOPT_XFERINFODATA, this);
#endif
#if NODE_LIBCURL_VER_GE(7, 64, 0)
    curl_easy_setopt(this->ch, CURLOPT_TRAILERDATA, this);
#endif
#if NODE_LIBCURL_VER_GE(7, 74, 0)
    curl_easy_setopt(this->ch, CURLOPT_HSTSREADDATA, this);
    curl_easy_setopt(this->ch, CURLOPT_HSTSWRITEDATA, this);
#endif
  }

  // Set CURLOPT_CAINFO_BLOB with CA certificates from Node.js's tls module
  // This provides default CA certificates for SSL/TLS connections
  // Only available in libcurl >= 7.77.0
#if NODE_LIBCURL_VER_GE(7, 77, 0)
  const auto curl = this->Env().GetInstanceData<Curl>();
  if (curl->caCertificatesBlob.data != nullptr && curl->caCertificatesBlob.len > 0) {
    curl_easy_setopt(this->ch, CURLOPT_CAINFO_BLOB, &curl->caCertificatesBlob);
  }
#endif
}

void Easy::CopyOtherData(Easy* orig) {
  // Copy the orig callbacks to the current handle
  for (auto& [option, callback] : orig->callbacks) {
    if (!callback.IsEmpty()) {
      this->callbacks[option] = Napi::Persistent(callback.Value());
    }
  }

  if (!orig->cbOnSocketEvent.IsEmpty()) {
    this->cbOnSocketEvent = Napi::Persistent(orig->cbOnSocketEvent.Value());
    // Share the same AsyncContext to preserve original context
    this->cbOnSocketEventAsyncContext = orig->cbOnSocketEventAsyncContext;
  }

  // Copy shared ToFree data
  this->toFree = orig->toFree;
}

void Easy::CallSocketEvent(int status, int events) {
  if (this->cbOnSocketEvent.IsEmpty() || !this->cbOnSocketEventAsyncContext) {
    return;
  }

  const auto env = this->Env();
  Napi::HandleScope scope(env);

  auto err = env.Null();
  if (status < 0) {
    err = Napi::Error::New(env, UV_ERROR_STRING(status)).Value();
  }

  this->cbOnSocketEvent.MakeCallback(this->Value(), {err, Napi::Number::New(env, events)},
                                     *this->cbOnSocketEventAsyncContext);
}

void Easy::MonitorSockets() {
  int retUv;
  CURLcode retCurl;
  int events = 0 | UV_READABLE | UV_WRITABLE;

  if (this->socketPollHandle) {
    throw CurlError::New(this->Env(), "Already monitoring sockets!", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  // TODO(jonathan, migration): drop if defs if we stop supporting old libcurl versions
#if NODE_LIBCURL_VER_GE(7, 45, 0)
  curl_socket_t socket;
  retCurl = curl_easy_getinfo(this->ch, CURLINFO_ACTIVESOCKET, &socket);

  if (socket == CURL_SOCKET_BAD) {
    throw CurlError::New(this->Env(), "Received invalid socket from the current connection!",
                         CURLE_BAD_FUNCTION_ARGUMENT);
  }
#else
  long socket;  // NOLINT(runtime/int)
  retCurl = curl_easy_getinfo(this->ch, CURLINFO_LASTSOCKET, &socket);
#endif

  if (retCurl != CURLE_OK) {
    throw CurlError::New(this->Env(), "Failed to receive socket", retCurl, true);
  }

  this->socketPollHandle = new uv_poll_t;

  uv_loop_t* loop = nullptr;
  auto napi_result = napi_get_uv_event_loop(this->Env(), &loop);
  assert(napi_result == napi_ok && "Failed to get UV event loop");

  // uv_default_loop is not thread safe, but this will run on the same thread as the current Node.js
  // environment.
  retUv = uv_poll_init_socket(loop, this->socketPollHandle, socket);

  if (retUv < 0) {
    std::string errorMsg =
        std::string("Failed to poll on connection socket. Reason: ") + UV_ERROR_STRING(retUv);

    throw CurlError::New(this->Env(), errorMsg.c_str(), CURLE_INTERFACE_FAILED);
  }

  this->socketPollHandle->data = this;

  retUv =
      uv_poll_start(this->socketPollHandle, events, [](uv_poll_t* handle, int status, int events) {
        const auto obj = static_cast<Easy*>(handle->data);
        assert(obj);
        obj->CallSocketEvent(status, events);
      });
  this->isMonitoringSockets = true;
}

void Easy::UnmonitorSockets() {
  int retUv;
  retUv = uv_poll_stop(this->socketPollHandle);

  if (retUv < 0) {
    std::string errorMsg =
        std::string("Failed to stop polling on socket. Reason: ") + UV_ERROR_STRING(retUv);

    throw CurlError::New(this->Env(), errorMsg.c_str(), CURLE_INTERFACE_FAILED);
  }

  uv_close(reinterpret_cast<uv_handle_t*>(this->socketPollHandle),
           [](uv_handle_t* handle) { delete handle; });
  this->isMonitoringSockets = false;
}

void inline Easy::throwErrorMultiInterfaceAware(const Napi::Error& error) noexcept {
  Napi::HandleScope scope(this->Env());

  if (this->isInsideMultiHandle) {
    this->callbackError.Reset(error.Value());
  } else {
    error.ThrowAsJavaScriptException();
  }
}

// Initialize the class for export
Napi::Function Easy::Init(Napi::Env env, Napi::Object exports) {
  // DefineClass uses metaprogramming to infer the C++ class to use is this Easy class.
  // (DefineClass is actually defined on the Napi::ObjectWrap<T> class)
  Napi::Function func = DefineClass(
      env, "Easy",
      {// Instance methods
       InstanceMethod("debugLog", &Easy::DebugLog), InstanceMethod("getInfo", &Easy::GetInfo),
       InstanceMethod("setOpt", &Easy::SetOpt), InstanceMethod("getInfo", &Easy::GetInfo),
       InstanceMethod("send", &Easy::Send), InstanceMethod("recv", &Easy::Recv),
       InstanceMethod("wsRecv", &Easy::WsRecv), InstanceMethod("wsSend", &Easy::WsSend),
       InstanceMethod("wsMeta", &Easy::WsMeta), InstanceMethod("wsStartFrame", &Easy::WsStartFrame),
       InstanceMethod("perform", &Easy::Perform), InstanceMethod("upkeep", &Easy::Upkeep),
       InstanceMethod("pause", &Easy::Pause), InstanceMethod("reset", &Easy::Reset),
       InstanceMethod("dupHandle", &Easy::DupHandle),
       InstanceMethod("onSocketEvent", &Easy::OnSocketEvent),
       InstanceMethod("monitorSocketEvents", &Easy::MonitorSocketEvents),
       InstanceMethod("unmonitorSocketEvents", &Easy::UnmonitorSocketEvents),
       InstanceMethod("close", &Easy::Close),

       // Static methods
       StaticMethod("strError", &Easy::StrError),

       // Instance accessors
       InstanceAccessor("id", &Easy::GetterId, nullptr),
       InstanceAccessor("isInsideMultiHandle", &Easy::GetterIsInsideMultiHandle, nullptr),
       InstanceAccessor("isMonitoringSockets", &Easy::GetterIsMonitoringSockets, nullptr),
       InstanceAccessor("pauseFlags", &Easy::GetterPauseFlags, nullptr),
       InstanceAccessor("isPausedSend", &Easy::GetterIsPausedSend, nullptr),
       InstanceAccessor("isPausedRecv", &Easy::GetterIsPausedRecv, nullptr),
       InstanceAccessor("isOpen", &Easy::GetterIsOpen, nullptr)});

  exports.Set("Easy", func);
  return func;
}

// Getters
Napi::Value Easy::GetterId(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), this->id);
}

Napi::Value Easy::GetterIsInsideMultiHandle(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), this->isInsideMultiHandle);
}

Napi::Value Easy::GetterIsMonitoringSockets(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), this->isMonitoringSockets);
}

Napi::Value Easy::GetterIsOpen(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), this->isOpen);
}

Napi::Value Easy::GetterPauseFlags(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), this->pauseState);
}

Napi::Value Easy::GetterIsPausedRecv(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), (this->pauseState & CURLPAUSE_RECV) != 0);
}

Napi::Value Easy::GetterIsPausedSend(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), (this->pauseState & CURLPAUSE_SEND) != 0);
}

Napi::Value Easy::DebugLog(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "Wrong number of arguments.");
  }

  NODE_LIBCURL_DEBUG_LOG(this, "Easy::DebugLog", info[0].ToString().Utf8Value());

  return env.Null();
}

// SetOpt method - simplified version
Napi::Value Easy::SetOpt(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  auto curl = env.GetInstanceData<Curl>();

  if (!this->isOpen) {
    throw CurlError::New(env, "Curl handle is closed.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  if (info.Length() < 2) {
    throw Napi::TypeError::New(env, "Wrong number of arguments.");
  }

  Napi::Value opt = info[0];
  Napi::Value value = info[1];

  CURLcode setOptRetCode = CURLE_UNKNOWN_OPTION;

  int optionId;

  // See this: https://daniel.haxx.se/blog/2020/08/28/enabling-better-curl-bindings/
  // we probably could use these here for newer libcurl versions...

  if ((optionId = IsInsideCurlConstantStruct(curlOptionNotImplemented, opt))) {
    throw CurlError::New(env,
                         "Unsupported option, probably because it's too complex to implement "
                         "using javascript or unecessary when using javascript (like the _DATA "
                         "options).",
                         CURLE_UNKNOWN_OPTION);
  } else if ((optionId = IsInsideCurlConstantStruct(curlOptionSpecific, opt))) {
    switch (optionId) {
      case CURLOPT_SHARE:
        if (value.IsNull()) {
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_SHARE, NULL);
        } else {
          if (!value.IsObject() ||
              !value.As<Napi::Object>().InstanceOf(curl->ShareConstructor.Value())) {
            throw Napi::TypeError::New(env,
                                       "Invalid value for the SHARE option. It must be a Share "
                                       "instance.");
          }

          Share* share = Share::Unwrap(value.As<Napi::Object>());

          if (!share->isOpen) {
            throw CurlError::New(env, "Share handle is already closed.",
                                 CURLE_BAD_FUNCTION_ARGUMENT);
          }

          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_SHARE, share->sh);
        }
        break;
    }
    // linked list options
  } else if ((optionId = IsInsideCurlConstantStruct(curlOptionLinkedList, opt))) {
    if (value.IsNull()) {
      setOptRetCode = curl_easy_setopt(this->ch, static_cast<CURLoption>(optionId), NULL);
      // HTTPPOST is a special case, since it's an array of objects.
    } else if (optionId == CURLOPT_HTTPPOST) {
      std::string invalidArrayMsg = "HTTPPOST option value should be an Array of Objects.";

      if (!value.IsArray()) {
        throw Napi::TypeError::New(env, invalidArrayMsg.c_str());
      }

      Napi::Array rows = value.As<Napi::Array>();
      auto httpPost = std::make_unique<CurlHttpPost>();

      // [{ key : val }]
      for (uint32_t i = 0, len = rows.Length(); i < len; ++i) {
        // not an array of objects
        Napi::Value obj = rows.Get(i);

        if (!obj.IsObject()) {
          throw Napi::TypeError::New(env, invalidArrayMsg.c_str());
        }

        Napi::Object postData = obj.As<Napi::Object>();
        Napi::Array props = postData.GetPropertyNames();
        const uint32_t postDataLength = props.Length();

        bool hasFile = false;
        bool hasContentType = false;
        bool hasContent = false;
        bool hasName = false;
        bool hasNewFileName = false;

        // loop through the properties names, making sure they are valid.
        for (uint32_t j = 0; j < postDataLength; ++j) {
          int32_t httpPostId = -1;

          Napi::Value postDataKey = props.Get(j);
          Napi::Value postDataValue = postData.Get(postDataKey);

          // convert postDataKey to httppost id
          std::string fieldName = postDataKey.As<Napi::String>().Utf8Value();
          std::string optionName = fieldName;
          std::transform(optionName.begin(), optionName.end(), optionName.begin(), ::toupper);

          for (const auto& curlOpt : curlOptionHttpPost) {
            if (curlOpt.name == optionName) {
              httpPostId = static_cast<int32_t>(curlOpt.value);
            }
          }

          switch (httpPostId) {
            case CurlHttpPost::FILE:
              hasFile = true;
              break;
            case CurlHttpPost::TYPE:
              hasContentType = true;
              break;
            case CurlHttpPost::CONTENTS:
              hasContent = true;
              break;
            case CurlHttpPost::NAME:
              hasName = true;
              break;
            case CurlHttpPost::FILENAME:
              hasNewFileName = true;
              break;
            case -1:  // property not found
              std::string errorMsg = "Invalid property given: \"" + optionName +
                                     "\". Valid properties are file, type, contents, name "
                                     "and filename.";
              throw CurlError::New(env, errorMsg.c_str(), CURLE_BAD_FUNCTION_ARGUMENT);
          }

          // check if value is a string.
          if (!postDataValue.IsString()) {
            std::string errorMsg = "Value for property \"" + optionName + "\" must be a string.";
            throw Napi::TypeError::New(env, errorMsg.c_str());
          }
        }

        if (!hasName) {
          throw CurlError::New(env, "Missing field \"name\".", CURLE_BAD_FUNCTION_ARGUMENT);
        }

        std::string fieldName = postData.Get("name").As<Napi::String>().Utf8Value();
        CURLFORMcode curlFormCode;

        if (hasFile) {
          std::string file = postData.Get("file").As<Napi::String>().Utf8Value();

          if (hasContentType) {
            std::string contentType = postData.Get("type").As<Napi::String>().Utf8Value();

            if (hasNewFileName) {
              std::string fileName = postData.Get("filename").As<Napi::String>().Utf8Value();
              curlFormCode = httpPost->AddFile(fieldName.data(), fieldName.length(), file.data(),
                                               contentType.data(), fileName.data());
            } else {
              curlFormCode = httpPost->AddFile(fieldName.data(), fieldName.length(), file.data(),
                                               contentType.data());
            }
          } else {
            curlFormCode = httpPost->AddFile(fieldName.data(), fieldName.length(), file.data());
          }

        } else if (hasContent) {  // if file is not set, the contents field MUST be set.
          std::string fieldValue = postData.Get("contents").As<Napi::String>().Utf8Value();
          curlFormCode = httpPost->AddField(fieldName.data(), fieldName.length(), fieldValue.data(),
                                            fieldValue.length());
        } else {
          throw CurlError::New(env, "Missing field \"contents\".", CURLE_BAD_FUNCTION_ARGUMENT);
        }

        if (curlFormCode != CURL_FORMADD_OK) {
          std::string errorMsg = "Error while adding field \"" + fieldName + "\" to post data.";
          throw CurlError::New(env, errorMsg.c_str(), CURLE_BAD_FUNCTION_ARGUMENT);
        }
      }

      setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_HTTPPOST, httpPost->first);
      if (setOptRetCode == CURLE_OK) {
        this->toFree->post.push_back(std::move(httpPost));
      }

#if NODE_LIBCURL_VER_GE(7, 56, 0)
      // MIMEPOST is a special case, similar to HTTPPOST but takes a CurlMime object
    } else if (optionId == CURLOPT_MIMEPOST) {
      if (!value.IsObject()) {
        throw Napi::TypeError::New(env, "MIMEPOST option value should be a CurlMime instance.");
      }

      Napi::Object mimeObj = value.As<Napi::Object>();

      // Try to unwrap as CurlMime
      CurlMime* curlMime = nullptr;
      napi_status status = napi_unwrap(env, mimeObj, reinterpret_cast<void**>(&curlMime));

      if (status != napi_ok || curlMime == nullptr || curlMime->mime == nullptr) {
        throw Napi::TypeError::New(env, "MIMEPOST option value must be a valid CurlMime instance.");
      }

#if !NODE_LIBCURL_VER_GE(7, 86, 0)
      // Before libcurl 7.86.0 (curl PR #9927), MIME structures are tied to the handle
      // they were created with and cannot be shared between different handles
      if (curlMime->easyHandle != this->ch) {
        throw Napi::Error::New(
            env,
            "Cannot use MIME structure with a different handle. "
            "This libcurl version (< 7.86.0) does not support MIME sharing between handles. "
            "Create the MIME with the same handle you're using it with.");
      }
#endif

      // Set the MIME structure on the easy handle
      setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_MIMEPOST, curlMime->mime);

      if (setOptRetCode == CURLE_OK) {
        // Store the mime handle for cleanup
        // Note: We store the handle, not nullptr, because the mime needs to persist
        this->toFree->mime.push_back(curlMime->mime);
      }
#endif

    } else {
      if (!value.IsArray()) {
        throw Napi::TypeError::New(env, "Option value must be an Array.");
      }

      // convert value to curl linked list (curl_slist)
      curl_slist* slist = NULL;
      Napi::Array array = value.As<Napi::Array>();

      for (uint32_t i = 0, len = array.Length(); i < len; ++i) {
        std::string item = array.Get(i).As<Napi::String>().Utf8Value();
        slist = curl_slist_append(slist, item.c_str());
      }

      setOptRetCode = curl_easy_setopt(this->ch, static_cast<CURLoption>(optionId), slist);

      if (setOptRetCode == CURLE_OK) {
        this->toFree->slist.push_back(slist);
      }
    }

    // check if option is string, and the value is correct
  } else if ((optionId = IsInsideCurlConstantStruct(curlOptionString, opt))) {
    if (value.IsNull()) {
      setOptRetCode = curl_easy_setopt(this->ch, static_cast<CURLoption>(optionId), NULL);
    } else {
      if (!value.IsString()) {
        throw Napi::TypeError::New(env, "Option value must be a string.");
      }

      std::string valueStr = value.As<Napi::String>().Utf8Value();

      // libcurl makes a copy of the strings after version 7.17, CURLOPT_POSTFIELD
      // is the only exception
      if (static_cast<CURLoption>(optionId) == CURLOPT_POSTFIELDS) {
        std::vector<char> valueChar(valueStr.begin(), valueStr.end());
        valueChar.push_back(0);

        setOptRetCode =
            curl_easy_setopt(this->ch, static_cast<CURLoption>(optionId), &valueChar[0]);

        if (setOptRetCode == CURLE_OK) {
          this->toFree->str.push_back(std::move(valueChar));
        }

      } else {
        setOptRetCode =
            curl_easy_setopt(this->ch, static_cast<CURLoption>(optionId), valueStr.c_str());
      }
    }

    // check if option is an integer, and the value is correct
  } else if ((optionId = IsInsideCurlConstantStruct(curlOptionInteger, opt))) {
    auto valueNumber = value.ToNumber();

    switch (optionId) {
      case CURLOPT_BUFFERSIZE: {
        auto bufferSize = static_cast<long>(valueNumber.Int32Value());
        // See https://curl.se/libcurl/c/CURLOPT_BUFFERSIZE.html
#if NODE_LIBCURL_VER_GE(7, 88, 0)
        constexpr long kMaxBufferSize = 10 * 1024 * 1024;
#else
        constexpr long kMaxBufferSize = 512 * 1024;
#endif
        constexpr long kMinBufferSize = 1024;
        if (bufferSize < kMinBufferSize || bufferSize > kMaxBufferSize) {
          std::string errMsg = "BUFFERSIZE must be between " + std::to_string(kMinBufferSize) +
#if NODE_LIBCURL_VER_GE(7, 88, 0)
                               " and 10485760 (10MB) for libcurl >= 7.88.0";
#else
                               " and 524288 (512KB) for libcurl <= 7.88.0";
#endif
          throw Napi::RangeError::New(env, errMsg);
        }
        setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_BUFFERSIZE, bufferSize);
        break;
      }
      case CURLOPT_INFILESIZE_LARGE:
      case CURLOPT_MAXFILESIZE_LARGE:
      case CURLOPT_MAX_RECV_SPEED_LARGE:
      case CURLOPT_MAX_SEND_SPEED_LARGE:
      case CURLOPT_POSTFIELDSIZE_LARGE:
      case CURLOPT_RESUME_FROM_LARGE:
        setOptRetCode = curl_easy_setopt(this->ch, static_cast<CURLoption>(optionId),
                                         static_cast<curl_off_t>(valueNumber.DoubleValue()));
        break;
      // special case with READDATA, since we need to store the file descriptor
      // and not overwrite the READDATA already set in the handle.
      case CURLOPT_READDATA:
        this->readDataFileDescriptor = valueNumber.Int32Value();
        setOptRetCode = CURLE_OK;
        break;
      default:
        setOptRetCode = curl_easy_setopt(this->ch, static_cast<CURLoption>(optionId),
                                         static_cast<long>(valueNumber.Int32Value()));
        break;
    }

    // check if option is a function, and the value is correct
  } else if ((optionId = IsInsideCurlConstantStruct(curlOptionFunction, opt))) {
    bool isNull = value.IsNull();

    if (!value.IsFunction() && !isNull) {
      throw Napi::TypeError::New(env, "Option value must be a null or a function.");
    }

    switch (optionId) {
      case CURLOPT_CHUNK_BGN_FUNCTION:
        if (isNull) {
          // only unset the CHUNK_DATA if CURLOPT_CHUNK_END_FUNCTION is not set.
          if (!this->callbacks.count(CURLOPT_CHUNK_END_FUNCTION)) {
            curl_easy_setopt(this->ch, CURLOPT_CHUNK_DATA, NULL);
          }
          this->callbacks.erase(CURLOPT_CHUNK_BGN_FUNCTION);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_CHUNK_BGN_FUNCTION, NULL);
        } else {
          // TODO(jonathan): Check if we should use .Reset instead, or if we should clear the value
          // first.
          this->callbacks[CURLOPT_CHUNK_BGN_FUNCTION] =
              Napi::Persistent(value.As<Napi::Function>());
          curl_easy_setopt(this->ch, CURLOPT_CHUNK_DATA, this);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_CHUNK_BGN_FUNCTION, Easy::CbChunkBgn);
        }
        break;
      case CURLOPT_CHUNK_END_FUNCTION:
        if (isNull) {
          // only unset the CHUNK_DATA if CURLOPT_CHUNK_BGN_FUNCTION is not set.
          if (!this->callbacks.count(CURLOPT_CHUNK_BGN_FUNCTION)) {
            curl_easy_setopt(this->ch, CURLOPT_CHUNK_DATA, NULL);
          }
          this->callbacks.erase(CURLOPT_CHUNK_END_FUNCTION);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_CHUNK_END_FUNCTION, NULL);
        } else {
          this->callbacks[CURLOPT_CHUNK_END_FUNCTION] =
              Napi::Persistent(value.As<Napi::Function>());
          curl_easy_setopt(this->ch, CURLOPT_CHUNK_DATA, this);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_CHUNK_END_FUNCTION, Easy::CbChunkEnd);
        }
        break;
      case CURLOPT_DEBUGFUNCTION:
        if (isNull) {
          this->callbacks.erase(CURLOPT_DEBUGFUNCTION);
          curl_easy_setopt(this->ch, CURLOPT_DEBUGDATA, NULL);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_DEBUGFUNCTION, NULL);
        } else {
          this->callbacks[CURLOPT_DEBUGFUNCTION] = Napi::Persistent(value.As<Napi::Function>());
          curl_easy_setopt(this->ch, CURLOPT_DEBUGDATA, this);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_DEBUGFUNCTION, Easy::CbDebug);
        }
        break;
      case CURLOPT_FNMATCH_FUNCTION:
        if (isNull) {
          this->callbacks.erase(CURLOPT_FNMATCH_FUNCTION);
          curl_easy_setopt(this->ch, CURLOPT_FNMATCH_DATA, NULL);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_FNMATCH_FUNCTION, NULL);
        } else {
          this->callbacks[CURLOPT_FNMATCH_FUNCTION] = Napi::Persistent(value.As<Napi::Function>());
          curl_easy_setopt(this->ch, CURLOPT_FNMATCH_DATA, this);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_FNMATCH_FUNCTION, Easy::CbFnMatch);
        }
        break;
      case CURLOPT_HEADERFUNCTION:
        setOptRetCode = CURLE_OK;
        if (isNull) {
          this->callbacks.erase(CURLOPT_HEADERFUNCTION);
        } else {
          this->callbacks[CURLOPT_HEADERFUNCTION] = Napi::Persistent(value.As<Napi::Function>());
        }
        break;
#if NODE_LIBCURL_VER_GE(7, 74, 0)
      case CURLOPT_HSTSREADFUNCTION:
        if (isNull) {
          this->callbacks.erase(CURLOPT_HSTSREADFUNCTION);
          curl_easy_setopt(this->ch, CURLOPT_HSTSREADDATA, NULL);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_HSTSREADFUNCTION, NULL);
        } else {
          this->callbacks[CURLOPT_HSTSREADFUNCTION] = Napi::Persistent(value.As<Napi::Function>());
          curl_easy_setopt(this->ch, CURLOPT_HSTSREADDATA, this);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_HSTSREADFUNCTION, Easy::CbHstsRead);
        }
        break;
      case CURLOPT_HSTSWRITEFUNCTION:
        if (isNull) {
          this->callbacks.erase(CURLOPT_HSTSWRITEFUNCTION);
          curl_easy_setopt(this->ch, CURLOPT_HSTSWRITEDATA, NULL);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_HSTSWRITEFUNCTION, NULL);
        } else {
          this->callbacks[CURLOPT_HSTSWRITEFUNCTION] = Napi::Persistent(value.As<Napi::Function>());
          curl_easy_setopt(this->ch, CURLOPT_HSTSWRITEDATA, this);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_HSTSWRITEFUNCTION, Easy::CbHstsWrite);
        }
        break;
#endif
#if NODE_LIBCURL_VER_GE(7, 80, 0)
      case CURLOPT_PREREQFUNCTION:
        if (isNull) {
          this->callbacks.erase(CURLOPT_PREREQFUNCTION);
          curl_easy_setopt(this->ch, CURLOPT_PREREQDATA, NULL);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_PREREQFUNCTION, NULL);
        } else {
          this->callbacks[CURLOPT_PREREQFUNCTION] = Napi::Persistent(value.As<Napi::Function>());
          curl_easy_setopt(this->ch, CURLOPT_PREREQDATA, this);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_PREREQFUNCTION, Easy::CbPreReq);
        }
        break;
#endif
      case CURLOPT_PROGRESSFUNCTION:
        if (isNull) {
          this->callbacks.erase(CURLOPT_PROGRESSFUNCTION);
          curl_easy_setopt(this->ch, CURLOPT_PROGRESSDATA, NULL);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_PROGRESSFUNCTION, NULL);
        } else {
          this->callbacks[CURLOPT_PROGRESSFUNCTION] = Napi::Persistent(value.As<Napi::Function>());
          curl_easy_setopt(this->ch, CURLOPT_PROGRESSDATA, this);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_PROGRESSFUNCTION, Easy::CbProgress);
        }
        break;
      case CURLOPT_READFUNCTION:
        setOptRetCode = CURLE_OK;
        if (isNull) {
          this->callbacks.erase(CURLOPT_READFUNCTION);
        } else {
          this->callbacks[CURLOPT_READFUNCTION] = Napi::Persistent(value.As<Napi::Function>());
        }
        break;
      case CURLOPT_SEEKFUNCTION:
        setOptRetCode = CURLE_OK;
        if (isNull) {
          this->callbacks.erase(CURLOPT_SEEKFUNCTION);
        } else {
          this->callbacks[CURLOPT_SEEKFUNCTION] = Napi::Persistent(value.As<Napi::Function>());
        }
        break;
#if NODE_LIBCURL_VER_GE(7, 64, 0)
      case CURLOPT_TRAILERFUNCTION:
        if (isNull) {
          this->callbacks.erase(CURLOPT_TRAILERFUNCTION);
          curl_easy_setopt(this->ch, CURLOPT_TRAILERDATA, NULL);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_TRAILERFUNCTION, NULL);
        } else {
          this->callbacks[CURLOPT_TRAILERFUNCTION] = Napi::Persistent(value.As<Napi::Function>());
          curl_easy_setopt(this->ch, CURLOPT_TRAILERDATA, this);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_TRAILERFUNCTION, Easy::CbTrailer);
        }
        break;
#endif
#if NODE_LIBCURL_VER_GE(7, 32, 0)
      /* xferinfo was introduced in 7.32.0.
         New libcurls will prefer the new callback and instead use that one even
         if both callbacks are set. */
      case CURLOPT_XFERINFOFUNCTION:
        if (isNull) {
          this->callbacks.erase(CURLOPT_XFERINFOFUNCTION);
          curl_easy_setopt(this->ch, CURLOPT_XFERINFODATA, NULL);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_XFERINFOFUNCTION, NULL);
        } else {
          this->callbacks[CURLOPT_XFERINFOFUNCTION] = Napi::Persistent(value.As<Napi::Function>());
          curl_easy_setopt(this->ch, CURLOPT_XFERINFODATA, this);
          setOptRetCode = curl_easy_setopt(this->ch, CURLOPT_XFERINFOFUNCTION, Easy::CbXferinfo);
        }
        break;
#endif
      case CURLOPT_WRITEFUNCTION:
        setOptRetCode = CURLE_OK;
        if (isNull) {
          this->callbacks.erase(CURLOPT_WRITEFUNCTION);
        } else {
          this->callbacks[CURLOPT_WRITEFUNCTION] = Napi::Persistent(value.As<Napi::Function>());
        }
        break;
    }
    // check if option is a blob, and the value is correct
  } else if ((optionId = IsInsideCurlConstantStruct(curlOptionBlob, opt))) {
#if NODE_LIBCURL_VER_GE(7, 71, 0)
    if (value.IsNull()) {
      setOptRetCode = curl_easy_setopt(this->ch, static_cast<CURLoption>(optionId), NULL);
    } else if (value.IsString()) {
      std::string stringValue = value.As<Napi::String>().Utf8Value();
      size_t length = static_cast<size_t>(stringValue.length());
      struct curl_blob blob;
      blob.data = stringValue.data();
      blob.len = length;
      blob.flags = CURL_BLOB_COPY;
      // if we wanted to reduce copies, we could store the string in our toFree vector
      setOptRetCode = curl_easy_setopt(this->ch, static_cast<CURLoption>(optionId), &blob);
    } else if (value.IsBuffer()) {
      Napi::Buffer<char> buffer = value.As<Napi::Buffer<char>>();
      struct curl_blob blob;
      blob.data = buffer.Data();
      blob.len = buffer.Length();
      blob.flags = CURL_BLOB_COPY;
      setOptRetCode = curl_easy_setopt(this->ch, static_cast<CURLoption>(optionId), &blob);
    } else {
      throw Napi::TypeError::New(env, "Option value must be a string or Buffer.");
    }
#else
    throw CurlError::New(env, "Blob options require curl 7.71 or newer.", CURLE_NOT_BUILT_IN);
#endif
  }
  return Napi::Number::New(env, setOptRetCode);
}

// Template helper for GetInfo
template <typename TResultType, typename Tv8MappingType>
Napi::Value Easy::GetInfoTmpl(const Easy* obj, int infoId) {
  TResultType result;
  CURLINFO info = static_cast<CURLINFO>(infoId);
  CURLcode code = curl_easy_getinfo(obj->ch, info, &result);

  if (code != CURLE_OK) {
    throw CurlError::New(obj->Env(), "Failed to get info", code, true);
  }

  // Handle string case - if result is char* and null, return empty string
  if constexpr (std::is_same_v<TResultType, char*>) {
    if (!result) {
      return Napi::String::New(obj->Env(), "");
    }
    return Napi::String::New(obj->Env(), result);
  } else {
    return Napi::Number::New(obj->Env(), static_cast<double>(result));
  }
}

// GetInfo method
Napi::Value Easy::GetInfo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw CurlError::New(env, "Curl handle is closed.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "Wrong number of arguments");
  }

  Napi::Value infoVal = info[0];
  Napi::Value retVal = env.Undefined();
  int infoId;
  CURLINFO curlInfo;
  CURLcode code = CURLE_OK;

  // Special case for unsupported info
  if ((infoId = IsInsideCurlConstantStruct(curlInfoNotImplemented, infoVal))) {
    throw CurlError::New(env,
                         "Unsupported info, probably because it's too complex to implement "
                         "using javascript or unecessary when using javascript.",
                         CURLE_UNKNOWN_OPTION);
  }

  try {
    // String
    if ((infoId = IsInsideCurlConstantStruct(curlInfoString, infoVal))) {
      retVal = Easy::GetInfoTmpl<char*, Napi::String>(this, infoId);
      // curl_off_t
    } else if ((infoId = IsInsideCurlConstantStruct(curlInfoOffT, infoVal))) {
      retVal = Easy::GetInfoTmpl<curl_off_t, Napi::Number>(this, infoId);
      // Double
    } else if ((infoId = IsInsideCurlConstantStruct(curlInfoDouble, infoVal))) {
      retVal = Easy::GetInfoTmpl<double, Napi::Number>(this, infoId);
      // Integer
    } else if ((infoId = IsInsideCurlConstantStruct(curlInfoInteger, infoVal))) {
      retVal = Easy::GetInfoTmpl<long, Napi::Number>(this, infoId);  // NOLINT(runtime/int)
      // ACTIVESOCKET and alike
    } else if ((infoId = IsInsideCurlConstantStruct(curlInfoSocket, infoVal))) {
#if NODE_LIBCURL_VER_GE(7, 45, 0)
      curl_socket_t socket;
#else
      // this should never really used tho, as it's only possible to have
      // an curlInfoSocket value with libcurl >= 7.45.0
      long socket;  // NOLINT(runtime/int)
#endif
      code = curl_easy_getinfo(this->ch, static_cast<CURLINFO>(infoId), &socket);
      if (code == CURLE_OK) {
        // curl_socket_t is of type SOCKET on Windows,
        //  casting it to int32_t can be dangerous, only if Microsoft ever decides
        //  to change the underlying architecture behind it.
        // https://stackoverflow.com/a/26496808/710693
        retVal = Napi::Number::New(env, static_cast<int32_t>(socket));
      }
      // Linked list
    } else if ((infoId = IsInsideCurlConstantStruct(curlInfoLinkedList, infoVal))) {
      curl_slist* linkedList;
      curl_slist* curr;
      curlInfo = static_cast<CURLINFO>(infoId);

      if (curlInfo == CURLINFO_CERTINFO) {
        curl_certinfo* ci = nullptr;
        code = curl_easy_getinfo(this->ch, curlInfo, &ci);

        if (code == CURLE_OK && ci != nullptr) {
          Napi::Array arr = Napi::Array::New(env);

          for (int i = 0; i < ci->num_of_certs; i++) {
            linkedList = ci->certinfo[i];

            if (linkedList) {
              curr = linkedList;

              while (curr) {
                arr.Set(arr.Length(), Napi::String::New(env, curr->data));
                curr = curr->next;
              }
            }
          }

          retVal = arr;
        }
      } else {
        code = curl_easy_getinfo(this->ch, curlInfo, &linkedList);

        if (code == CURLE_OK) {
          Napi::Array arr = Napi::Array::New(env);

          if (linkedList) {
            curr = linkedList;

            while (curr) {
              arr.Set(arr.Length(), Napi::String::New(env, curr->data));
              curr = curr->next;
            }

            curl_slist_free_all(linkedList);
          }

          retVal = arr;
        }
      }
    }
  } catch (const std::exception& e) {
    // Inside Easy::GetInfoImpl we throw an exception with the error code
    //  so we can get it here and set the code to the correct value
    std::string errMsg = e.what();
    std::string errCode;
    std::copy_if(errMsg.begin(), errMsg.end(), std::back_inserter(errCode), ::isdigit);
    code = static_cast<CURLcode>(errCode.length() > 0 ? std::stoi(errCode)
                                                      : CURLE_BAD_FUNCTION_ARGUMENT);
  }

  Napi::Object ret = Napi::Object::New(env);
  ret.Set("code", Napi::Number::New(env, static_cast<int32_t>(code)));
  ret.Set("data", retVal);
  return ret;
}

Napi::Value Easy::Perform(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw Napi::TypeError::New(env, "Curl handle is closed");
  }

  NODE_LIBCURL_DEBUG_LOG(this, "Easy::Perform", "performing request");

  LocaleGuard localeGuard;
  CURLcode code = curl_easy_perform(this->ch);

  return Napi::Number::New(env, static_cast<int>(code));
}

Napi::Value Easy::Reset(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw CurlError::New(env, "Curl handle is closed", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  NODE_LIBCURL_DEBUG_LOG(this, "Easy::Reset", "resetting request");

  curl_easy_reset(this->ch);

  // reset the URL,
  // https://github.com/bagder/curl/commit/ac6da721a3740500cc0764947385eb1c22116b83
  curl_easy_setopt(this->ch, CURLOPT_URL, "");

  this->DisposeInternalData();

  // the above will reset toFree, thus we need to recreate it
  this->toFree = std::make_shared<Easy::ToFree>();

  this->ResetRequiredHandleOptions(false);

  return info.This();
}

Napi::Value Easy::Close(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw CurlError::New(env, "Curl handle already closed.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  if (this->isInsideMultiHandle) {
    throw CurlError::New(env, "Curl handle is inside a Multi instance, you must remove it first.",
                         CURLE_BAD_FUNCTION_ARGUMENT);
  }

  this->Dispose();
  return env.Undefined();
}

Napi::Value Easy::StrError(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsNumber()) {
    throw Napi::TypeError::New(env, "Invalid errCode passed to Easy.strError.");
  }

  int32_t errorCode = info[0].As<Napi::Number>().Int32Value();
  const char* errorMsg = curl_easy_strerror(static_cast<CURLcode>(errorCode));

  return Napi::String::New(env, errorMsg);
}

// Stub implementations for now
Napi::Value Easy::Send(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw CurlError::New(env, "Curl handle is closed.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  if (info.Length() == 0) {
    throw CurlError::New(env, "Missing buffer argument.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  Napi::Value buf = info[0];
  if (!buf.IsBuffer()) {
    throw CurlError::New(env, "Invalid Buffer instance given.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  Napi::Buffer<char> buffer = buf.As<Napi::Buffer<char>>();
  const char* bufContent = buffer.Data();
  size_t bufLength = buffer.Length();
  size_t n = 0;

  CURLcode curlRet = curl_easy_send(this->ch, bufContent, bufLength, &n);

  Napi::Object ret = Napi::Object::New(env);
  ret.Set("code", Napi::Number::New(env, static_cast<int32_t>(curlRet)));
  ret.Set("bytesSent", Napi::Number::New(env, static_cast<int32_t>(n)));

  return ret;
}

Napi::Value Easy::Recv(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw CurlError::New(env, "Curl handle is closed.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  if (info.Length() == 0) {
    throw CurlError::New(env, "Missing buffer argument.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  Napi::Value buf = info[0];
  if (!buf.IsBuffer()) {
    throw CurlError::New(env, "Invalid Buffer instance given.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  Napi::Buffer<char> buffer = buf.As<Napi::Buffer<char>>();
  char* bufContent = buffer.Data();
  size_t bufLength = buffer.Length();
  size_t n = 0;

  CURLcode curlRet = curl_easy_recv(this->ch, bufContent, bufLength, &n);

  Napi::Object ret = Napi::Object::New(env);
  ret.Set("code", Napi::Number::New(env, static_cast<int32_t>(curlRet)));
  ret.Set("bytesReceived", Napi::Number::New(env, static_cast<int32_t>(n)));

  return ret;
}

Napi::Value Easy::WsRecv(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw CurlError::New(env, "Curl handle is closed.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

#if NODE_LIBCURL_VER_GE(7, 86, 0)
  if (info.Length() == 0) {
    throw CurlError::New(env, "Missing buffer argument.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  Napi::Value buf = info[0];
  if (!buf.IsBuffer()) {
    throw CurlError::New(env, "Invalid Buffer instance given.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  Napi::Buffer<char> buffer = buf.As<Napi::Buffer<char>>();
  char* bufContent = buffer.Data();
  size_t bufLength = buffer.Length();
  size_t n = 0;
  const struct curl_ws_frame* metaPtr = nullptr;

  CURLcode curlRet = curl_ws_recv(this->ch, bufContent, bufLength, &n, &metaPtr);

  Napi::Object ret = Napi::Object::New(env);
  ret.Set("code", Napi::Number::New(env, static_cast<int32_t>(curlRet)));
  ret.Set("bytesReceived", Napi::Number::New(env, static_cast<int32_t>(n)));

  // Create frame metadata object if available
  if (metaPtr) {
    Napi::Object meta = Napi::Object::New(env);
    meta.Set("age", Napi::Number::New(env, metaPtr->age));
    meta.Set("flags", Napi::Number::New(env, metaPtr->flags));
    meta.Set("offset", Napi::Number::New(env, static_cast<double>(metaPtr->offset)));
    meta.Set("bytesleft", Napi::Number::New(env, static_cast<double>(metaPtr->bytesleft)));
    meta.Set("len", Napi::Number::New(env, metaPtr->len));
    ret.Set("meta", meta);
  } else {
    ret.Set("meta", env.Null());
  }

  return ret;
#else
  throw CurlError::New(env, "WebSocket support requires libcurl >= 7.86.0", CURLE_NOT_BUILT_IN);
#endif
}

Napi::Value Easy::WsSend(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw CurlError::New(env, "Curl handle is closed.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

#if NODE_LIBCURL_VER_GE(7, 86, 0)
  if (info.Length() < 2) {
    throw CurlError::New(env, "Missing buffer and/or flags arguments.",
                         CURLE_BAD_FUNCTION_ARGUMENT);
  }

  Napi::Value buf = info[0];
  if (!buf.IsBuffer()) {
    throw CurlError::New(env, "Invalid Buffer instance given.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  if (!info[1].IsNumber()) {
    throw CurlError::New(env, "Flags argument must be a number.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

  Napi::Buffer<char> buffer = buf.As<Napi::Buffer<char>>();
  const char* bufContent = buffer.Data();
  size_t bufLength = buffer.Length();
  size_t n = 0;
  unsigned int flags = info[1].As<Napi::Number>().Uint32Value();
  curl_off_t fragsize = 0;

  // Optional fragsize parameter for CURLWS_OFFSET mode
  if (info.Length() >= 3 && info[2].IsNumber()) {
    fragsize = static_cast<curl_off_t>(info[2].As<Napi::Number>().Int64Value());
  }

  CURLcode curlRet = curl_ws_send(this->ch, bufContent, bufLength, &n, fragsize, flags);

  Napi::Object ret = Napi::Object::New(env);
  ret.Set("code", Napi::Number::New(env, static_cast<int32_t>(curlRet)));
  ret.Set("bytesSent", Napi::Number::New(env, static_cast<int32_t>(n)));

  return ret;
#else
  throw CurlError::New(env, "WebSocket support requires libcurl >= 7.86.0", CURLE_NOT_BUILT_IN);
#endif
}

Napi::Value Easy::WsMeta(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw CurlError::New(env, "Curl handle is closed.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

#if NODE_LIBCURL_VER_GE(7, 86, 0)
  const struct curl_ws_frame* metaPtr = curl_ws_meta(this->ch);

  if (!metaPtr) {
    return env.Null();
  }

  Napi::Object meta = Napi::Object::New(env);
  meta.Set("age", Napi::Number::New(env, metaPtr->age));
  meta.Set("flags", Napi::Number::New(env, metaPtr->flags));
  meta.Set("offset", Napi::Number::New(env, static_cast<double>(metaPtr->offset)));
  meta.Set("bytesleft", Napi::Number::New(env, static_cast<double>(metaPtr->bytesleft)));
  meta.Set("len", Napi::Number::New(env, metaPtr->len));

  return meta;
#else
  throw CurlError::New(env, "WebSocket support requires libcurl >= 7.86.0", CURLE_NOT_BUILT_IN);
#endif
}

Napi::Value Easy::WsStartFrame(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw CurlError::New(env, "Curl handle is closed.", CURLE_BAD_FUNCTION_ARGUMENT);
  }

#if NODE_LIBCURL_VER_GE(7, 86, 0)
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
    throw CurlError::New(env, "Missing flags and/or frame length arguments.",
                         CURLE_BAD_FUNCTION_ARGUMENT);
  }

  unsigned int flags = info[0].As<Napi::Number>().Uint32Value();
  curl_off_t frameLength = static_cast<curl_off_t>(info[1].As<Napi::Number>().Int64Value());

  CURLcode result = curl_ws_start_frame(this->ch, flags, frameLength);
  return Napi::Number::New(env, static_cast<int32_t>(result));
#else
  throw CurlError::New(env, "WebSocket support requires libcurl >= 7.86.0", CURLE_NOT_BUILT_IN);
#endif
}

Napi::Value Easy::Upkeep(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw Napi::TypeError::New(env, "Curl handle is closed");
  }

#if NODE_LIBCURL_VER_GE(7, 62, 0)
  CURLcode code = curl_easy_upkeep(this->ch);
  return Napi::Number::New(env, static_cast<int>(code));
#else
  throw CurlError::New(env, "Upkeep requires libcurl >= 7.62.0", CURLE_NOT_BUILT_IN);
#endif
}

Napi::Value Easy::Pause(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw Napi::TypeError::New(env, "Curl handle is closed");
  }

  if (info.Length() < 1 || !info[0].IsNumber()) {
    throw Napi::TypeError::New(env, "Argument must be a bitmask");
  }

  int32_t bitmask = info[0].As<Napi::Number>().Int32Value();
  this->pauseState = bitmask;

  CURLcode code = curl_easy_pause(this->ch, bitmask);

  return Napi::Number::New(env, static_cast<int>(code));
}

Napi::Value Easy::DupHandle(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->isOpen) {
    throw Napi::TypeError::New(env, "Curl handle is closed");
  }

  // Create a new Easy instance using this instance as constructor argument
  // This leverages our copy constructor logic
  auto curl = env.GetInstanceData<Curl>();
  return curl->EasyConstructor.New({info.This()});
}

Napi::Value Easy::OnSocketEvent(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() == 0) {
    throw CurlError::New(env, "You must specify the callback function.",
                         CURLE_BAD_FUNCTION_ARGUMENT);
  }

  Napi::Value arg = info[0];

  // null means clear the existing callback if any
  if (arg.IsNull()) {
    this->cbOnSocketEvent.Reset();
    this->cbOnSocketEventAsyncContext.reset();
    return info.This();
  }

  if (!arg.IsFunction()) {
    throw Napi::TypeError::New(env, "Invalid callback given.");
  }

  // If we were using Napi::TypedThreadSafeFunction<> here we would not need to keep track of
  // context but that feels like a not needed complexity, as libuv will always be running on the
  // same thread as the current Node.js environment.
  this->cbOnSocketEvent = Napi::Persistent(arg.As<Napi::Function>());
  this->cbOnSocketEventAsyncContext =
      std::make_shared<Napi::AsyncContext>(env, "Easy::OnSocketEvent");

  return info.This();
}

Napi::Value Easy::MonitorSocketEvents(const Napi::CallbackInfo& info) {
  this->MonitorSockets();
  return info.This();
}

Napi::Value Easy::UnmonitorSocketEvents(const Napi::CallbackInfo& info) {
  this->UnmonitorSockets();
  return info.This();
}

size_t Easy::WriteFunction(char* ptr, size_t size, size_t nmemb, void* userdata) {
  Easy* obj = static_cast<Easy*>(userdata);
  return obj->OnData(ptr, size, nmemb);
}

size_t Easy::HeaderFunction(char* ptr, size_t size, size_t nmemb, void* userdata) {
  Easy* obj = static_cast<Easy*>(userdata);
  return obj->OnHeader(ptr, size, nmemb);
}

size_t Easy::OnData(char* data, size_t size, size_t nmemb) {
  NODE_LIBCURL_DEBUG_LOG(this, "Easy::OnData", "received data");

  Napi::Env env = Env();
  Napi::HandleScope scope(env);

  size_t dataLength = size * nmemb;

  auto it = this->callbacks.find(CURLOPT_WRITEFUNCTION);
  if (it == this->callbacks.end() || it->second.IsEmpty()) {
    // No callback set, return data length to continue
    return dataLength;
  }

  // If this gets returned it will cause a CURLE_WRITE_ERROR
  int32_t returnValue = -1;

  try {
    Napi::Function cb = it->second.Value();

    Napi::Buffer<char> buffer = Napi::Buffer<char>::Copy(env, data, dataLength);

    // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
    Napi::AsyncContext asyncContext(env, "Easy::OnData");

    Napi::Value result = cb.MakeCallback(
        this->Value(), {buffer, Napi::Number::New(env, size), Napi::Number::New(env, nmemb)},
        asyncContext);

    // This is in theory not needed, as we have exceptions enabled
    if (env.IsExceptionPending()) {
      Napi::Error error = env.GetAndClearPendingException();

      this->throwErrorMultiInterfaceAware(error);
      return returnValue;
    }

    if (!result.IsNumber()) {
      Napi::TypeError typeError =
          Napi::TypeError::New(env, "Return value from the WRITE callback must be an integer.");

      this->throwErrorMultiInterfaceAware(typeError);
      return returnValue;
    }

    returnValue = result.As<Napi::Number>().Int32Value();
  } catch (const Napi::Error& e) {
    this->throwErrorMultiInterfaceAware(e);
    return returnValue;
  }

  if (returnValue == CURL_WRITEFUNC_PAUSE) {
    this->pauseState |= CURLPAUSE_RECV;
  }

  return returnValue;
}

size_t Easy::OnHeader(char* data, size_t size, size_t nmemb) {
  Napi::Env env = Env();
  Napi::HandleScope scope(env);

  size_t dataLength = size * nmemb;

  auto it = this->callbacks.find(CURLOPT_HEADERFUNCTION);
  if (it == this->callbacks.end() || it->second.IsEmpty()) {
    // No callback set, return data length to continue
    return dataLength;
  }

  // If this gets returned it will cause a CURLE_WRITE_ERROR
  int32_t returnValue = -1;

  try {
    Napi::Function cb = it->second.Value();

    // Create buffer from data
    Napi::Buffer<char> buffer = Napi::Buffer<char>::Copy(env, data, dataLength);

    // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
    Napi::AsyncContext asyncContext(env, "Easy::OnHeader");
    Napi::Value result = cb.MakeCallback(
        this->Value(), {buffer, Napi::Number::New(env, size), Napi::Number::New(env, nmemb)},
        asyncContext);

    // This is in theory not needed, as we have exceptions enabled
    if (env.IsExceptionPending()) {
      Napi::Error error = env.GetAndClearPendingException();

      this->throwErrorMultiInterfaceAware(error);
      return returnValue;
    }

    if (!result.IsNumber()) {
      Napi::TypeError typeError =
          Napi::TypeError::New(env, "Return value from the HEADER callback must be an integer.");

      this->throwErrorMultiInterfaceAware(typeError);
      return returnValue;
    }

    returnValue = result.As<Napi::Number>().Int32Value();

  } catch (const Napi::Error& e) {
    this->throwErrorMultiInterfaceAware(e);
    return returnValue;
  }

  return returnValue;
}

// Called by libcurl as soon as it needs to read data in order to send it to the
// peer
size_t Easy::ReadFunction(char* ptr, size_t size, size_t nmemb, void* userdata) {
  Easy* obj = static_cast<Easy*>(userdata);

  int32_t returnValue = CURL_READFUNC_ABORT;
  int32_t fd = obj->readDataFileDescriptor;
  size_t n = size * nmemb;

  auto it = obj->callbacks.find(CURLOPT_READFUNCTION);

  // Read callback was set, use it instead
  if (it != obj->callbacks.end() && !it->second.IsEmpty()) {
    Napi::Env env = obj->Env();
    Napi::HandleScope scope(env);

    try {
      Napi::Function cb = it->second.Value();

      Napi::Buffer<char> buffer = Napi::Buffer<char>::New(env, static_cast<uint32_t>(n));

      // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
      Napi::AsyncContext asyncContext(env, "Easy::ReadFunction");

      Napi::Value result = cb.MakeCallback(
          obj->Value(), {buffer, Napi::Number::New(env, size), Napi::Number::New(env, nmemb)},
          asyncContext);

      // This is in theory not needed, as we have exceptions enabled
      if (env.IsExceptionPending()) {
        Napi::Error error = env.GetAndClearPendingException();

        obj->throwErrorMultiInterfaceAware(error);
        return returnValue;
      }

      if (!result.IsNumber()) {
        Napi::TypeError typeError =
            Napi::TypeError::New(env, "Return value from the READ callback must be an integer.");

        obj->throwErrorMultiInterfaceAware(typeError);
        return returnValue;
      }

      returnValue = result.As<Napi::Number>().Int32Value();

      char* data = buffer.Data();
      bool hasData = !!data && returnValue > 0 && returnValue < CURL_READFUNC_ABORT;

      if (hasData) {
        std::memcpy(ptr, data, returnValue);
      }

    } catch (const Napi::Error& e) {
      obj->throwErrorMultiInterfaceAware(e);
      return returnValue;
    }

  } else {
    // abort early if we don't have a file descriptor
    if (fd == -1) {
      return CURL_READFUNC_ABORT;
    }

    // get the offset
    curl_off_t offset = obj->readDataOffset;
    if (offset >= 0) {
      obj->readDataOffset += n;
    }

    uv_fs_t readReq;

    uv_loop_t* loop = nullptr;
    auto napi_result = napi_get_uv_event_loop(obj->Env(), &loop);

    if (napi_result != napi_ok) {
      return CURL_READFUNC_ABORT;
    }

#if UV_VERSION_MAJOR < 1
    returnValue = uv_fs_read(loop, &readReq, fd, ptr, n, offset, NULL);
#else
    uv_buf_t uvbuf = uv_buf_init(ptr, (unsigned int)(n));

    returnValue = uv_fs_read(loop, &readReq, fd, &uvbuf, 1, offset, NULL);
#endif
    uv_fs_req_cleanup(&readReq);
  }

  if (returnValue < 0) {
    return CURL_READFUNC_ABORT;
  }

  if (returnValue == CURL_READFUNC_PAUSE) {
    obj->pauseState |= CURLPAUSE_SEND;
  }

  return static_cast<size_t>(returnValue);
}

size_t Easy::SeekFunction(void* userdata, curl_off_t offset, int origin) {
  Easy* obj = static_cast<Easy*>(userdata);

  int32_t returnValue = CURL_SEEKFUNC_FAIL;

  auto readIt = obj->callbacks.find(CURLOPT_READFUNCTION);

  // Read callback was set, look for a seek callback
  if (readIt != obj->callbacks.end()) {
    auto seekIt = obj->callbacks.find(CURLOPT_SEEKFUNCTION);

    if (seekIt != obj->callbacks.end() && !seekIt->second.IsEmpty()) {
      Napi::Env env = obj->Env();
      Napi::HandleScope scope(env);

      try {
        Napi::Function cb = seekIt->second.Value();

        // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
        Napi::AsyncContext asyncContext(env, "Easy::SeekFunction");

        Napi::Value result =
            cb.MakeCallback(obj->Value(),
                            {Napi::Number::New(env, static_cast<uint32_t>(offset)),
                             Napi::Number::New(env, static_cast<uint32_t>(origin))},
                            asyncContext);

        // This is in theory not needed, as we have exceptions enabled
        if (env.IsExceptionPending()) {
          Napi::Error error = env.GetAndClearPendingException();

          obj->throwErrorMultiInterfaceAware(error);
          return returnValue;
        }

        if (!result.IsNumber()) {
          Napi::TypeError typeError =
              Napi::TypeError::New(env, "Return value from the SEEK callback must be an integer.");

          obj->throwErrorMultiInterfaceAware(typeError);
          return returnValue;
        }

        returnValue = result.As<Napi::Number>().Int32Value();

      } catch (const Napi::Error& e) {
        obj->throwErrorMultiInterfaceAware(e);
        return returnValue;
      }

    } else {
      // otherwise we can't seek directly
      returnValue = CURL_SEEKFUNC_CANTSEEK;
    }

  } else {
    // default implementation
    obj->readDataOffset = offset;
    returnValue = CURL_SEEKFUNC_OK;
  }

  return returnValue;
}

long Easy::CbChunkBgn(curl_fileinfo* transferInfo, void* ptr, int remains) {
  Easy* obj = static_cast<Easy*>(ptr);

  assert(obj);

  // Check if we have a CHUNK_BGN callback
  auto it = obj->callbacks.find(CURLOPT_CHUNK_BGN_FUNCTION);
  assert(it != obj->callbacks.end() && "CHUNK_BGN callback not set.");

  int32_t returnValue = CURL_CHUNK_BGN_FUNC_FAIL;

  try {
    Napi::Env env = obj->Env();
    Napi::HandleScope scope(env);

    Napi::Function cb = it->second.Value();

    Napi::Object fileInfoObj = CreateV8ObjectFromCurlFileInfo(env, transferInfo);
    Napi::Number remainsArg = Napi::Number::New(env, remains);

    // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
    Napi::AsyncContext asyncContext(env, "Easy::CbChunkBgn");

    Napi::Value result = cb.MakeCallback(obj->Value(), {fileInfoObj, remainsArg}, asyncContext);

    // This is in theory not needed, as we have exceptions enabled
    if (env.IsExceptionPending()) {
      Napi::Error error = env.GetAndClearPendingException();
      obj->throwErrorMultiInterfaceAware(error);
      return returnValue;
    }

    if (result.IsEmpty() || !result.IsNumber()) {
      Napi::TypeError typeError =
          Napi::TypeError::New(env, "Return value from the CHUNK_BGN callback must be an integer.");
      obj->throwErrorMultiInterfaceAware(typeError);
    } else {
      returnValue = result.As<Napi::Number>().Int32Value();
    }

    return returnValue;

  } catch (const Napi::Error& e) {
    obj->throwErrorMultiInterfaceAware(e);
    return returnValue;
  }
}

long Easy::CbChunkEnd(void* ptr) {
  Easy* obj = static_cast<Easy*>(ptr);

  assert(obj);

  // Check if we have a CHUNK_END callback
  auto it = obj->callbacks.find(CURLOPT_CHUNK_END_FUNCTION);
  assert(it != obj->callbacks.end() && "CHUNK_END callback not set.");

  int32_t returnValue = CURL_CHUNK_END_FUNC_FAIL;

  try {
    Napi::Env env = obj->Env();
    Napi::HandleScope scope(env);

    Napi::Function cb = it->second.Value();

    // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
    Napi::AsyncContext asyncContext(env, "Easy::CbChunkEnd");

    Napi::Value result = cb.MakeCallback(obj->Value(), {}, asyncContext);

    // This is in theory not needed, as we have exceptions enabled
    if (env.IsExceptionPending()) {
      Napi::Error error = env.GetAndClearPendingException();
      obj->throwErrorMultiInterfaceAware(error);
      return returnValue;
    }

    if (result.IsEmpty() || !result.IsNumber()) {
      Napi::TypeError typeError =
          Napi::TypeError::New(env, "Return value from the CHUNK_END callback must be an integer.");
      obj->throwErrorMultiInterfaceAware(typeError);
    } else {
      returnValue = result.As<Napi::Number>().Int32Value();
    }

    return returnValue;

  } catch (const Napi::Error& e) {
    obj->throwErrorMultiInterfaceAware(e);
    return returnValue;
  }
}

int Easy::CbDebug(CURL* handle, curl_infotype type, char* data, size_t size, void* userptr) {
  Easy* obj = static_cast<Easy*>(userptr);

  assert(obj);

  // Check if we have a DEBUG callback
  auto it = obj->callbacks.find(CURLOPT_DEBUGFUNCTION);
  assert(it != obj->callbacks.end() && "DEBUG callback not set.");

  int32_t returnValue = 1;

  try {
    Napi::Env env = obj->Env();
    Napi::HandleScope scope(env);

    Napi::Function cb = it->second.Value();

    Napi::Number typeArg = Napi::Number::New(env, static_cast<int32_t>(type));
    Napi::Buffer<char> bufferArg = Napi::Buffer<char>::Copy(env, data, size);

    // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
    Napi::AsyncContext asyncContext(env, "Easy::CbDebug");

    Napi::Value result = cb.MakeCallback(obj->Value(), {typeArg, bufferArg}, asyncContext);

    // This is in theory not needed, as we have exceptions enabled
    if (env.IsExceptionPending()) {
      Napi::Error error = env.GetAndClearPendingException();
      obj->throwErrorMultiInterfaceAware(error);
      return returnValue;
    }

    if (result.IsEmpty() || !result.IsNumber()) {
      Napi::TypeError typeError =
          Napi::TypeError::New(env, "Return value from the DEBUG callback must be an integer.");
      obj->throwErrorMultiInterfaceAware(typeError);
    } else {
      returnValue = result.As<Napi::Number>().Int32Value();
    }

    return returnValue;

  } catch (const Napi::Error& e) {
    obj->throwErrorMultiInterfaceAware(e);
    return returnValue;
  }
}

int Easy::CbFnMatch(void* ptr, const char* pattern, const char* string) {
  Easy* obj = static_cast<Easy*>(ptr);

  assert(obj);

  // Check if we have a FNMATCH callback
  auto it = obj->callbacks.find(CURLOPT_FNMATCH_FUNCTION);
  assert(it != obj->callbacks.end() && "FNMATCH callback not set.");

  int32_t returnValue = CURL_FNMATCHFUNC_FAIL;

  try {
    Napi::Env env = obj->Env();
    Napi::HandleScope scope(env);

    Napi::Function cb = it->second.Value();

    Napi::String patternStr = Napi::String::New(env, pattern);
    Napi::String stringStr = Napi::String::New(env, string);

    // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
    Napi::AsyncContext asyncContext(env, "Easy::CbFnMatch");

    Napi::Value result = cb.MakeCallback(obj->Value(), {patternStr, stringStr}, asyncContext);

    // This is in theory not needed, as we have exceptions enabled
    if (env.IsExceptionPending()) {
      Napi::Error error = env.GetAndClearPendingException();
      obj->throwErrorMultiInterfaceAware(error);
      return returnValue;
    }

    if (result.IsEmpty() || !result.IsNumber()) {
      Napi::TypeError typeError =
          Napi::TypeError::New(env, "Return value from the FNMATCH callback must be an integer.");
      obj->throwErrorMultiInterfaceAware(typeError);
    } else {
      returnValue = result.As<Napi::Number>().Int32Value();
    }

    return returnValue;

  } catch (const Napi::Error& e) {
    obj->throwErrorMultiInterfaceAware(e);
    return returnValue;
  }
}

int Easy::CbProgress(void* clientp, double dltotal, double dlnow, double ultotal, double ulnow) {
  Easy* obj = static_cast<Easy*>(clientp);
  assert(obj);

  // default return of 1 will cause a CURLE_ABORTED_BY_CALLBACK.
  int32_t returnValue = 1;

  // See the thread here for explanation on why this flag is needed
  //  https://curl.haxx.se/mail/lib-2014-06/0062.html
  // This was fixed here
  //  https://github.com/curl/curl/commit/907520c4b93616bddea15757bbf0bfb45cde8101
  if (obj->isCbProgressAlreadyAborted) {
    return returnValue;
  }

  // Check if we have a progress callback
  auto it = obj->callbacks.find(CURLOPT_PROGRESSFUNCTION);
  if (it == obj->callbacks.end() || it->second.IsEmpty()) {
    return 0;
  }

  try {
    Napi::Env env = obj->Env();
    Napi::HandleScope scope(env);

    Napi::Function cb = it->second.Value();

    // async context
    // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
    Napi::AsyncContext asyncContext(env, "Easy::CbProgress");

    Napi::Value result =
        cb.MakeCallback(obj->Value(),
                        {Napi::Number::New(env, dltotal), Napi::Number::New(env, dlnow),
                         Napi::Number::New(env, ultotal), Napi::Number::New(env, ulnow)},
                        asyncContext);

    // Check if an exception occurred during callback execution
    if (env.IsExceptionPending()) {
      Napi::Error error = env.GetAndClearPendingException();

      obj->throwErrorMultiInterfaceAware(error);
    } else if (result.IsNumber()) {
      returnValue = result.As<Napi::Number>().Int32Value();
    } else if (!result.IsUndefined()) {
      Napi::TypeError typeError = Napi::TypeError::New(
          env, "Return value from the PROGRESS callback must be an integer or undefined.");
      obj->throwErrorMultiInterfaceAware(typeError);
    }

  } catch (const Napi::Error& e) {
    obj->throwErrorMultiInterfaceAware(e);
  }

#if NODE_LIBCURL_VER_GE(7, 68, 0)
  if (returnValue && returnValue != CURL_PROGRESSFUNC_CONTINUE) {
#else
  if (returnValue) {
#endif
    obj->isCbProgressAlreadyAborted = true;
  }

  return returnValue;
}

int Easy::CbXferinfo(void* clientp, curl_off_t dltotal, curl_off_t dlnow, curl_off_t ultotal,
                     curl_off_t ulnow) {
  Easy* obj = static_cast<Easy*>(clientp);
  assert(obj);

  // default return of 1 will cause a CURLE_ABORTED_BY_CALLBACK.
  int32_t returnValue = 1;

  // same check than above, see it for comments.
  if (obj->isCbProgressAlreadyAborted) {
    return returnValue;
  }

  // Check if we have a xferinfo callback
#if NODE_LIBCURL_VER_GE(7, 32, 0)
  auto it = obj->callbacks.find(CURLOPT_XFERINFOFUNCTION);
#else
  // just to make it compile ¯\_(ツ)_/¯
  auto it = obj->callbacks.end();
#endif

  assert(it != obj->callbacks.end() && "XFERINFO callback not set.");

  try {
    Napi::Env env = obj->Env();
    Napi::HandleScope scope(env);

    Napi::Function cb = it->second.Value();

    // async context
    // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
    Napi::AsyncContext asyncContext(env, "Easy::CbXferinfo");

    // Call the callback with proper error handling
    Napi::Value result = cb.MakeCallback(obj->Value(),
                                         {Napi::Number::New(env, static_cast<double>(dltotal)),
                                          Napi::Number::New(env, static_cast<double>(dlnow)),
                                          Napi::Number::New(env, static_cast<double>(ultotal)),
                                          Napi::Number::New(env, static_cast<double>(ulnow))},
                                         asyncContext);

    // This is in theory not needed, as we have exceptions enabled
    if (env.IsExceptionPending()) {
      Napi::Error error = env.GetAndClearPendingException();
      obj->throwErrorMultiInterfaceAware(error);
    } else if (result.IsEmpty() || !result.IsNumber()) {
      Napi::TypeError typeError =
          Napi::TypeError::New(env, "Return value from the XFERINFO callback must be an integer.");
      obj->throwErrorMultiInterfaceAware(typeError);
    } else {
      returnValue = result.As<Napi::Number>().Int32Value();
    }

  } catch (const Napi::Error& e) {
    obj->throwErrorMultiInterfaceAware(e);
  }

#if NODE_LIBCURL_VER_GE(7, 68, 0)
  if (returnValue && returnValue != CURL_PROGRESSFUNC_CONTINUE) {
#else
  if (returnValue) {
#endif
    obj->isCbProgressAlreadyAborted = true;
  }

  return returnValue;
}

int Easy::CbHstsRead(CURL* handle, struct curl_hstsentry* sts, void* userdata) {
#if NODE_LIBCURL_VER_GE(7, 74, 0)
  Easy* obj = static_cast<Easy*>(userdata);

  assert(obj);

  // Check if we have a HSTS read callback
  auto it = obj->callbacks.find(CURLOPT_HSTSREADFUNCTION);
  assert(it != obj->callbacks.end() && "HSTSREADFUNCTION callback not set.");

  int32_t returnValue = CURLSTS_FAIL;

  try {
    Napi::Env env = obj->Env();
    Napi::HandleScope scope(env);

    Napi::Value cacheEntryObject;

    const std::string typeError =
        "Return value from the HSTSREADFUNCTION callback must be one of the following:\n"
        "  - Object matching the type CurlHstsEntry\n"
        "  - An array matching the type CurlHstsEntry[]\n"
        "  - null\n"
        "Libcurl <= 7.79.0 does not stop requests from firing if there are errors in the HSTS "
        "callback, thus you may be receiving an error while the request did in fact work. Please "
        "fix the HSTS callback to return the correct data to avoid this.";

    if (obj->hstsReadCache.size() > 0) {
      cacheEntryObject = obj->hstsReadCache.back().Value();

      // Reset and remove the cached entry
      obj->hstsReadCache.back().Reset();
      obj->hstsReadCache.pop_back();
    } else {
      // If this is true, we got all entries in cache provided by user
      if (obj->wasHstsReadCacheSet) {
        obj->wasHstsReadCacheSet = false;
        return CURLSTS_DONE;
      }

      Napi::Function cb = it->second.Value();

      // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
      Napi::AsyncContext asyncContext(env, "Easy::CbHstsRead");

      Napi::Object cbArg = Napi::Object::New(env);
      cbArg.Set("maxHostLengthBytes", Napi::Number::New(env, sts->namelen));

      Napi::Value result = cb.MakeCallback(obj->Value(), {cbArg}, asyncContext);

      // This is in theory not needed, as we have exceptions enabled
      if (env.IsExceptionPending()) {
        Napi::Error error = env.GetAndClearPendingException();
        obj->throwErrorMultiInterfaceAware(error);
        return returnValue;
      }

      if (result.IsEmpty()) {
        Napi::TypeError error = Napi::TypeError::New(env, typeError);
        obj->throwErrorMultiInterfaceAware(error);
        return returnValue;
      }

      cacheEntryObject = result;
    }

    // Handle null return (indicates done)
    if (cacheEntryObject.IsNull()) {
      return CURLSTS_DONE;
    }

    // returning an array from the callback can be used to avoid multiple
    // context switches between v8 and js
    if (cacheEntryObject.IsArray()) {
      Napi::Array cacheArray = cacheEntryObject.As<Napi::Array>();
      uint32_t cacheArrayLength = cacheArray.Length();

      if (cacheArrayLength == 0) {
        return CURLSTS_DONE;
      }

      // Insert in reverse order as we process the hstsReadCache stack from back to front
      for (int i = cacheArrayLength - 1; i >= 0; i--) {
        Napi::Value idxValue = cacheArray[static_cast<uint32_t>(i)];

        // Check for array within array (not allowed)
        if (!idxValue.IsObject() || idxValue.IsArray()) {
          Napi::TypeError error = Napi::TypeError::New(env, typeError);
          obj->throwErrorMultiInterfaceAware(error);
          return returnValue;
        }

        Napi::Reference<Napi::Object> persistentValue =
            Napi::Persistent(idxValue.As<Napi::Object>());
        obj->hstsReadCache.push_back(std::move(persistentValue));
      }

      cacheEntryObject = obj->hstsReadCache.back().Value();
      obj->hstsReadCache.back().Reset();
      obj->hstsReadCache.pop_back();
      obj->wasHstsReadCacheSet = true;
    }

    // Process single object entry
    if (cacheEntryObject.IsObject()) {
      Napi::Object cacheEntry = cacheEntryObject.As<Napi::Object>();

      Napi::Value hostProperty = cacheEntry.Get("host");
      Napi::Value includeSubDomainsProperty = cacheEntry.Get("includeSubDomains");
      Napi::Value expireProperty = cacheEntry.Get("expire");

      // Validate property types
      if (!hostProperty.IsString() ||
          (!includeSubDomainsProperty.IsUndefined() && !includeSubDomainsProperty.IsNull() &&
           !includeSubDomainsProperty.IsBoolean()) ||
          (!expireProperty.IsUndefined() && !expireProperty.IsNull() &&
           !expireProperty.IsString())) {
        Napi::TypeError error = Napi::TypeError::New(env, typeError);
        obj->throwErrorMultiInterfaceAware(error);
        return returnValue;
      }

      std::string hostStrValue = hostProperty.As<Napi::String>().Utf8Value();

      if (hostStrValue.length() > sts->namelen) {
        std::string lengthError =
            "The host property value returned from the HSTSREADFUNCTION callback function was "
            "invalid. The host string is too long.\n"
            "Libcurl <= 7.79.0 does not stop requests from firing if there are errors in the HSTS "
            "callback, thus you may be receiving an error while the request did in fact work. "
            "Please fix the HSTS callback to return the correct data to avoid this.";
        Napi::TypeError error = Napi::TypeError::New(env, lengthError);
        obj->throwErrorMultiInterfaceAware(error);
        return returnValue;
      }

      // Set host name
      strncpy(sts->name, hostStrValue.c_str(), sts->namelen);
      sts->name[sts->namelen - 1] = '\0';  // Ensure null termination

      // Set includeSubDomains
      if (!includeSubDomainsProperty.IsUndefined() && !includeSubDomainsProperty.IsNull()) {
        sts->includeSubDomains = includeSubDomainsProperty.As<Napi::Boolean>().Value() ? 1 : 0;
      }

      // Handle expire property
      if (expireProperty.IsString()) {
        // make sure expire length is one expected by libcurl
        // YYYYMMDD HH:MM:SS [null-terminated]
        std::string expireStrValue = expireProperty.As<Napi::String>().Utf8Value();
        size_t expectedSize = sizeof(sts->expire) / sizeof(sts->expire[0]) - 1;

        if (expireStrValue.length() != expectedSize) {
          std::string expireError =
              "The expire property value returned from the HSTSREADFUNCTION callback function was "
              "invalid. String is either too long, or too short.\n"
              "Libcurl <= 7.79.0 does not stop requests from firing if there are errors in the "
              "HSTS "
              "callback, thus you may be receiving an error while the request did in fact work. "
              "Please fix the HSTS callback to return the correct data to avoid this.";
          Napi::TypeError error = Napi::TypeError::New(env, expireError);
          obj->throwErrorMultiInterfaceAware(error);
          return returnValue;
        }

        strcpy(sts->expire, expireStrValue.c_str());
      } else {
        // TODO(jonathan): libcurl <= 7.79 has a bug when expire is not set, see:
        // https://github.com/curl/curl/issues/7720 - to avoid this bug we are setting it manually
        // to a future date here
        strcpy(sts->expire, TIME_IN_THE_FUTURE);
      }

      returnValue = CURLSTS_OK;
    } else {
      Napi::TypeError error = Napi::TypeError::New(env, typeError);
      obj->throwErrorMultiInterfaceAware(error);
    }

    return returnValue;

  } catch (const Napi::Error& e) {
    obj->throwErrorMultiInterfaceAware(e);
    return returnValue;
  }
#else
  return 0;
#endif
}

int Easy::CbHstsWrite(CURL* handle, struct curl_hstsentry* sts, struct curl_index* count,
                      void* userdata) {
#if NODE_LIBCURL_VER_GE(7, 74, 0)
  Easy* obj = static_cast<Easy*>(userdata);

  assert(obj);

  // Check if we have a HSTS write callback
  auto it = obj->callbacks.find(CURLOPT_HSTSWRITEFUNCTION);
  assert(it != obj->callbacks.end() && "HSTSWRITEFUNCTION callback not set.");

  int32_t returnValue = CURLSTS_FAIL;

  try {
    Napi::Env env = obj->Env();
    Napi::HandleScope scope(env);

    Napi::Function cb = it->second.Value();

    // Create the count object
    Napi::Object countObj = Napi::Object::New(env);
    countObj.Set("index", Napi::Number::New(env, static_cast<uint32_t>(count->index)));
    countObj.Set("total", Napi::Number::New(env, static_cast<uint32_t>(count->total)));

    Napi::Object hstsEntry = CreateV8ObjectFromCurlHstsEntry(env, sts);

    // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
    Napi::AsyncContext asyncContext(env, "Easy::CbHstsWrite");

    Napi::Value result = cb.MakeCallback(obj->Value(), {hstsEntry, countObj}, asyncContext);

    if (env.IsExceptionPending()) {
      Napi::Error error = env.GetAndClearPendingException();
      obj->throwErrorMultiInterfaceAware(error);
      return returnValue;
    }

    bool isInvalid = result.IsEmpty() || !result.IsNumber();

    if (isInvalid) {
      Napi::TypeError typeError = Napi::TypeError::New(
          env, "Return value from the HSTSWRITEFUNCTION callback must be an integer.");
      obj->throwErrorMultiInterfaceAware(typeError);
      return returnValue;
    }

    returnValue = result.As<Napi::Number>().Int32Value();
    return returnValue;

  } catch (const Napi::Error& e) {
    obj->throwErrorMultiInterfaceAware(e);
    return returnValue;
  }
#else
  return 0;
#endif
}

int Easy::CbPreReq(void* clientp, char* conn_primary_ip, char* conn_local_ip, int conn_primary_port,
                   int conn_local_port) {
#if NODE_LIBCURL_VER_GE(7, 80, 0)
  Easy* obj = static_cast<Easy*>(clientp);

  assert(obj);

  // Check if we have a prereq callback
  auto it = obj->callbacks.find(CURLOPT_PREREQFUNCTION);
  assert(it != obj->callbacks.end() && "Pre req callback not set.");

  try {
    Napi::Env env = obj->Env();
    Napi::HandleScope scope(env);

    Napi::Function cb = it->second.Value();

    Napi::String connPrimaryIp = Napi::String::New(env, conn_primary_ip);
    Napi::String connLocalIp = Napi::String::New(env, conn_local_ip);
    Napi::Number connPrimaryPort = Napi::Number::New(env, conn_primary_port);
    Napi::Number connLocalPort = Napi::Number::New(env, conn_local_port);

    // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
    Napi::AsyncContext asyncContext(env, "Easy::CbPreReq");

    Napi::Value result = cb.MakeCallback(
        obj->Value(), {connPrimaryIp, connLocalIp, connPrimaryPort, connLocalPort}, asyncContext);

    // This is in theory not needed, as we have exceptions enabled
    if (env.IsExceptionPending()) {
      Napi::Error error = env.GetAndClearPendingException();
      obj->throwErrorMultiInterfaceAware(error);
      return CURL_PREREQFUNC_ABORT;
    }

    // Validate return value - should be a number
    bool isInvalid = result.IsEmpty() || !result.IsNumber();

    if (isInvalid) {
      Napi::TypeError typeError =
          Napi::TypeError::New(env, "Return value from the PREREQ callback must be a number.");
      obj->throwErrorMultiInterfaceAware(typeError);
      return CURL_PREREQFUNC_ABORT;
    }

    int returnValue = result.As<Napi::Number>().Int32Value();
    return returnValue;

  } catch (const Napi::Error& e) {
    obj->throwErrorMultiInterfaceAware(e);
    return CURL_PREREQFUNC_ABORT;
  }
#else
  return 0;
#endif
}

int Easy::CbTrailer(struct curl_slist** headerList, void* userdata) {
#if NODE_LIBCURL_VER_GE(7, 64, 0)
  Easy* obj = static_cast<Easy*>(userdata);

  assert(obj);

  // Check if we have a trailer callback
  auto it = obj->callbacks.find(CURLOPT_TRAILERFUNCTION);
  assert(it != obj->callbacks.end() && "Trailer callback not set.");

  try {
    Napi::Env env = obj->Env();
    Napi::HandleScope scope(env);

    Napi::Function cb = it->second.Value();

    // TODO(jonathan, migration): capture this when perform is called (either on Easy or Multi)
    Napi::AsyncContext asyncContext(env, "Easy::CbTrailer");

    Napi::Value result = cb.MakeCallback(obj->Value(), {}, asyncContext);

    // This is in theory not needed, as we have exceptions enabled
    if (env.IsExceptionPending()) {
      Napi::Error error = env.GetAndClearPendingException();
      obj->throwErrorMultiInterfaceAware(error);
      return CURL_TRAILERFUNC_ABORT;
    }

    // Validate return value - should be array of strings or false
    bool isInvalid = result.IsEmpty() || (!result.IsArray() && !result.IsBoolean());

    if (isInvalid) {
      Napi::TypeError typeError = Napi::TypeError::New(
          env, "Return value from the Trailer callback must be an array of strings or false.");
      obj->throwErrorMultiInterfaceAware(typeError);
      return CURL_TRAILERFUNC_ABORT;
    }

    // If callback returns false, abort
    if (result.IsBoolean() && result.As<Napi::Boolean>().Value() == false) {
      return CURL_TRAILERFUNC_ABORT;
    }

    // Process array of header strings
    if (result.IsArray()) {
      Napi::Array headers = result.As<Napi::Array>();
      uint32_t length = headers.Length();

      for (uint32_t i = 0; i < length; ++i) {
        Napi::Value headerValue = headers[i];

        if (!headerValue.IsString()) {
          Napi::TypeError typeError = Napi::TypeError::New(
              env, "Return value from the Trailer callback must be an array of strings or false.");
          obj->throwErrorMultiInterfaceAware(typeError);
          return CURL_TRAILERFUNC_ABORT;
        }

        std::string headerStr = headerValue.As<Napi::String>().Utf8Value();
        *headerList = curl_slist_append(*headerList, headerStr.c_str());
      }
    }

    return CURL_TRAILERFUNC_OK;

  } catch (const Napi::Error& e) {
    obj->throwErrorMultiInterfaceAware(e);
    return CURL_TRAILERFUNC_ABORT;
  }
#else
  return 0;
#endif
}

Napi::Object Easy::FromCURLHandle(Napi::Env env, CURL* handle) {
  // this is a static method possibly called from outside a Node.js callstack
  // thus we need to properly handle the scopes.
  Napi::EscapableHandleScope scope(env);

  Napi::External<CURL> curlEasyHandle = Napi::External<CURL>::New(env, handle);

  auto curl = env.GetInstanceData<Curl>();
  auto newInstance = curl->EasyConstructor.New({curlEasyHandle});

  return scope.Escape(newInstance).ToObject();
}

#if NODE_LIBCURL_VER_GE(7, 74, 0)

Napi::Object Easy::CreateV8ObjectFromCurlHstsEntry(Napi::Env env, struct curl_hstsentry* sts) {
  Napi::EscapableHandleScope scope(env);

  auto hasExpire = !!sts->expire[0] && !!strcmp(sts->expire, TIME_IN_THE_FUTURE);

  Napi::String host = Napi::String::New(env, sts->name);
  Napi::Boolean includeSubDomains = Napi::Boolean::New(env, !!sts->includeSubDomains);
  Napi::Value expire = hasExpire ? Napi::String::New(env, sts->expire).As<Napi::Value>()
                                 : env.Null().As<Napi::Value>();

  Napi::Object obj = Napi::Object::New(env);
  obj.Set("host", host);
  obj.Set("includeSubDomains", includeSubDomains);
  obj.Set("expire", expire);

  return scope.Escape(obj).ToObject();
}
#endif

Napi::Object Easy::CreateV8ObjectFromCurlFileInfo(Napi::Env env, curl_fileinfo* fileInfo) {
  Napi::EscapableHandleScope scope(env);

  auto nullValueIfInvalidString = [&env](char* str) -> Napi::Value {
    return (str && str[0] != '\0') ? Napi::String::New(env, str) : env.Null().As<Napi::Value>();
  };

  Napi::Object obj = Napi::Object::New(env);

  obj.Set("filename", nullValueIfInvalidString(fileInfo->filename));
  obj.Set("filetype", Napi::Number::New(env, fileInfo->filetype));

  obj.Set("time", fileInfo->time != 0
                      ? Napi::Date::New(env, static_cast<double>(fileInfo->time) * 1000)
                      : env.Null());
  obj.Set("perm", Napi::Number::New(env, fileInfo->perm));
  obj.Set("uid", Napi::Number::New(env, fileInfo->uid));
  obj.Set("gid", Napi::Number::New(env, fileInfo->gid));
  obj.Set("size", Napi::Number::New(env, static_cast<double>(fileInfo->size)));
  obj.Set("hardlinks", Napi::Number::New(env, fileInfo->hardlinks));

  Napi::Object strings = Napi::Object::New(env);
  strings.Set("time", nullValueIfInvalidString(fileInfo->strings.time));
  strings.Set("perm", nullValueIfInvalidString(fileInfo->strings.perm));
  strings.Set("user", nullValueIfInvalidString(fileInfo->strings.user));
  strings.Set("group", nullValueIfInvalidString(fileInfo->strings.group));
  strings.Set("target", nullValueIfInvalidString(fileInfo->strings.target));

  obj.Set("strings", strings);

  return scope.Escape(obj).ToObject();
}

}  // namespace NodeLibcurl
