/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be8254534898/include/curl/curl.h#L801
/**
 * Object with constants for option `USE_SSL`
 *
 * `CURLUSESSL_NONE` becomes `CurlUseSsl.None`
 *
 * @public
 */
export enum CurlUseSsl {
  None,
  Try,
  Control,
  All,
}
