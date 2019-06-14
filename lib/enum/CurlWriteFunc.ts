/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be8254534898fccafc5d6cd04f6235f283cfbd/include/curl/curl.h#L252
/**
 * Special return codes for `WRITEFUNCTION` option
 *
 * `CURL_WRITEFUNC_PAUSE` becomes `CurlWriteFunc.Pause`
 *
 * @public
 */
export enum CurlWriteFunc {
  Pause = 0x10000001,
}
