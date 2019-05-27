/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#ifndef NODELIBCURL_HTTPPOST_H
#define NODELIBCURL_HTTPPOST_H

#include <curl/curl.h>

#include <cstdlib>
#include <cstring>

namespace NodeLibcurl {

class CurlHttpPost {
  CurlHttpPost(const CurlHttpPost& that);
  CurlHttpPost& operator=(const CurlHttpPost& that);

 public:
  curl_httppost* first;
  curl_httppost* last;

  CurlHttpPost();

  ~CurlHttpPost();

  enum { NAME, FILE, CONTENTS, TYPE, COUNT, FILENAME };

  void Reset();

  CURLFORMcode AddFile(char* fieldName, long fieldNameLength,  // NOLINT(runtime/int)
                       char* fileName);
  CURLFORMcode AddFile(char* fieldName, long fieldNameLength,  // NOLINT(runtime/int)
                       char* fileName, char* contentType);
  CURLFORMcode AddFile(char* fieldName, long fieldNameLength,  // NOLINT(runtime/int)
                       char* fileName, char* contentType, char* newFileName);
  CURLFORMcode AddField(char* fieldName, long fieldNameLength,  // NOLINT(runtime/int)
                        char* fieldValue,
                        long fieldValueLength);  // NOLINT(runtime/int)
};
}  // namespace NodeLibcurl
#endif
