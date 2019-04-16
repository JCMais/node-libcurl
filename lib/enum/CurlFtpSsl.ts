// https://github.com/curl/curl/blob/e1be8254534/include/curl/curl.h#L846
/**
 * Object with constants for option `FTP_SSL_CCC`
 *
 * `CURLFTPSSL_CCC_NONE` becomes `CurlFtpSsl.CccNone`
 */
export enum CurlFtpSsl {
  /**
   * do not send CCC
   */
  CccNone,
  /**
   * Let the server initiate the shutdown
   */
  CccPassive,
  /**
   * Initiate the shutdown
   */
  CccActive,
}
