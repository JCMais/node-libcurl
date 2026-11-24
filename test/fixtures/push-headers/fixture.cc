#include "../../../src/Http2PushFrameHeaders.h"

#include <cstring>

struct curl_pushheaders {
  char line[sizeof("x-test:example")] = "x-test:example";
};

extern "C" char* curl_pushheader_bynum(curl_pushheaders* headers, size_t index) {
  return headers && index == 0 ? headers->line : nullptr;
}

extern "C" char* curl_pushheader_byname(curl_pushheaders* headers, const char* name) {
  return headers && std::strcmp(name, "x-test") == 0 ? headers->line + sizeof("x-test") : nullptr;
}

using NodeLibcurl::HTTP2_PUSH_FRAME_HEADERS_TYPE_TAG;
using NodeLibcurl::Http2PushFrameHeaders;

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  auto constructor = Http2PushFrameHeaders::Init(env, exports);
  // Keep the mock data alive for the whole test process, even after invalidation.
  static curl_pushheaders headers;
  auto external = Napi::External<curl_pushheaders>::New(env, &headers);
  external.TypeTag(&HTTP2_PUSH_FRAME_HEADERS_TYPE_TAG);
  exports.Set("headers", constructor.New({external, Napi::Number::New(env, 1)}));
  exports.Set("invalidate", Napi::Function::New(env, [](const Napi::CallbackInfo& info) {
    Http2PushFrameHeaders::Unwrap(info[0].As<Napi::Object>())->Invalidate();
  }));
  return exports;
}

NODE_API_MODULE(push_headers_fixture, Init)
