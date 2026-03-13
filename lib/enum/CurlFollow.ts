/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/8c4fbcbc4f6e158b3b2a644d5ec6b4b38183b081/include/curl/curl.h#L177
/**
 * Object with constants for option bits for `CURLOPT_FOLLOWLOCATION`
 *
 * `CURLFOLLOW_ALL` becomes `CurlFollow.All`
 *
 * @public
 */
export enum CurlFollow {
  /**
   * Generic follow redirects
   */
  All = 1,
  /**
   * Do not use the custom method in the follow-up request if the HTTP code
   * instructs so (301, 302, 303).
   */
  ObeyCode = 2,
  /**
   * Only use the custom method in the first request,
   * always reset in the next.
   */
  FirstOnly = 3,
}
