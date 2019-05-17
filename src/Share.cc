/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "Share.h"

#include <iostream>

// 464 was allocated on Win64
//  Value too small to bother letting v8 know about it
#define MEMORY_PER_HANDLE 464

namespace NodeLibcurl {

Nan::Persistent<v8::FunctionTemplate> Share::constructor;

Share::Share() : isOpen(true) {
  this->sh = curl_share_init();

  assert(this->sh);
}

Share::~Share(void) {
  if (this->isOpen) {
    this->Dispose();
  }
}

void Share::Dispose() {
  assert(this->isOpen && "This handle was already closed.");
  assert(this->sh && "The share handle ran away.");

  CURLSHcode code = curl_share_cleanup(this->sh);
  assert(code == CURLSHE_OK);

  this->isOpen = false;
}

NAN_MODULE_INIT(Share::Initialize) {
  Nan::HandleScope scope;

  // Easy js "class" function template initialization
  v8::Local<v8::FunctionTemplate> tmpl = Nan::New<v8::FunctionTemplate>(Share::New);
  tmpl->SetClassName(Nan::New("Share").ToLocalChecked());
  tmpl->InstanceTemplate()->SetInternalFieldCount(1);

  // prototype methods
  Nan::SetPrototypeMethod(tmpl, "setOpt", Share::SetOpt);
  Nan::SetPrototypeMethod(tmpl, "close", Share::Close);

  // static methods
  Nan::SetMethod(tmpl, "strError", Share::StrError);

  Share::constructor.Reset(tmpl);

  Nan::Set(target, Nan::New("Share").ToLocalChecked(), Nan::GetFunction(tmpl).ToLocalChecked());
}

NAN_METHOD(Share::New) {
  if (!info.IsConstructCall()) {
    Nan::ThrowError("You must use \"new\" to instantiate this object.");
  }

  Share* obj = new Share();

  obj->Wrap(info.This());
  info.GetReturnValue().Set(info.This());
}

NAN_METHOD(Share::SetOpt) {
  Nan::HandleScope scope;

  Share* obj = Nan::ObjectWrap::Unwrap<Share>(info.This());

  if (!obj->isOpen) {
    Nan::ThrowError("Share handle is closed.");
    return;
  }

  v8::Local<v8::Value> opt = info[0];
  v8::Local<v8::Value> value = info[1];

  CURLSHcode setOptRetCode = CURLSHE_BAD_OPTION;
  int32_t optionId = -1;

  if (!value->IsInt32()) {
    Nan::ThrowError("Option value must be an integer.");
    return;
  }

  if (opt->IsInt32()) {
    optionId = Nan::To<int32_t>(opt).FromJust();
  } else if (opt->IsString()) {
    Nan::Utf8String option(opt);

    std::string optionString(*option);

    if (optionString == "SHARE") {
      optionId = static_cast<int>(CURLSHOPT_SHARE);
    } else if (optionString == "UNSHARE") {
      optionId = static_cast<int>(CURLSHOPT_UNSHARE);
    }
  }

  setOptRetCode = curl_share_setopt(obj->sh, static_cast<CURLSHoption>(optionId),
                                    Nan::To<int32_t>(value).FromJust());

  info.GetReturnValue().Set(setOptRetCode);
}

NAN_METHOD(Share::Close) {
  Nan::HandleScope scope;

  Share* obj = Nan::ObjectWrap::Unwrap<Share>(info.This());

  if (!obj->isOpen) {
    Nan::ThrowError("Share handle already closed.");
    return;
  }

  obj->Dispose();

  return;
}

NAN_METHOD(Share::StrError) {
  Nan::HandleScope scope;

  v8::Local<v8::Value> errCode = info[0];

  if (!errCode->IsInt32()) {
    Nan::ThrowTypeError("Invalid errCode passed to Share.strError.");
    return;
  }

  const char* errorMsg =
      curl_share_strerror(static_cast<CURLSHcode>(Nan::To<int32_t>(errCode).FromJust()));

  v8::Local<v8::String> ret = Nan::New(errorMsg).ToLocalChecked();

  info.GetReturnValue().Set(ret);
}

}  // namespace NodeLibcurl
