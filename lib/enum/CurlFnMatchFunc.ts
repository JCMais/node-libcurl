// https://github.com/curl/curl/blob/e1be8254534898fccafc5d6cd04f6235f283cfbd/include/curl/curl.h#L342
/**
 * Object to be used as the return value for the callback set with the option `FNMATCH_FUNCTION`
 *
 * `CURL_FNMATCHFUNC_MATCH` becomes `CurlFnMatch.Match`
 */
export enum CurlFnMatchFunc {
  Match,
  NoMatch,
  Fail,
}
