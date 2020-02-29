/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/8bd863f97b6c79f561bc063e634cecdf4badf776/include/curl/curl.h#L214-L216
/**
 * To be used with the progress callback
 *
 * `CURL_PROGRESSFUNC_CONTINUE` becomes `CurlProgressFunc.Continue`
 *
 * @public
 */
export enum CurlProgressFunc {
  /**
   * This is a return code for the progress callback that, when returned, will
   * signal libcurl to continue executing the default progress function
   * Added on libcurl 7.68
   */
  Continue = 0x10000001,
}
