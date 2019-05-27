/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be8254/include/curl/curl.h#L2828
/**
 * Options to be used with `Easy.pause` or `Curl.pause`
 *
 * `CURLPAUSE_RECV_CONT` becomes `CurlPause.RecvCont`
 *
 * This also contains a special member called WriteFuncPause, that when returned from the WriteFunction callback
 *  will pause the current request
 */
export enum CurlPause {
  Recv = 1 << 0,
  RecvCont = 0,

  Send = 1 << 2,
  SendCont = 0,

  All = Recv | Send,
  Cont = RecvCont | SendCont,

  // https://github.com/curl/curl/blob/e1be8254534898fccafc5d6cd04f6235f283cfbd/include/curl/curl.h#L252
  WriteFuncPause = 0x10000001,
}
