// https://github.com/curl/curl/blob/e1be825453/include/curl/curl.h#L1964
/**
 * Object with constants to be used with the `HTTP_VERSION` option.
 *
 * `CURL_HTTP_VERSION_NONE` becomes `CurlHttpVersion.None`
 *   and `CURL_HTTP_VERSION_1_0` becomes `CurlHttpVersion.V1_0`
 */
export enum CurlHttpVersion {
  /**
   * Setting this means we don't care, and that we'd
   * like the library to choose the best possible
   * for us!
   */
  None,
  V1_0,
  V1_1,
  V2_0,
  /**
   * Use version 2 for HTTPS, version 1.1 for HTTP
   */
  V2Tls,
  /**
   * Use HTTP 2 without HTTP/1.1 Upgrade
   */
  V2PriorKnowledge,
}
