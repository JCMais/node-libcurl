/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be82545348/include/curl/curl.h#L2058
/**
 * Object with constants for option `TIMECONDITION`
 *
 * `CURL_TIMECOND_IFMODSINCE` becomes `CurlTimeCond.IfModSince`
 *
 * @public
 */
export enum CurlTimeCond {
  None,
  IfModSince,
  IfUnmodSince,
  LastMod,
}
