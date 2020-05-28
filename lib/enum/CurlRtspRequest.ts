/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be82545348/include/curl/curl.h#L1987
/**
 * Object with constants for option `RTSP_REQUEST`
 * Only available on libcurl >= 7.20
 *
 * `CURL_RTSPREQ_OPTIONS` becomes `CurlRtspRequest.Options`
 *
 * @public
 */
export enum CurlRtspRequest {
  None,
  Options,
  Describe,
  Announce,
  Setup,
  Play,
  Pause,
  Teardown,
  GetParameter,
  SetParameter,
  Record,
  Receive,
}
