// https://github.com/curl/curl/blob/7e35eb77292f/include/curl/multi.h#L84

/**
 * Object with bit constants to be used with the multi handle option ``PIPELINING``
 * Those are available starting with libcurl 7.43.0.
 *
 * ``CURLPIPE_NOTHING`` becomes ``CurlPipe.Nothing``
 */
export enum CurlPipe {
  Nothing,
  Http1,
  Multiplex,
}
