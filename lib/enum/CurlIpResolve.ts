/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be825453489/include/curl/curl.h#L1954
/**
 * Object with constants for option `IPRESOLVE`
 *
 * `CURL_IPRESOLVE_V4` becomes `Curl.ipresolve.V4`
 *
 * @public
 */
export enum CurlIpResolve {
  Whatever,
  V4,
  V6,
}
