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
  /**
   * This is a magic return code for the write callback that, when returned,
   * will signal libcurl to pause receiving on the current transfer.
   */
  Pause = 0x10000001,
  /**
   * This is a magic return code for the write callback that, when returned,
   * will signal an error from the callback.
   */
  Abort = 0xffffffff,
}
