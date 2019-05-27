/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/7e35eb77292f/include/curl/multi.h#L84
/**
 * Object with bit constants to be used with the multi handle option `PIPELINING`
 * Those are available starting with libcurl 7.43.0.
 *
 * `CURLPIPE_NOTHING` becomes `CurlPipe.Nothing`
 *
 * @public
 */
export enum CurlPipe {
  Nothing,
  Http1,
  Multiplex,
}
