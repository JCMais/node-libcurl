/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be825453489/include/curl/curl.h#L873

/**
 * Object with constants for option `FTP_FILEMETHOD`
 *
 * `CURLFTPMETHOD_MULTICWD` becomes `CurlFtpMethod.MultiCwd`
 *
 * @public
 */
export enum CurlFtpMethod {
  /**
   * let libcurl pick
   */
  DEFAULT,
  /**
   * single CWD operation for each path part
   */
  MULTICWD,
  /**
   * no CWD at all
   */
  NOCWD,
  /**
   * one CWD to full dir, then work on file
   */
  SINGLECWD,
}
