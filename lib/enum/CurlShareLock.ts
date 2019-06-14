/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be82545348/include/curl/curl.h#L2643
/**
 * Options to be used with the `Curl.share.SHARE` and `Curl.share.UNSHARE` options.
 *
 * `CURL_LOCK_DATA_SSL_SESSION` becomes `CurlShareLock.DataSslSession`
 *
 * @public
 */
export enum CurlShareLock {
  DataNone,
  /**
   * DataShare is used internally to say that
   *  the locking is just made to change the internal state of the share
   *  itself.
   */
  DataShare,
  DataCookie,
  DataDns,
  DataSslSession,
  DataConnect,
  DataPsl,
}
