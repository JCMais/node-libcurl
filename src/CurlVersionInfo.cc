#ifndef NOMINMAX
#define NOMINMAX
#endif
#include "napi.h"

/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#include "CurlVersionInfo.h"

#include <iostream>

namespace NodeLibcurl {

// Static member definitions
const std::vector<CurlVersionInfo::feature> CurlVersionInfo::features = {
    {"AsynchDNS", CURL_VERSION_ASYNCHDNS},
    {"Debug", CURL_VERSION_DEBUG},
    {"TrackMemory", CURL_VERSION_CURLDEBUG},
    {"IDN", CURL_VERSION_IDN},
    {"IPv6", CURL_VERSION_IPV6},
    {"Largefile", CURL_VERSION_LARGEFILE},
    {"SSPI", CURL_VERSION_SSPI},
#if NODE_LIBCURL_VER_GE(7, 38, 0)
    {"GSS-API", CURL_VERSION_GSSAPI},
#endif
#if NODE_LIBCURL_VER_GE(7, 40, 0)
    {"Kerberos", CURL_VERSION_KERBEROS5},
#else
    {"Kerberos", CURL_VERSION_KERBEROS4},
#endif
    {"SPNEGO", CURL_VERSION_SPNEGO},
    {"NTLM", CURL_VERSION_NTLM},
    {"NTLM_WB", CURL_VERSION_NTLM_WB},
    {"SSL", CURL_VERSION_SSL},
    {"libz", CURL_VERSION_LIBZ},
#if NODE_LIBCURL_VER_GE(7, 57, 0)
    {"brotli", CURL_VERSION_BROTLI},
#endif
    {"CharConv", CURL_VERSION_CONV},
    {"TLS-SRP", CURL_VERSION_TLSAUTH_SRP},
    {"HTTP2", CURL_VERSION_HTTP2},
#if NODE_LIBCURL_VER_GE(7, 40, 0)
    {"UnixSockets", CURL_VERSION_UNIX_SOCKETS},
#endif
#if NODE_LIBCURL_VER_GE(7, 52, 0)
    {"HTTPS-proxy", CURL_VERSION_HTTPS_PROXY},
#endif
#if NODE_LIBCURL_VER_GE(7, 56, 0)
    {"MultiSSL", CURL_VERSION_MULTI_SSL},
#endif
#if NODE_LIBCURL_VER_GE(7, 47, 0)
    {"PSL", CURL_VERSION_PSL},
#endif
#if NODE_LIBCURL_VER_GE(7, 64, 1)
    {"alt-svc", CURL_VERSION_ALTSVC},
#endif
};

const curl_version_info_data* CurlVersionInfo::versionInfo = curl_version_info(CURLVERSION_NOW);

// Helper template implementations
template <typename TValue>
void CurlVersionInfo::SetObjPropertyToNullOrValue(Napi::Object obj, const std::string& key,
                                                  TValue value) {
  obj.Set(key, Napi::Value::From(obj.Env(), value));
}

template <>
void CurlVersionInfo::SetObjPropertyToNullOrValue<Napi::Value>(Napi::Object obj,
                                                               const std::string& key,
                                                               Napi::Value value) {
  obj.Set(key, value);
}

template <>
void CurlVersionInfo::SetObjPropertyToNullOrValue<const char*>(Napi::Object obj,
                                                               const std::string& key,
                                                               const char* value) {
  Napi::Env env = obj.Env();
  if (value == nullptr) {
    obj.Set(key, env.Null());
  } else {
    obj.Set(key, Napi::String::New(env, value));
  }
}

void CurlVersionInfo::Init(Napi::Env env, Napi::Object exports) {
  if (!versionInfo) {
    throw Napi::Error::New(env, "Failed to retrieve libcurl information using curl_version_info");
  }

  Napi::Object obj = Napi::Object::New(env);

  napi_property_attributes attributes =
      static_cast<napi_property_attributes>(napi_enumerable | napi_configurable);

  Napi::PropertyDescriptor protocols =
      Napi::PropertyDescriptor::Accessor<GetProtocols>("protocols", attributes);
  Napi::PropertyDescriptor features =
      Napi::PropertyDescriptor::Accessor<GetFeatures>("features", attributes);

  obj.DefineProperties({protocols, features});

  // Add static properties using Napi::String::New for all keys
  obj.Set("rawFeatures", Napi::Number::New(env, static_cast<int32_t>(versionInfo->features)));
  obj.Set("version",
          versionInfo->version ? Napi::String::New(env, versionInfo->version) : env.Null());
  obj.Set("versionNumber", Napi::Number::New(env, static_cast<int32_t>(versionInfo->version_num)));
  obj.Set("sslVersion",
          versionInfo->ssl_version ? Napi::String::New(env, versionInfo->ssl_version) : env.Null());
  obj.Set("sslVersionNum", Napi::Number::New(env, 0));
  obj.Set("libzVersion", versionInfo->libz_version
                             ? Napi::String::New(env, versionInfo->libz_version)
                             : env.Null());
  obj.Set("aresVersion",
          versionInfo->ares ? Napi::String::New(env, versionInfo->ares) : env.Null());
  obj.Set("aresVersionNumber", Napi::Number::New(env, static_cast<int32_t>(versionInfo->ares_num)));
  obj.Set("libidnVersion",
          versionInfo->libidn ? Napi::String::New(env, versionInfo->libidn) : env.Null());
  obj.Set("iconvVersionNumber",
          Napi::Number::New(env, static_cast<int32_t>(versionInfo->iconv_ver_num)));
  obj.Set("libsshVersion", versionInfo->libssh_version
                               ? Napi::String::New(env, versionInfo->libssh_version)
                               : env.Null());

// TODO(jonathan, changelog): possibly support only 7.78>= moving forward
#if NODE_LIBCURL_VER_GE(7, 57, 0)
  obj.Set("brotliVersionNumber",
          Napi::Number::New(env, static_cast<int32_t>(versionInfo->brotli_ver_num)));
  obj.Set("brotliVersion", versionInfo->brotli_version
                               ? Napi::String::New(env, versionInfo->brotli_version)
                               : env.Null());
#else
  obj.Set("brotliVersionNumber", Napi::Number::New(env, 0));
  obj.Set("brotliVersion", env.Null());
#endif

  exports.Set("CurlVersionInfo", obj);
}

Napi::Value CurlVersionInfo::GetProtocols(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // const pointer to const char pointer
  const char* const* protocols = versionInfo->protocols;
  unsigned int i = 0;

  Napi::Array protocolsResult = Napi::Array::New(env);

  for (i = 0; *(protocols + i); i++) {
    protocolsResult.Set(i, Napi::String::New(env, *(protocols + i)));
  }

  return protocolsResult;
}

Napi::Value CurlVersionInfo::GetFeatures(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Napi::Array featuresResult = Napi::Array::New(env);

  unsigned int currentFeature = 0;
  for (auto const& feat : CurlVersionInfo::features) {
    if (versionInfo->features & feat.bitmask) {
      featuresResult.Set(currentFeature++, Napi::String::New(env, feat.name));
    }
  }

  return featuresResult;
}

}  // namespace NodeLibcurl
