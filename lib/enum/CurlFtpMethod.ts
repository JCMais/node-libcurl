/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be825453489/include/curl/curl.h#L873
// @TODO Fix enum members naming on semver major bump
/**
 * Object with constants for option `FTP_FILEMETHOD`
 *
 * `CURLFTPMETHOD_MULTICWD` becomes `CurlFtpMethod.MULTICWD`
 *
 * This is not following the PascalCase naming format because of a mistake. To not cause a breaking change
 *  it will stay this way until the next major version bump.
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
