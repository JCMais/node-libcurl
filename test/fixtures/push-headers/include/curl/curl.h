#pragma once

#include <stddef.h>

// Only the two libcurl calls used by the production wrapper are stubbed.
struct curl_pushheaders;
extern "C" char* curl_pushheader_bynum(struct curl_pushheaders* headers, size_t index);
extern "C" char* curl_pushheader_byname(struct curl_pushheaders* headers, const char* name);
