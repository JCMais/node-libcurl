// https://github.com/curl/curl/blob/e1be8254534898/include/curl/curl.h#L801

/**
 * Object with constants for option `USE_SSL`
 *
 * `CURLUSESSL_NONE` becomes `CurlUseSsl.None`
 */
export enum CurlUseSsl {
  None,
  Try,
  Control,
  All,
}
