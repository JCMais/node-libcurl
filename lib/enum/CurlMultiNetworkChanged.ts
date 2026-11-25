/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Curl } from '../Curl'

const hasSeparateFlags = Curl.isVersionGreaterOrEqualThan(8, 20, 0)
/**
 * To be used with the `NETWORK_CHANGED` Multi option (libcurl 8.16+).
 * Before libcurl 8.20, all three flags clear both caches.
 *
 * `CURLMNWC_CLEAR_CONNS` becomes `CurlMultiNetworkChanged.ClearConns`
 *
 * @public
 */
export enum CurlMultiNetworkChanged {
  /**
   * Tells libcurl to clear "everything" that could be related to the
   * previous network setup.
   */
  ClearAll = 1 << 0,
  /**
   * Tells libcurl to prevent further reuse of existing connections.
   * Connections that are idle will be closed. Ongoing transfers
   * will continue with the connection they have.
   */
  ClearConns = hasSeparateFlags ? 1 << 1 : 1 << 0,
  /**
   * Tells libcurl to clear the DNS cache.
   */
  ClearDns = hasSeparateFlags ? 1 << 2 : 1 << 0,
}
