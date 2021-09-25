/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#ifndef NODELIBCURL_LIBCURL_COMPAT_H
#define NODELIBCURL_LIBCURL_COMPAT_H

#include "macros.h"

#if NODE_LIBCURL_VER_LE(7, 73, 0)
struct curl_hstsentry {
  char* name;
  size_t namelen;
  unsigned int includeSubDomains : 1;
  char expire[18]; /* YYYYMMDD HH:MM:SS [null-terminated] */
};

struct curl_index {
  size_t index; /* the provided entry's "index" or count */
  size_t total; /* total number of entries to save */
};
#endif

#endif
