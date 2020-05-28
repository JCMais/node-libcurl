/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Object with constants for use with the `rawFeatures` member
 *  of {@link CurlVersionInfoNativeBindingObject | `CurlVersionInfoNativeBindingObject`}, which is returned
 *  from {@link Curl.getVersionInfo | `Curl.getVersionInfo`}.
 *
 * `CURL_VERSION_IPV6` becomes `CurlVersion.Ipv6`
 * `CURL_VERSION_GSSNEGOTIATE` becomes `CurlVersion.GssNegotiate`
 * ...
 *
 * @public
 */
export enum CurlVersion {
  /**
   * IPv6-enabled
   */
  Ipv6 = 1 << 0,
  /**
   * Kerberos V4 auth is supported (deprecated)
   */
  Kerberos4 = 1 << 1,
  /**
   * SSL options are present
   */
  Ssl = 1 << 2,
  /**
   * libz features are present
   */
  Libz = 1 << 3,
  /**
   * NTLM auth is supported
   */
  Ntlm = 1 << 4,
  /**
   * Negotiate auth is supported (deprecated)
   */
  GssNegotiate = 1 << 5,
  /**
   * libcurl was built with debug capabilities
   */
  Debug = 1 << 6,
  /**
   * Asynchronous DNS resolver is available
   */
  AsynchDns = 1 << 7,
  /**
   * SPNEGO auth is supported
   */
  Spnego = 1 << 8,
  /**
   * Supports files larger than 2GB
   */
  LargeFile = 1 << 9,
  /**
   * Internationized Domain Names are supported
   */
  Idn = 1 << 10,
  /**
   * Built against Windows SSPI
   */
  Sspi = 1 << 11,
  /**
   * Character conversions supported
   */
  Conv = 1 << 12,
  /**
   * Debug memory tracking supported
   */
  CurlDebug = 1 << 13,
  /**
   * TLS-SRP auth is supported
   */
  TlsAuthSrp = 1 << 14,
  /**
   * NTLM delegation to winbind helper is supported
   */
  NtlmWb = 1 << 15,
  /**
   * HTTP2 support built-in
   */
  Http2 = 1 << 16,
  /**
   * Built against a GSS-API library
   */
  GssApi = 1 << 17,
  /**
   * Kerberos V5 auth is supported
   */
  Kerberos5 = 1 << 18,
  /**
   * Unix domain sockets support
   */
  UnixSockets = 1 << 19,
  /**
   * Mozilla's Public Suffix List, used for cookie domain verification
   */
  Psl = 1 << 20,
  /**
   * HTTPS-proxy support built-in
   */
  HttpsProxy = 1 << 21,
  /**
   * Multiple SSL backends available
   */
  MultiSsl = 1 << 22,
  /**
   * Brotli features are present.
   */
  Brotli = 1 << 23,
  /**
   * Alt-Svc handling built-in
   */
  AltSvc = 1 << 24,
  /**
   * HTTP3 support built-in
   */
  Http3 = 1 << 25,
}
