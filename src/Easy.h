/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#pragma once

#include "macros.h"

#include <curl/curl.h>
#include <node_api.h>

#include <map>
#include <memory>
#include <napi.h>
#include <uv.h>
#include <vector>

namespace NodeLibcurl {

extern const napi_type_tag EASY_TYPE_TAG;

// Forward declaration
class Multi;

class Easy : public Napi::ObjectWrap<Easy> {
 public:
  Easy(const Napi::CallbackInfo& info);
  // TODO(jonathan, migration): missing implementation for these
  // explicit Easy(Easy* orig);
  // explicit Easy(CURL* easy);

  // Easy(const Easy& that);
  // Easy& operator=(const Easy& that);
  ~Easy();

  static Napi::Function Init(Napi::Env env, Napi::Object exports);

  Napi::Value SetOpt(const Napi::CallbackInfo& info);
  Napi::Value GetInfo(const Napi::CallbackInfo& info);
  Napi::Value Send(const Napi::CallbackInfo& info);
  Napi::Value Recv(const Napi::CallbackInfo& info);
  Napi::Value Perform(const Napi::CallbackInfo& info);
  Napi::Value Upkeep(const Napi::CallbackInfo& info);
  Napi::Value Pause(const Napi::CallbackInfo& info);
  Napi::Value Reset(const Napi::CallbackInfo& info);
  Napi::Value DupHandle(const Napi::CallbackInfo& info);
  Napi::Value OnSocketEvent(const Napi::CallbackInfo& info);
  Napi::Value MonitorSocketEvents(const Napi::CallbackInfo& info);
  Napi::Value UnmonitorSocketEvents(const Napi::CallbackInfo& info);
  Napi::Value Close(const Napi::CallbackInfo& info);

  static Napi::Value StrError(const Napi::CallbackInfo& info);

  // Debug support
  uint64_t GetDebugId() const { return id; }

  // Getters
  Napi::Value GetterId(const Napi::CallbackInfo& info);
  Napi::Value GetterIsInsideMultiHandle(const Napi::CallbackInfo& info);
  Napi::Value GetterIsMonitoringSockets(const Napi::CallbackInfo& info);
  Napi::Value GetterIsOpen(const Napi::CallbackInfo& info);

  // Public members
  CURL* ch;
  bool isInsideMultiHandle = false;
  bool isOpen = true;
  uint64_t id;

  // Callback error for Multi interface
  Napi::ObjectReference callbackError;

  // Helper to create Easy from CURL handle
  static Napi::Object FromCURLHandle(Napi::Env env, CURL* handle);

 private:
  // Internal class for cleanup management
  class ToFree;

  // Private methods
  void Dispose();
  void DisposeInternalData();
  void ResetRequiredHandleOptions(bool isFromDuplicate);
  void CopyOtherData(Easy* orig);
  void CallSocketEvent(int status, int events);
  void MonitorSockets();
  void UnmonitorSockets();
  void inline throwErrorMultiInterfaceAware(const Napi::Error& error) noexcept;

  size_t OnData(char* data, size_t size, size_t nmemb);
  size_t OnHeader(char* data, size_t size, size_t nmemb);

  // Callback management
  typedef std::map<CURLoption, Napi::FunctionReference> CallbacksMap;
  CallbacksMap callbacks;
  Napi::FunctionReference cbOnSocketEvent;
  std::shared_ptr<Napi::AsyncContext> cbOnSocketEventAsyncContext;

  // Members for socket monitoring
  uv_poll_t* socketPollHandle = nullptr;
  bool isMonitoringSockets = false;

  // Members for progress callback
  bool isCbProgressAlreadyAborted = false;

  // File operations
  int32_t readDataFileDescriptor = -1;
  curl_off_t readDataOffset = -1;

  // Memory management
  std::shared_ptr<ToFree> toFree = nullptr;

  // HSTS cache
  std::vector<Napi::Reference<Napi::Object>> hstsReadCache;
  bool wasHstsReadCacheSet = false;

  // Static members
  static std::atomic<uint64_t> nextId;

  // Static cURL callbacks
  static size_t ReadFunction(char* ptr, size_t size, size_t nmemb, void* userdata);
  static size_t SeekFunction(void* userdata, curl_off_t offset, int origin);
  static size_t HeaderFunction(char* ptr, size_t size, size_t nmemb, void* userdata);
  static size_t WriteFunction(char* ptr, size_t size, size_t nmemb, void* userdata);
  static long CbChunkBgn(curl_fileinfo* transferInfo, void* ptr, int remains);
  static long CbChunkEnd(void* ptr);
  static int CbDebug(CURL* handle, curl_infotype type, char* data, size_t size, void* userptr);
  static int CbFnMatch(void* ptr, const char* pattern, const char* string);
  static int CbProgress(void* clientp, double dltotal, double dlnow, double ultotal, double ulnow);
  static int CbXferinfo(void* clientp, curl_off_t dltotal, curl_off_t dlnow, curl_off_t ultotal,
                        curl_off_t ulnow);
  static int CbHstsRead(CURL* handle, struct curl_hstsentry* sts, void* userdata);
  static int CbHstsWrite(CURL* handle, struct curl_hstsentry* sts, struct curl_index* count,
                         void* userdata);
  static int CbPreReq(void* clientp, char* conn_primary_ip, char* conn_local_ip,
                      int conn_primary_port, int conn_local_port);
  static int CbTrailer(struct curl_slist** headerList, void* userdata);

  // libuv callbacks
  static void OnSocket(uv_poll_t* handle, int status, int events);
  static void OnSocketClose(uv_handle_t* handle);

  // Helper methods
  template <typename TResultType, typename Tv8MappingType>
  static Napi::Value GetInfoTmpl(const Easy* obj, int infoId);
  static Napi::Object CreateV8ObjectFromCurlFileInfo(Napi::Env env, curl_fileinfo* fileInfo);
#if NODE_LIBCURL_VER_GE(7, 74, 0)
  static Napi::Object CreateV8ObjectFromCurlHstsEntry(Napi::Env env, struct curl_hstsentry* sts);
#endif

  // Prevent copying
  Easy(const Easy& that) = delete;
  Easy& operator=(const Easy& that) = delete;
};

}  // namespace NodeLibcurl
