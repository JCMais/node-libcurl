/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be8254534898f/include/curl/curl.h#L692
/**
 * Object with constants for option `PROXYTYPE`
 *
 * `CURLPROXY_HTTP` becomes `CurlProxy.Http`
 *
 * @public
 */
export enum CurlProxy {
  Http = 0,
  Http_1_0 = 1,
  Https = 2,
  Socks4 = 4,
  Socks5 = 5,
  Socks4A = 6,
  Socks5Hostname = 7,
}
