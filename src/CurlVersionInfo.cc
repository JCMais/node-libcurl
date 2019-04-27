/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#include <iostream>

#include "CurlVersionInfo.h"

namespace NodeLibcurl
{
    namespace {
        template <typename TValue>
        void SetObjPropertyToNullOrValue(v8::Local<v8::Object> obj, std::string key, TValue value)
        {
            Nan::Set(obj, Nan::New(key).ToLocalChecked(), Nan::New(value));
        }

        template <> void SetObjPropertyToNullOrValue<const char *>(v8::Local<v8::Object> obj, std::string key, const char* value)
        {
            if (value == nullptr) {
                Nan::Set(obj, Nan::New(key).ToLocalChecked(), Nan::Null());
            } else {
                Nan::Set(obj, Nan::New(key).ToLocalChecked(), Nan::New(value).ToLocalChecked());
            }
        };
    }

    const std::vector<CurlVersionInfo::feature> CurlVersionInfo::features = {
        {"AsynchDNS",      CURL_VERSION_ASYNCHDNS},
        {"Debug",          CURL_VERSION_DEBUG},
        {"TrackMemory",    CURL_VERSION_CURLDEBUG},
        {"IDN",            CURL_VERSION_IDN},
        {"IPv6",           CURL_VERSION_IPV6},
        {"Largefile",      CURL_VERSION_LARGEFILE},
        {"SSPI",           CURL_VERSION_SSPI},
        {"GSS-API",        CURL_VERSION_GSSAPI},
        {"Kerberos",       CURL_VERSION_KERBEROS5},
        {"SPNEGO",         CURL_VERSION_SPNEGO},
        {"NTLM",           CURL_VERSION_NTLM},
        {"NTLM_WB",        CURL_VERSION_NTLM_WB},
        {"SSL",            CURL_VERSION_SSL},
        {"libz",           CURL_VERSION_LIBZ},
        {"brotli",         CURL_VERSION_BROTLI},
        {"CharConv",       CURL_VERSION_CONV},
        {"TLS-SRP",        CURL_VERSION_TLSAUTH_SRP},
        {"HTTP2",          CURL_VERSION_HTTP2},
        {"UnixSockets",    CURL_VERSION_UNIX_SOCKETS},
        {"HTTPS-proxy",    CURL_VERSION_HTTPS_PROXY},
        {"MultiSSL",       CURL_VERSION_MULTI_SSL},
        {"PSL",            CURL_VERSION_PSL},
        {"alt-svc",        CURL_VERSION_ALTSVC},
    };

    const curl_version_info_data *CurlVersionInfo::versionInfo = curl_version_info(CURLVERSION_NOW);

    NAN_MODULE_INIT(CurlVersionInfo::Initialize)
    {
        Nan::HandleScope scope;

        if (!versionInfo)
        {
            Nan::ThrowError("Failed to retrieve libcurl information using curl_version_info");
            return;
        }

        v8::PropertyAttribute attributes = static_cast<v8::PropertyAttribute>(v8::ReadOnly | v8::DontDelete);

        v8::Local<v8::Object> obj = Nan::New<v8::Object>();

        Nan::SetAccessor(obj, Nan::New("protocols").ToLocalChecked(), GetterProtocols, 0, v8::Local<v8::Value>(), v8::DEFAULT, attributes);
        Nan::SetAccessor(obj, Nan::New("features").ToLocalChecked(), GetterFeatures, 0, v8::Local<v8::Value>(), v8::DEFAULT, attributes);
        SetObjPropertyToNullOrValue(obj, "rawFeatures", versionInfo->features);

        SetObjPropertyToNullOrValue(obj, "version", versionInfo->version);
        SetObjPropertyToNullOrValue(obj, "versionNumber", versionInfo->version_num);

        SetObjPropertyToNullOrValue(obj, "sslVersion", versionInfo->ssl_version);
        SetObjPropertyToNullOrValue(obj, "sslVersionNum", 0);
        SetObjPropertyToNullOrValue(obj, "libzVersion", versionInfo->libz_version);
        SetObjPropertyToNullOrValue(obj, "aresVersion", versionInfo->ares);
        SetObjPropertyToNullOrValue(obj, "aresVersionNumber", versionInfo->ares_num);
        SetObjPropertyToNullOrValue(obj, "libidnVersion", versionInfo->libidn);
        SetObjPropertyToNullOrValue(obj, "iconvVersionNumber", versionInfo->iconv_ver_num);
        SetObjPropertyToNullOrValue(obj, "libsshVersion", versionInfo->libssh_version);
        SetObjPropertyToNullOrValue(obj, "brotliVersionNumber", versionInfo->brotli_ver_num);
        SetObjPropertyToNullOrValue(obj, "brotliVersion", versionInfo->brotli_version);

        Nan::Set( target, Nan::New("CurlVersionInfo").ToLocalChecked(), obj );
    }

    NAN_GETTER(CurlVersionInfo::GetterProtocols)
    {
        Nan::HandleScope scope;

        // const pointer to const char pointer
        const char *const *protocols = versionInfo->protocols;
        unsigned int i = 0;

        std::vector<const char*> vec;

        v8::Local<v8::Array> protocolsResult = Nan::New<v8::Array>();

        for(i = 0; *(protocols + i); i++) {
            v8::Local<v8::String> protocol = Nan::New<v8::String>(*(protocols + i)).ToLocalChecked();
            Nan::Set(protocolsResult, i, protocol);
        }

        info.GetReturnValue().Set(protocolsResult);
    }

    // basically a copy of https://github.com/curl/curl/blob/05a131eb7740e/src/tool_help.c#L579
    NAN_GETTER(CurlVersionInfo::GetterFeatures)
    {
        Nan::HandleScope scope;

        v8::Local<v8::Array> featuresResult = Nan::New<v8::Array>();

        unsigned int currentFeature = 0;
        for (auto const &feat : CurlVersionInfo::features) {
            if (versionInfo->features & feat.bitmask) {
                v8::Local<v8::String> featureString = Nan::New<v8::String>(feat.name).ToLocalChecked();
                Nan::Set(featuresResult, currentFeature++, featureString);
            }
        }

        info.GetReturnValue().Set(featuresResult);
    }
} // namespace NodeLibcurl
