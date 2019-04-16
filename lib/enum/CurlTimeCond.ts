// https://github.com/curl/curl/blob/e1be82545348/include/curl/curl.h#L2058
/**
 * Object with constants for option `TIMECONDITION`
 *
 * `CURL_TIMECOND_IFMODSINCE` becomes `CurlTimeCond.IfModSince`
 */
export enum CurlTimeCond {
  None,
  IfModSince,
  IfUnmodSince,
  LastMod,
}
