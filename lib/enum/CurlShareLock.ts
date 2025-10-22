/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Share } from '../Share'

// https://github.com/curl/curl/blob/e1be82545348/include/curl/curl.h#L2643
/**
 * Options to be used when setting `SHARE` or `UNSHARE` with {@link Share.setOpt | `Share#setOpt`}.
 *
 * `CURL_LOCK_DATA_SSL_SESSION` becomes `CurlShareLock.DataSslSession`
 *
 * @public
 */
export enum CurlShareLock {
  DataNone,
  /**
   * DataShare is used internally to say that the locking is just made to change
   * the internal state of the share itself.
   */
  DataShare,
  /**
   * Cookie data is shared across the easy handles using this shared object.
   * Note that this does not activate an easy handle's cookie handling. You can
   * do that separately by using CURLOPT_COOKIEFILE for example.
   */
  DataCookie,
  /**
   * Cached DNS hosts are shared across the easy handles using this shared object.
   * Note that when you use the multi interface, all easy handles added to the
   * same multi handle share the DNS cache by default without using this option.
   */
  DataDns,
  /**
   * SSL sessions are shared across the easy handles using this shared object.
   * This reduces the time spent in the SSL handshake when reconnecting to the
   * same server.
   *
   * Note that when you use the multi interface, all easy handles added to the
   * same multi handle share the SSL session cache by default without using
   * this option.
   */
  DataSslSession,
  /**
   * Put the connection cache in the share object and make all easy handles using this share object share the connection cache.
   * Connections that are used for HTTP/2 or HTTP/3 multiplexing only get additional transfers added to them if the existing connection is held by the same multi or easy handle. libcurl does not support doing multiplexed streams in different threads using a shared connection.
   * Note that when you use the multi interface, all easy handles added to the same multi handle share the connection cache by default without using this option.
   */
  DataConnect,
  /**
   * The Public Suffix List stored in the share object is made available to all easy handle bound to the later. Since the Public Suffix List is periodically refreshed, this avoids updates in too many different contexts.
   *
   * Note that when you use the multi interface, all easy handles added to the same multi handle share the PSL cache by default without using this option.
   */
  DataPsl,
  /**
   * The in-memory HSTS cache.
   */
  DataHsts,
}
