/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be82545348/include/curl/curl.h#L2058
/**
 * Object with constants for option `UPLOAD_FLAGS`
 *
 * `CURLULFLAG_ANSWERED` becomes `CurlUploadFlag.Answered`
 *
 * @public
 */
export enum CurlUploadFlag {
  /**
   * Sets the Answered flag for IMAP uploads
   */
  Answered = 1 << 0,

  /**
   * Sets the Deleted flag for IMAP uploads
   */
  Deleted = 1 << 1,

  /**
   * Sets the Draft flag for IMAP uploads
   */
  Draft = 1 << 2,

  /**
   * Sets the Flagged flag for IMAP uploads
   */
  Flagged = 1 << 3,

  /**
   * Sets the Seen flag for IMAP uploads
   */
  Seen = 1 << 4,
}
