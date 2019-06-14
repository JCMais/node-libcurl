/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be825453/include/curl/curl.h#L880
/**
 * Object with bitmasks to be used with `HEADEROPT`.
 *
 * Available since libcurl version \>= 7.37.0
 *
 * `CURLHEADER_UNIFIED` becomes `CurlHeader.Unified`
 *
 * @public
 */
export enum CurlHeader {
  Unified = 0,
  Separate = 1 << 0,
}
