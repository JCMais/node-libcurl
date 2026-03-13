/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifndef NOMINMAX
#define NOMINMAX
#include "napi.h"

#include <curl/curl.h>
#endif

#include "Curl.h"
#include "CurlError.h"
#include "CurlMime.h"
#include "Easy.h"
#include "macros.h"

#include <cassert>
#include <cstring>

namespace NodeLibcurl {

// Version guard for MIME API (requires libcurl 7.56.0+)
#if NODE_LIBCURL_VER_GE(7, 56, 0)

//=============================================================================
// CurlMime Implementation
//=============================================================================

CurlMime::CurlMime(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<CurlMime>(info), mime(nullptr), easyHandle(nullptr) {
  Napi::Env env = info.Env();
  auto curl = env.GetInstanceData<Curl>();

  // Require a handle argument
  if (info.Length() == 0 || !info[0].IsObject()) {
    throw Napi::TypeError::New(env, "CurlMime constructor requires an Easy or Curl handle");
  }

  // Parse the provided Easy or Curl handle
  Napi::Object handleObj = info[0].As<Napi::Object>();

  // Try to unwrap as Easy instance first
  if (handleObj.InstanceOf(curl->EasyConstructor.Value())) {
    auto easy = Easy::Unwrap(handleObj);
    this->easyHandle = easy->ch;
  } else {
    // Check if it's a Curl instance by checking constructor name
    Napi::Value constructorVal = handleObj.Get("constructor");
    if (constructorVal.IsObject()) {
      Napi::Object constructor = constructorVal.As<Napi::Object>();
      Napi::Value nameVal = constructor.Get("name");
      if (nameVal.IsString() && nameVal.As<Napi::String>().Utf8Value() == "Curl") {
        // It's a Curl instance, grab the handle property
        Napi::Value handleVal = handleObj.Get("handle");
        if (handleVal.IsObject()) {
          auto easyObj = handleVal.As<Napi::Object>();
          auto curlEasy = Easy::Unwrap(easyObj);
          this->easyHandle = curlEasy->ch;
        }
      }
    }
  }

  // Verify we got a valid handle
  if (this->easyHandle == nullptr) {
    throw Napi::TypeError::New(env, "First argument must be a valid Easy or Curl handle");
  }

  // Initialize MIME structure
  this->mime = curl_mime_init(this->easyHandle);
  if (this->mime == nullptr) {
    throw Napi::Error::New(env, "Failed to initialize MIME structure");
  }
}

CurlMime::~CurlMime() {
  // Note: Do not free mime here!
  // The mime handle is managed by Easy::ToFree and will be freed
  // when the Easy handle is disposed or when MIMEPOST is reset.
  // This allows the MIME structure to persist after the JS object is GC'd.
}

Napi::Function CurlMime::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "CurlMime",
                                    {
                                        InstanceMethod("addPart", &CurlMime::AddPart),
                                    });

  exports.Set("CurlMime", func);
  return func;
}

Napi::Value CurlMime::AddPart(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (this->mime == nullptr) {
    throw Napi::Error::New(env, "MIME structure is not initialized");
  }

  // Add a new part to the MIME structure
  curl_mimepart* part = curl_mime_addpart(this->mime);
  if (part == nullptr) {
    throw Napi::Error::New(env, "Failed to add MIME part");
  }

  // Create a new CurlMimePart instance wrapping this part
  auto curl = env.GetInstanceData<Curl>();
  Napi::Object mimePartObj = curl->CurlMimePartConstructor.New({});
  CurlMimePart* mimePart = CurlMimePart::Unwrap(mimePartObj);
  mimePart->part = part;

  char* ptr = nullptr;
  CURLcode code = curl_easy_getinfo(this->easyHandle, CURLINFO_PRIVATE, &ptr);
  assert(code == CURLE_OK && "Error retrieving current handle instance.");

  assert(ptr != nullptr && "Invalid handle returned from CURLINFO_PRIVATE.");
  Easy* easyObj = reinterpret_cast<Easy*>(ptr);

  mimePart->easy = easyObj;

  return mimePartObj;
}

//=============================================================================
// CurlMimePart Implementation
//=============================================================================

CurlMimePart::CurlMimePart(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<CurlMimePart>(info), part(nullptr) {
  // Constructor is called from AddPart, part will be set after construction
}

CurlMimePart::~CurlMimePart() {
  // Do NOT free the part here!
  // curl_mimepart is owned by the parent curl_mime structure
  // and will be freed when curl_mime_free() is called on the parent

  // Clean up callback references (Phase 3)
  this->readCallback.Reset();
  this->seekCallback.Reset();
  this->freeCallback.Reset();
}

Napi::Function CurlMimePart::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func =
      DefineClass(env, "CurlMimePart",
                  {
                      // Phase 1: Basic methods
                      InstanceMethod("setName", &CurlMimePart::SetName),
                      InstanceMethod("setData", &CurlMimePart::SetData),
                      InstanceMethod("setFileData", &CurlMimePart::SetFileData),
                      InstanceMethod("setType", &CurlMimePart::SetType),
                      InstanceMethod("setFileName", &CurlMimePart::SetFileName),

                      // Phase 2: Advanced methods
                      InstanceMethod("setEncoder", &CurlMimePart::SetEncoder),
                      InstanceMethod("setHeaders", &CurlMimePart::SetHeaders),
                      InstanceMethod("setSubparts", &CurlMimePart::SetSubparts),

                      // Phase 3: Callback method
                      InstanceMethod("setDataCallback", &CurlMimePart::SetDataCallback),
                  });

  exports.Set("CurlMimePart", func);
  return func;
}

Napi::Value CurlMimePart::SetName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (this->part == nullptr) {
    throw Napi::Error::New(env,
                           "MIME part is not initialized or its ownership was transferred to "
                           "another part through setSubparts");
  }

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "setName expects 1 argument: name (string)");
  }

  if (info[0].IsNull() || info[0].IsUndefined()) {
    // NULL resets the name
    CURLcode code = curl_mime_name(this->part, nullptr);
    if (code != CURLE_OK) {
      throw CurlError::New(env, "Failed to reset MIME part name", code);
    }
    return info.This();
  }

  if (!info[0].IsString()) {
    throw Napi::TypeError::New(env, "name must be a string");
  }

  std::string name = info[0].As<Napi::String>().Utf8Value();
  CURLcode code = curl_mime_name(this->part, name.c_str());

  if (code != CURLE_OK) {
    throw CurlError::New(env, "Failed to set MIME part name", code);
  }

  return info.This();
}

Napi::Value CurlMimePart::SetData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (this->part == nullptr) {
    throw Napi::Error::New(env,
                           "MIME part is not initialized or its ownership was transferred to "
                           "another part through setSubparts");
  }

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "setData expects 1 argument: data (string or Buffer)");
  }

  if (info[0].IsNull() || info[0].IsUndefined()) {
    // NULL removes previous data
    CURLcode code = curl_mime_data(this->part, nullptr, 0);
    if (code != CURLE_OK) {
      throw CurlError::New(env, "Failed to reset MIME part data", code);
    }
    return info.This();
  }

  CURLcode code;

  if (info[0].IsString()) {
    // String data - use CURL_ZERO_TERMINATED
    std::string data = info[0].As<Napi::String>().Utf8Value();
    code = curl_mime_data(this->part, data.c_str(), CURL_ZERO_TERMINATED);
  } else if (info[0].IsBuffer()) {
    // Binary data from Buffer
    Napi::Buffer<char> buffer = info[0].As<Napi::Buffer<char>>();
    code = curl_mime_data(this->part, buffer.Data(), buffer.Length());
  } else {
    throw Napi::TypeError::New(env, "data must be a string or Buffer");
  }

  if (code != CURLE_OK) {
    throw CurlError::New(env, "Failed to set MIME part data", code);
  }

  return info.This();
}

Napi::Value CurlMimePart::SetFileData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (this->part == nullptr) {
    throw Napi::Error::New(env,
                           "MIME part is not initialized or its ownership was transferred to "
                           "another part through setSubparts");
  }

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "setFileData expects 1 argument: filePath (string)");
  }

  if (info[0].IsNull() || info[0].IsUndefined()) {
    // NULL removes previous file data
    CURLcode code = curl_mime_filedata(this->part, nullptr);
    if (code != CURLE_OK) {
      throw CurlError::New(env, "Failed to reset MIME part file data", code);
    }
    return info.This();
  }

  if (!info[0].IsString()) {
    throw Napi::TypeError::New(env, "The filePath argument must be a string");
  }

  std::string filePath = info[0].As<Napi::String>().Utf8Value();
  CURLcode code = curl_mime_filedata(this->part, filePath.c_str());

  if (code != CURLE_OK) {
    throw CurlError::New(env, "Failed to set the file path for the MIME part", code);
  }

  return info.This();
}

Napi::Value CurlMimePart::SetType(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (this->part == nullptr) {
    throw Napi::Error::New(env,
                           "MIME part is not initialized or its ownership was transferred to "
                           "another part through setSubparts");
  }

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "setType expects 1 argument: mimetype (string)");
  }

  if (info[0].IsNull() || info[0].IsUndefined()) {
    // NULL removes previous type
    CURLcode code = curl_mime_type(this->part, nullptr);
    if (code != CURLE_OK) {
      throw CurlError::New(env, "Failed to reset MIME part type", code);
    }
    return info.This();
  }

  if (!info[0].IsString()) {
    throw Napi::TypeError::New(env, "The mimeType argument must be a string");
  }

  std::string mimeType = info[0].As<Napi::String>().Utf8Value();
  CURLcode code = curl_mime_type(this->part, mimeType.c_str());

  if (code != CURLE_OK) {
    throw CurlError::New(env, "Failed to set type for the MIME part", code);
  }

  return info.This();
}

Napi::Value CurlMimePart::SetFileName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (this->part == nullptr) {
    throw Napi::Error::New(env,
                           "MIME part is not initialized or its ownership was transferred to "
                           "another part through setSubparts");
  }

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "setFileName expects 1 argument: fileName (string)");
  }

  if (info[0].IsNull() || info[0].IsUndefined()) {
    // NULL removes previous filename
    CURLcode code = curl_mime_filename(this->part, nullptr);
    if (code != CURLE_OK) {
      throw CurlError::New(env, "Failed to reset MIME part filename", code);
    }
    return info.This();
  }

  if (!info[0].IsString()) {
    throw Napi::TypeError::New(env, "The fileName argument must be a string");
  }

  std::string fileName = info[0].As<Napi::String>().Utf8Value();
  CURLcode code = curl_mime_filename(this->part, fileName.c_str());

  if (code != CURLE_OK) {
    throw CurlError::New(env, "Failed to set the file name for the MIME part", code);
  }

  return info.This();
}

Napi::Value CurlMimePart::SetEncoder(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (this->part == nullptr) {
    throw Napi::Error::New(env,
                           "MIME part is not initialized or its ownership was transferred to "
                           "another part through setSubparts");
  }

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "setEncoder expects 1 argument: encoding (string)");
  }

  if (info[0].IsNull() || info[0].IsUndefined()) {
    // NULL disables encoding
    CURLcode code = curl_mime_encoder(this->part, nullptr);
    if (code != CURLE_OK) {
      throw CurlError::New(env, "Failed to reset MIME part encoder", code);
    }
    return info.This();
  }

  if (!info[0].IsString()) {
    throw Napi::TypeError::New(env, "encoding must be a string");
  }

  std::string encoding = info[0].As<Napi::String>().Utf8Value();
  CURLcode code = curl_mime_encoder(this->part, encoding.c_str());

  if (code != CURLE_OK) {
    throw CurlError::New(env, "Failed to set MIME part encoder", code);
  }

  return info.This();
}

Napi::Value CurlMimePart::SetHeaders(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (this->part == nullptr) {
    throw Napi::Error::New(env,
                           "MIME part is not initialized or its ownership was transferred to "
                           "another part through setSubparts");
  }

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "setHeaders expects 1 argument: headers (array of strings)");
  }

  if (info[0].IsNull() || info[0].IsUndefined()) {
    // NULL removes previous headers
    CURLcode code = curl_mime_headers(this->part, nullptr, 1);
    if (code != CURLE_OK) {
      throw CurlError::New(env, "Failed to reset MIME part headers", code);
    }
    return info.This();
  }

  if (!info[0].IsArray()) {
    throw Napi::TypeError::New(env, "headers must be an array of strings");
  }

  Napi::Array headersArray = info[0].As<Napi::Array>();
  curl_slist* headers = nullptr;

  // Build the curl_slist from array
  for (uint32_t i = 0; i < headersArray.Length(); i++) {
    Napi::Value headerValue = headersArray[i];
    if (!headerValue.IsString()) {
      curl_slist_free_all(headers);
      throw Napi::TypeError::New(env, "All headers must be strings");
    }
    std::string header = headerValue.As<Napi::String>().Utf8Value();
    headers = curl_slist_append(headers, header.c_str());
  }

  // Set headers with take_ownership=1 so curl will free the list
  CURLcode code = curl_mime_headers(this->part, headers, 1);

  if (code != CURLE_OK) {
    curl_slist_free_all(headers);
    throw CurlError::New(env, "Failed to set MIME part headers", code);
  }

  return info.This();
}

Napi::Value CurlMimePart::SetSubparts(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (this->part == nullptr) {
    throw Napi::Error::New(env,
                           "MIME part is not initialized or its ownership was transferred to "
                           "another part through setSubparts");
  }

  if (info.Length() < 1) {
    throw Napi::TypeError::New(env, "setSubparts expects 1 argument: mime (CurlMime instance)");
  }

  if (info[0].IsNull() || info[0].IsUndefined()) {
    // NULL removes previous subparts
    CURLcode code = curl_mime_subparts(this->part, nullptr);
    if (code != CURLE_OK) {
      throw CurlError::New(env, "Failed to reset MIME part subparts", code);
    }
    return info.This();
  }

  if (!info[0].IsObject()) {
    throw Napi::TypeError::New(env, "subparts must be a CurlMime instance");
  }

  Napi::Object mimeObj = info[0].As<Napi::Object>();

  // Try to unwrap as CurlMime
  auto subMime = CurlMime::Unwrap(mimeObj);

  if (subMime->mime == nullptr) {
    throw Napi::TypeError::New(env,
                               "Argument must be a valid CurlMime instance and not already freed");
  }

  CURLcode code = curl_mime_subparts(this->part, subMime->mime);

  if (code != CURLE_OK) {
    throw CurlError::New(env, "Failed to set MIME part subparts", code);
  }

  // Important: Set subMime->mime to nullptr to prevent double-free
  // The mime structure is now owned by this part
  subMime->mime = nullptr;

  return info.This();
}

//=============================================================================
// Phase 3: Callback Support
//=============================================================================

Napi::Value CurlMimePart::SetDataCallback(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2) {
    throw Napi::TypeError::New(env, "setDataCallback requires 2 arguments: size and callbacks");
  }

  if (!info[0].IsNumber()) {
    throw Napi::TypeError::New(env, "First argument (size) must be a number");
  }

  if (!info[1].IsObject()) {
    throw Napi::TypeError::New(env, "Second argument (callbacks) must be an object");
  }

  curl_off_t datasize = info[0].As<Napi::Number>().Int64Value();
  Napi::Object callbacks = info[1].As<Napi::Object>();

  // Extract and validate the read callback (required)
  Napi::Value readVal = callbacks.Get("read");
  if (!readVal.IsFunction()) {
    throw Napi::TypeError::New(env, "callbacks.read must be a function");
  }

  // Store the read callback
  this->readCallback = Napi::Persistent(readVal.As<Napi::Function>());

  // Extract optional seek callback
  curl_seek_callback seekCb = nullptr;
  Napi::Value seekVal = callbacks.Get("seek");
  if (seekVal.IsFunction()) {
    this->seekCallback = Napi::Persistent(seekVal.As<Napi::Function>());
    seekCb = StaticSeekCallback;
  }

  // Extract optional free callback
  curl_free_callback freeCb = nullptr;
  Napi::Value freeVal = callbacks.Get("free");
  if (freeVal.IsFunction()) {
    this->freeCallback = Napi::Persistent(freeVal.As<Napi::Function>());
    freeCb = StaticFreeCallback;
  }

  // Create self-reference to prevent GC while callbacks are active
  // This is critical: libcurl holds a raw pointer to 'this' via userdata,
  // but that doesn't prevent JavaScript GC. We must keep the JS object alive.
  if (this->selfRef.IsEmpty()) {
    this->selfRef = Napi::Persistent(info.This().As<Napi::Object>());
    // SuppressDestruct prevents automatic cleanup when the env is destroyed,
    // allowing the free callback to control the lifecycle
    this->selfRef.SuppressDestruct();
  }

  // Call libcurl function
  CURLcode code =
      curl_mime_data_cb(this->part, datasize, StaticReadCallback, seekCb, freeCb,
                        this  // Pass 'this' as userdata so callbacks can access the object
      );

  if (code != CURLE_OK) {
    throw CurlError::New(env, "Failed to set MIME part data callback", code);
  }

  return info.This();
}

size_t CurlMimePart::StaticReadCallback(char* buffer, size_t size, size_t nitems, void* userdata) {
  CurlMimePart* part = static_cast<CurlMimePart*>(userdata);

  // Get the env from the callback
  Napi::Env env = part->readCallback.Env();
  Napi::HandleScope scope(env);

  try {
    size_t maxSize = size * nitems;
    Napi::Value result = part->readCallback.Call({Napi::Number::New(env, maxSize)});

    if (result.IsNull()) {
      return 0;
    }

    if (result.IsBuffer()) {
      Napi::Buffer<char> buf = result.As<Napi::Buffer<char>>();
      size_t len = buf.Length();
      if (len > maxSize) len = maxSize;
      memcpy(buffer, buf.Data(), len);
      return len;
    }

    if (result.IsString()) {
      std::string str = result.As<Napi::String>().Utf8Value();
      size_t len = str.length();
      if (len > maxSize) len = maxSize;
      memcpy(buffer, str.c_str(), len);
      return len;
    }

    if (result.IsNumber()) {
      return result.As<Napi::Number>().Int32Value();
    }

    // Invalid return type
    return CURL_READFUNC_ABORT;
  } catch (const Napi::Error& error) {
    part->easy->callbackError.Reset(error.Value());
    return CURL_READFUNC_ABORT;
  }
}

int CurlMimePart::StaticSeekCallback(void* userdata, curl_off_t offset, int origin) {
  CurlMimePart* part = static_cast<CurlMimePart*>(userdata);

  if (part->seekCallback.IsEmpty()) {
    return CURL_SEEKFUNC_CANTSEEK;
  }

  Napi::Env env = part->seekCallback.Env();
  Napi::HandleScope scope(env);

  try {
    // Call the JavaScript seek callback
    Napi::Value result = part->seekCallback.Call(
        {Napi::Number::New(env, static_cast<double>(offset)), Napi::Number::New(env, origin)});

    // Return value should be boolean
    if (result.IsBoolean() && result.As<Napi::Boolean>().Value()) {
      return CURL_SEEKFUNC_OK;
    }

    return CURL_SEEKFUNC_FAIL;
  } catch (const Napi::Error& error) {
    part->easy->callbackError.Reset(error.Value());
    return CURL_SEEKFUNC_FAIL;
  }
}

void CurlMimePart::StaticFreeCallback(void* userdata) {
  CurlMimePart* part = static_cast<CurlMimePart*>(userdata);

  // readCallback is always set (it's required), so we can get env from it
  if (part->readCallback.IsEmpty()) {
    // This shouldn't happen, but handle gracefully
    return;
  }

  Napi::Env env = part->readCallback.Env();
  Napi::HandleScope scope(env);

  // Call user's free callback if provided
  if (!part->freeCallback.IsEmpty()) {
    try {
      part->freeCallback.Call({});
    } catch (const Napi::Error&) {
      // Ignore errors in free callback
    }
  }

  // Clean up the callback references
  part->readCallback.Reset();
  part->seekCallback.Reset();
  part->freeCallback.Reset();

  // Release self-reference to allow GC now that callbacks are done
  if (!part->selfRef.IsEmpty()) {
    part->selfRef.Reset();
  }
}

#else  // NODE_LIBCURL_VER_GE(7, 56, 0)

// Stub implementations for older libcurl versions

CurlMime::CurlMime(const Napi::CallbackInfo& info) : Napi::ObjectWrap<CurlMime>(info) {
  Napi::Env env = info.Env();
  throw Napi::Error::New(env,
                         "CurlMime requires libcurl 7.56.0 or later. This build uses an older "
                         "version. Please use HTTPPOST instead or upgrade libcurl.");
}

CurlMime::~CurlMime() {}

Napi::Function CurlMime::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "CurlMime", {});
  exports.Set("CurlMime", func);
  return func;
}

Napi::Value CurlMime::AddPart(const Napi::CallbackInfo& info) { return info.Env().Null(); }

CurlMimePart::CurlMimePart(const Napi::CallbackInfo& info) : Napi::ObjectWrap<CurlMimePart>(info) {}

CurlMimePart::~CurlMimePart() {}

Napi::Function CurlMimePart::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "CurlMimePart", {});
  exports.Set("CurlMimePart", func);
  return func;
}

#endif  // NODE_LIBCURL_VER_GE(7, 56, 0)

}  // namespace NodeLibcurl
