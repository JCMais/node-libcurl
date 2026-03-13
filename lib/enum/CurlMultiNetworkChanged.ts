/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/00cb679c04ef9e0f30bd99c9dcc58c1e1928c01a/include/curl/multi.h#L410
/**
 * To be used with the `NETRC` option
 *
 * `CURLMNC_CLEAR_CONNS` becomes `CurlMultiNetworkChanged.ClearConns`
 *
 * @public
 */
export enum CurlMultiNetworkChanged {
  /**
   * Tells libcurl to prevent further reuse of existing connections.
   * Connections that are idle will be closed. Ongoing transfers
   * will continue with the connection they have.
   */
  ClearConns = 1 << 0,
  /**
   * Tells libcurl to clear the DNS cache.
   */
  ClearDns = 1 << 0,
}
