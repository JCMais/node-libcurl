/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be82545348/include/curl/curl.h#L2015
/**
 * Object with constants for option `SSLVERSION`
 *
 * `CURL_SSLVERSION_DEFAULT` becomes `CurlSslVersion.Default`
 *
 * @public
 */
export enum CurlSslVersion {
  Default,
  TlsV1,
  SslV2,
  SslV3,
  TlsV1_0,
  TlsV1_1,
  TlsV1_2,
  TlsV1_3,
}

/**
 * Object with constants for option `SSLVERSION`
 *
 * The maximum TLS version can be set by using one of the `CurlSslVersionMax` fields of this Enum.
 * It is also possible to OR one of the `CurlSslVersion` fields with one of `CurlSslVersionMax`
 *
 * `CURL_SSLVERSION_MAX_TLSv1_0` becomes `CurlSslVersionMax.TlsV1_0`
 *
 * @public
 */
export enum CurlSslVersionMax {
  None = 0,
  Default = CurlSslVersion.TlsV1 << 16,
  TlsV1_0 = CurlSslVersion.TlsV1_0 << 16,
  TlsV1_1 = CurlSslVersion.TlsV1_1 << 16,
  TlsV1_2 = CurlSslVersion.TlsV1_2 << 16,
  TlsV1_3 = CurlSslVersion.TlsV1_3 << 16,
}
