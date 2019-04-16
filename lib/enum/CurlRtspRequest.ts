// https://github.com/curl/curl/blob/e1be82545348/include/curl/curl.h#L1987
/**
 * Object with constants for option `RTSP_REQUEST`
 * Only available on libcurl >= 7.20
 *
 * `CURL_RTSPREQ_OPTIONS` becomes `CurlRtspRequest.Options`
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
