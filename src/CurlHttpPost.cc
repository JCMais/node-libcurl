/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#include "CurlHttpPost.h"

namespace NodeLibcurl {

CurlHttpPost::CurlHttpPost() : first(nullptr), last(nullptr) {}

CurlHttpPost::~CurlHttpPost() { this->Reset(); }

void CurlHttpPost::Reset() {
  if (this->first) {
    curl_formfree(this->first);
    this->first = nullptr;
    this->last = nullptr;
  }
}

CURLFORMcode CurlHttpPost::AddFile(char* fieldName, long fieldNameLength,  // NOLINT(runtime/int)
                                   char* fileName) {
  return curl_formadd(&this->first, &this->last, CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH,
                      fieldNameLength, CURLFORM_FILE, fileName, CURLFORM_END);
}

CURLFORMcode CurlHttpPost::AddFile(char* fieldName, long fieldNameLength,  // NOLINT(runtime/int)
                                   char* fileName, char* contentType) {
  return curl_formadd(&this->first, &this->last, CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH,
                      fieldNameLength, CURLFORM_FILE, fileName, CURLFORM_CONTENTTYPE, contentType,
                      CURLFORM_END);
}

CURLFORMcode CurlHttpPost::AddFile(char* fieldName, long fieldNameLength,  // NOLINT(runtime/int)
                                   char* fileName, char* contentType, char* newFileName) {
  return curl_formadd(&this->first, &this->last, CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH,
                      fieldNameLength, CURLFORM_FILE, fileName, CURLFORM_CONTENTTYPE, contentType,
                      CURLFORM_FILENAME, newFileName, CURLFORM_END);
}

CURLFORMcode CurlHttpPost::AddField(char* fieldName, long fieldNameLength,  // NOLINT(runtime/int)
                                    char* fieldValue,
                                    long fieldValueLength) {  // NOLINT(runtime/int)
  return curl_formadd(&this->first, &this->last, CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH,
                      fieldNameLength, CURLFORM_COPYCONTENTS, fieldValue, CURLFORM_CONTENTSLENGTH,
                      fieldValueLength, CURLFORM_END);
}
}  // namespace NodeLibcurl
