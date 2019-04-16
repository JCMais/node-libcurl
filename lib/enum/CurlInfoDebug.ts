// https://github.com/curl/curl/blob/e1be8254534898/include/curl/curl.h#L452
/**
 * When the option `DEBUGFUNCTION` is set,
 *  the first argument to the callback will be one of these.
 *
 * `CURLINFO_SSL_DATA_IN` becomes `CurlInfoDebug.SslDataOut`
 */
export enum CurlInfoDebug {
  Text,
  HeaderIn,
  HeaderOut,
  DataIn,
  DataOut,
  SslDataIn,
  SslDataOut,
}
