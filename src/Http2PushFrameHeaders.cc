/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#include "Http2PushFrameHeaders.h"

#include <iostream>

namespace NodeLibcurl {

Nan::Persistent<v8::ObjectTemplate> Http2PushFrameHeaders::objectTemplate;

Http2PushFrameHeaders::Http2PushFrameHeaders(struct curl_pushheaders* headers,
                                             size_t numberOfHeaders) {
  this->headers = headers;
  this->numberOfHeaders = numberOfHeaders;
}

v8::Local<v8::Object> Http2PushFrameHeaders::NewInstance(struct curl_pushheaders* headers,
                                                         size_t numberOfHeaders) {
  Nan::EscapableHandleScope scope;

  v8::Local<v8::Object> jsObj = Nan::NewInstance(Nan::New(objectTemplate)).ToLocalChecked();

  Http2PushFrameHeaders* cppObj = new Http2PushFrameHeaders(headers, numberOfHeaders);
  cppObj->Wrap(jsObj);

  return scope.Escape(jsObj);
}

NAN_METHOD(Http2PushFrameHeaders::GetByIndex) {
  Nan::HandleScope scope;

  v8::Local<v8::Value> value = info[0];

  if (!value->IsUint32()) {
    Nan::ThrowTypeError("Index must be a non-negative integer");
    return;
  }

  Http2PushFrameHeaders* obj = Nan::ObjectWrap::Unwrap<Http2PushFrameHeaders>(info.This());
  uint32_t val = Nan::To<uint32_t>(value).FromJust();

  char* result = curl_pushheader_bynum(obj->headers, static_cast<size_t>(val));

  v8::Local<v8::Value> returnValue =
      result == NULL ? Nan::Null().As<v8::Value>()
                     : Nan::New<v8::String>(result).ToLocalChecked().As<v8::Value>();

  info.GetReturnValue().Set(returnValue);
}

NAN_METHOD(Http2PushFrameHeaders::GetByName) {
  Nan::HandleScope scope;

  v8::Local<v8::Value> value = info[0];

  if (!value->IsString()) {
    Nan::ThrowTypeError("Name must be a string");
    return;
  }

  Http2PushFrameHeaders* obj = Nan::ObjectWrap::Unwrap<Http2PushFrameHeaders>(info.This());

  Nan::Utf8String utf8String(value);

  char* result = curl_pushheader_byname(obj->headers, *utf8String);

  v8::Local<v8::Value> returnValue =
      result == NULL ? Nan::Null().As<v8::Value>()
                     : Nan::New<v8::String>(result).ToLocalChecked().As<v8::Value>();

  info.GetReturnValue().Set(returnValue);
}

NAN_GETTER(Http2PushFrameHeaders::GetterNumberOfHeaders) {
  Nan::HandleScope scope;

  Http2PushFrameHeaders* obj = Nan::ObjectWrap::Unwrap<Http2PushFrameHeaders>(info.This());

  info.GetReturnValue().Set(Nan::New<v8::Uint32>(static_cast<uint32_t>(obj->numberOfHeaders)));
}

NAN_MODULE_INIT(Http2PushFrameHeaders::Initialize) {
  Nan::HandleScope scope;

  v8::Local<v8::ObjectTemplate> objTmpl = Nan::New<v8::ObjectTemplate>();
  objTmpl->SetInternalFieldCount(1);

  v8::PropertyAttribute attributes =
      static_cast<v8::PropertyAttribute>(v8::ReadOnly | v8::DontDelete);

  Nan::SetAccessor(objTmpl, Nan::New("numberOfHeaders").ToLocalChecked(),
                   Http2PushFrameHeaders::GetterNumberOfHeaders, 0, v8::Local<v8::Value>(),
                   v8::DEFAULT, attributes);

  Nan::SetMethod(objTmpl, "getByIndex", Http2PushFrameHeaders::GetByIndex);
  Nan::SetMethod(objTmpl, "getByName", Http2PushFrameHeaders::GetByName);

  Http2PushFrameHeaders::objectTemplate.Reset(objTmpl);

  // this is not exported
}

}  // namespace NodeLibcurl
