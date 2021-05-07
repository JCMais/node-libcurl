/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
if (process.env.NODE_LIBCURL_CPP_STD) {
  console.log(process.env.NODE_LIBCURL_CPP_STD)
} else {
  if (process.versions.modules && parseInt(process.versions.modules) >= 88) {
    // 88 === Node.js v15
    console.log('c++17')
  } else {
    console.log('c++11')
  }
}
