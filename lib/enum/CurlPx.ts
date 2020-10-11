/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// https://github.com/curl/curl/blob/a4c26b0abebde418fddab7187ca089b78b6ef6d5/include/curl/curl.h#L697-L733
/**
 * Object with constants for usage with the info `PROXY_ERROR`
 *
 * `CURLPX_OK` becomes `CurlPx.Ok`
 *
 * @public
 */
export enum CurlPx {
  Ok,
  BadAddressType,
  BadVersion,
  Closed,
  Gssapi,
  GssapiPermsg,
  GssapiProtection,
  Identd,
  IdentdDiffer,
  LongHostname,
  LongPasswd,
  LongUser,
  NoAuth,
  RecvAddress,
  RecvAuth,
  RecvConnect,
  RecvReqack,
  ReplyAddressTypeNotSupported,
  ReplyCommandNotSupported,
  ReplyConnectionRefused,
  ReplyGeneralServerFailure,
  ReplyHostUnreachable,
  ReplyNetworkUnreachable,
  ReplyNotAllowed,
  ReplyTtlExpired,
  ReplyUnassigned,
  RequestFailed,
  ResolveHost,
  SendAuth,
  SendConnect,
  SendRequest,
  UnknownFail,
  UnknownMode,
  UserRejected,
}
