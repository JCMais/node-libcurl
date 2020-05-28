/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { CurlVersion } from '../enum/CurlVersion'

/**
 * This is the data returned on {@link Curl.getVersionInfo| `Curl.getVersionInfo`}.
 *
 * It's basically the output of [`curl_version_info()`](https://curl.haxx.se/libcurl/c/curl_version_info.html)
 */
export declare interface CurlVersionInfoNativeBindingObject {
  /**
   * List of protocols supported. Example:
   * ```json
   * [
   *  'dict',  'file',   'ftp',
   *  'ftps',  'gopher', 'http',
   *  'https', 'imap',   'imaps',
   *  'ldap',  'ldaps',  'pop3',
   *  'pop3s', 'rtsp',   'scp',
   *  'sftp',  'smb',    'smbs',
   *  'smtp',  'smtps',  'telnet',
   *  'tftp'
   * ]
   * ```
   */
  protocols: string[]
  /**
   * List of features supported. Example:
   * ```json
   * [
   *  'AsynchDNS', 'IDN',
   *  'IPv6',      'Largefile',
   *  'SSPI',      'Kerberos',
   *  'SPNEGO',    'NTLM',
   *  'SSL',       'libz',
   *  'HTTP2',     'HTTPS-proxy'
   * ]
   * ```
   */
  features: string[]
  /**
   * Raw feature flags
   */
  rawFeatures: CurlVersion
  /**
   * Libcurl version. Example:
   * ```
   * 7.69.1-DEV
   * ```
   */
  version: string
  /**
   * Integer representation of libcurl version, created like this:
   * ```
   * <8 bits major number> | <8 bits minor number> | <8 bits patch number>.
   * ```
   * Version `7.69.1` is therefore returned as `0x074501`.
   */
  versionNumber: number
  /**
   * SSL library human readable version string
   */
  sslVersion: string
  /**
   * This is not used - Will always be 0
   */
  sslVersionNum: 0
  /**
   * libz human readable version string
   */
  libzVersion: string
  /**
   * cares human readable version string
   * Will be null if libcurl was not built with cares
   */
  aresVersion: string | null
  /**
   * cares version number
   * Will be null if libcurl was not built with cares
   */
  aresVersionNumber: number
  /**
   * libidn human readable version string
   * Will be null if libcurl was not built with libidn
   */
  libidnVersion: string | null
  /**
   * iconv version number
   * Will be 0 if libcurl was not built with iconv
   */
  iconvVersionNumber: number
  /**
   * libssh human readable version string
   * Will be null if libcurl was not built with libssh
   */
  libsshVersion: string | null
  /**
   * brotli version number
   * Will be 0 if libcurl was not built with brotli
   */
  brotliVersionNumber: number
  /**
   * brotli human readable version string
   * Will be null if libcurl was not built with brotli
   */
  brotliVersion: string | null
}
