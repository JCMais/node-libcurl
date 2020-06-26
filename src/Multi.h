/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#ifndef NODELIBCURL_MULTI_H
#define NODELIBCURL_MULTI_H

#include "Curl.h"
#include "macros.h"
#include "make_unique.h"

#include <curl/curl.h>
#include <nan.h>
#include <node.h>

#include <map>

namespace NodeLibcurl {

class Multi : public Nan::ObjectWrap {
  // instance methods
  Multi();
  ~Multi();

  Multi(const Multi& that);
  Multi& operator=(const Multi& that);

  void Dispose();
  void ProcessMessages();
  void CallOnMessageCallback(CURL* easy, CURLcode statusCode);

  // context used with curl_multi_assign to create a relationship between the
  // socket being used and the poll handle.
  struct CurlSocketContext {
    uv_mutex_t mutex;
    uv_poll_t pollHandle;
    curl_socket_t sockfd;
    Multi* multi;
  };

  // members
  CURLM* mh;
  bool isOpen = true;
  int amountOfHandles = 0;
  int runningHandles = 0;

  // callbacks
  typedef std::map<CURLMoption, std::shared_ptr<Nan::Callback>> CallbacksMap;
  CallbacksMap callbacks = CallbacksMap{};
  // required as it's not specific to a single message
  std::shared_ptr<Nan::Callback> cbOnMessage;

  deleted_unique_ptr<uv_timer_t> timeout;

  // static helper methods
  static CurlSocketContext* CreateCurlSocketContext(curl_socket_t sockfd, Multi* multi);
  static void DestroyCurlSocketContext(CurlSocketContext* ctx);
  // js object constructor template
  static Nan::Persistent<v8::FunctionTemplate> constructor;

  // js available Methods
  static NAN_METHOD(New);
  static NAN_METHOD(SetOpt);
  static NAN_METHOD(AddHandle);
  static NAN_METHOD(OnMessage);
  static NAN_METHOD(RemoveHandle);
  static NAN_METHOD(GetCount);
  static NAN_METHOD(Close);
  static NAN_METHOD(StrError);

  // libcurl multi_setopt callbacks
  static int HandleSocket(CURL* easy, curl_socket_t s, int action, void* userp, void* socketp);
  static int HandleTimeout(CURLM* multi, long timeoutMs, void* userp);  // NOLINT(runtime/int)
  static int CbPushFunction(CURL* parent, CURL* child,
                            size_t numberOfHeaders,  // NOLINT(runtime/int)
                            struct curl_pushheaders* headers, void* userPtr);

  // libuv events
  static UV_TIMER_CB(OnTimeout);
  static void OnTimerClose(uv_handle_t* handle);
  static void OnSocket(uv_poll_t* handle, int status, int events);
  static void OnSocketClose(uv_handle_t* handle);

 public:
  // export Multi to js
  static NAN_MODULE_INIT(Initialize);
};

}  // namespace NodeLibcurl
#endif
