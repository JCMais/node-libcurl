/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be8254/include/curl/curl.h#L2828
/**
 * Options to be used with {@link "Easy".Easy.pause | `Easy#pause`} and {@link "Curl".Curl.pause | `Curl#pause`}.
 *
 * `CURLPAUSE_RECV_CONT` becomes `CurlPause.RecvCont`
 *
 * @public
 */
export enum CurlPause {
  Recv = 1 << 0,
  RecvCont = 0,

  Send = 1 << 2,
  SendCont = 0,

  All = Recv | Send,
  Cont = RecvCont | SendCont,
}
