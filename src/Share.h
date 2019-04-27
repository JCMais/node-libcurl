/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifndef NODELIBCURL_SHARE_H
#define NODELIBCURL_SHARE_H

#include <curl/curl.h>
#include <nan.h>
#include <node.h>

namespace NodeLibcurl {

class Share : public Nan::ObjectWrap {
  Share();

  Share(const Share& that);
  Share& operator=(const Share& that);

  ~Share();

  // instance methods
  void Dispose();

 public:
  // js object constructor template
  static Nan::Persistent<v8::FunctionTemplate> constructor;

  // members
  CURLSH* sh;
  bool isOpen;

  // export Easy to js
  static NAN_MODULE_INIT(Initialize);

  // js available methods
  static NAN_METHOD(New);
  static NAN_METHOD(SetOpt);
  static NAN_METHOD(Close);
  static NAN_METHOD(StrError);
};
}  // namespace NodeLibcurl
#endif
