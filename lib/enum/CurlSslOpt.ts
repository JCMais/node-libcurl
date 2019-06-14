/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be8254534898fccafc5d6cd04f6235f283cfbd/include/curl/curl.h#L7
/**
 * Object with constants for option `SSL_OPT` and/or `PROXY_SSL_OPT`
 *
 * `CURLSSLOPT_ALLOW_BEAST` becomes `CurlSslOpt.AllowBeast`
 *
 * @public
 */
export enum CurlSslOpt {
  /**
   * Tells libcurl to allow the BEAST SSL vulnerability in the
   * name of improving interoperability with older servers. Some SSL libraries
   * have introduced work-arounds for this flaw but those work-arounds sometimes
   * make the SSL communication fail. To regain functionality with those broken
   * servers, a user can this way allow the vulnerability back.
   */
  AllowBeast = 1 << 0,
  /**
   * Tells libcurl to disable certificate revocation checks for those
   * SSL backends where such behavior is present.
   */
  NoRevoke = 1 << 1,
}
