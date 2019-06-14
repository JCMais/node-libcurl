/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/c4e0be44089/include/curl/curl.h#L2630
/**
 * @public
 */
export const enum CurlGlobalInit {
  Nothing = 0,
  /* no purpose since 7.57.0 */
  Ssl = 1 << 0,
  Win32 = 1 << 1,
  All = Ssl | Win32,
  Default = All,
  AckEintr = 1 << 2,
}
