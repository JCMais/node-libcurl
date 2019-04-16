// https://github.com/curl/curl/blob/e1be825453/include/curl/curl.h#L880
/**
 * Object with bitmasks to be used with `HEADEROPT`.
 *
 * Available since libcurl version >= 7.37.0
 *
 * `CURLHEADER_UNIFIED` becomes `CurlHeader.Unified`
 */
export enum CurlHeader {
  Unified = 0,
  Separate = 1 << 0,
}
