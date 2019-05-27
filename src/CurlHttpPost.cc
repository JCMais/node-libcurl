/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#include "CurlHttpPost.h"
#include <string>
using namespace std;
#ifdef _WIN32
#include <locale>
#include <codecvt>


std::wstring UTF8ToWide(const std::string& source)
{
    std::wstring_convert<std::codecvt_utf8<wchar_t>> conv;
    return conv.from_bytes(source);
}

std::string WideToUTF8(const std::wstring& source)
{
    std::wstring_convert<std::codecvt_utf8<wchar_t>> conv;
    return conv.to_bytes(source);
}


std::wstring AsciiToWide(std::string _strSrc)
{
    int unicodeLen = MultiByteToWideChar(CP_ACP, 0, _strSrc.c_str(), -1, nullptr, 0);
    wchar_t *pUnicode = (wchar_t*)malloc(sizeof(wchar_t)*unicodeLen);
    MultiByteToWideChar(CP_ACP, 0, _strSrc.c_str(), -1, pUnicode, unicodeLen);
    std::wstring ret_str = pUnicode;
    free(pUnicode);
    return ret_str;
}

std::string WideToAscii(std::wstring _strSrc)
{
    int ansiiLen = WideCharToMultiByte(CP_ACP, 0, _strSrc.c_str(), -1, nullptr, 0, nullptr, nullptr);
    char *pAssii = (char*)malloc(sizeof(char)*ansiiLen);
    WideCharToMultiByte(CP_ACP, 0, _strSrc.c_str(), -1, pAssii, ansiiLen, nullptr, nullptr);
    std::string ret_str = pAssii;
    free(pAssii);
    return ret_str;
}
std::string UTF8ToAscii(std::string _strSrc)
{
    return WideToAscii(UTF8ToWide(_strSrc));
}

std::string AsciiToUTF8(std::string _strSrc)
{
    return WideToUTF8(AsciiToWide(_strSrc));
}
#endif

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
  std::string fname = fileName;
#ifdef _WIN32
  fname = UTF8ToAscii(fileName);
#endif
  return curl_formadd(&this->first, &this->last, CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH,
                      fieldNameLength, CURLFORM_FILE, fname.c_str(), CURLFORM_END);
}

CURLFORMcode CurlHttpPost::AddFile(char* fieldName, long fieldNameLength,  // NOLINT(runtime/int)
                                   char* fileName, char* contentType) {
  std::string fname = fileName;
#ifdef _WIN32
  fname = UTF8ToAscii(fileName);
#endif
  return curl_formadd(&this->first, &this->last, CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH,
                      fieldNameLength, CURLFORM_FILE, fname.c_str(), CURLFORM_CONTENTTYPE, contentType,
                      CURLFORM_END);
}

CURLFORMcode CurlHttpPost::AddFile(char* fieldName, long fieldNameLength,  // NOLINT(runtime/int)
                                   char* fileName, char* contentType, char* newFileName) {
  std::string fname = fileName;
#ifdef _WIN32
    fname = UTF8ToAscii(fileName);
#endif
  return curl_formadd(&this->first, &this->last, CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH,
                      fieldNameLength, CURLFORM_FILE, fname.c_str(), CURLFORM_CONTENTTYPE, contentType,
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
