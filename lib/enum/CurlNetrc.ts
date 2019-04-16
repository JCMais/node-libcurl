// https://github.com/curl/curl/blob/e1be82545/include/curl/curl.h#L2003
/**
 * To be used with the `NETRC` option
 *
 * `CURL_NETRC_OPTIONAL` becomes `CurlNetrc.Optional`
 */
export enum CurlNetrc {
  /**
   * The .netrc will never be read.
   * This is the default
   */
  Ignored,
  /**
   * A user:password in the URL will be preferred to one in the .netrc
   */
  Optional,
  /**
   * A user:password in the URL will be ignored.
   * Unless one is set programmatically, the .netrc
   * will be queried.
   */
  Required,
}
