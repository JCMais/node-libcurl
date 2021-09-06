/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be82545348/include/curl/curl.h#L725
/**
 * Object with bitmasks that should be used with the `HTTPAUTH` and `PROXYAUTH` options.
 *
 * `CURLAUTH_BASIC` becomes `CurlAuth.Basic`
 *
 * **NOTE:** The option `Only` (`CURLAUTH_ONLY`) cannot be safely used on bitwise operations, because it represents a integer larger
 *  than 32 bits, if you need to use it, you must do the bitwise operation without using the operators.
 *
 * See following StackOverflow questions for more info:
 *  https://stackoverflow.com/q/39660274/710693
 *  https://stackoverflow.com/q/3637702/710693
 *
 * @public
 */
export enum CurlAuth {
  None = 0,
  Basic = 1 << 0,
  Digest = 1 << 1,
  Negotiate = 1 << 2,
  /**
   * Deprecated since the advent of Negotiate
   */
  GssNegotiate = Negotiate,
  /**
   * Used for option `SOCKS5_AUTH` to stay terminologically correct
   */
  GssApi = Negotiate,
  Ntlm = 1 << 3,
  DigestIe = 1 << 4,
  NtlmWb = 1 << 5,
  Bearer = 1 << 6,
  AwsSigV4 = 1 << 7,
  // cannot use 1 << 31 like on libcurl, because bitwise operations on js are limited to 32 bits, so that would overflow
  Only = 2147483648,
  Any = ~DigestIe,
  AnySafe = ~(Basic | DigestIe),
}

// https://github.com/curl/curl/blob/e1be825453/include/curl/curl.h#L853
/**
 * Object with constants for option `FTPSSLAUTH`
 *
 * `CURLFTPAUTH_DEFAULT` becomes `CurlFtpAuth.Default`
 *
 * @public
 */
export enum CurlFtpAuth {
  Default,
  Ssl,
  Tls,
}
