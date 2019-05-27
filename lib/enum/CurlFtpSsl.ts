/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be8254534/include/curl/curl.h#L846
/**
 * Object with constants for option `FTP_SSL_CCC`
 *
 * `CURLFTPSSL_CCC_NONE` becomes `CurlFtpSsl.CccNone`
 *
 * @public
 */
export enum CurlFtpSsl {
  /**
   * do not send CCC
   */
  CccNone,
  /**
   * Let the server initiate the shutdown
   */
  CccPassive,
  /**
   * Initiate the shutdown
   */
  CccActive,
}
