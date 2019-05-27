/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be8254534898fccafc5d6cd04f6235f283cfbd/include/curl/curl.h#L7
/**
 * Object with constants for option `GSSAPI_DELEGATION`
 *
 * `CURLGSSAPI_DELEGATION_FLAG` becomes `CurlGssApi.DelegationFlag`
 *
 * @public
 */
export enum CurlGssApi {
  /**
   * None, default
   */
  None = 0,

  /**
   * if permitted by policy
   */
  PolicyFlag = 1 << 0,

  /**
   * delegate always
   */
  DelegationFlag = 1 << 1,
}
