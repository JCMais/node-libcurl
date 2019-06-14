/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be8254534898fccafc5d6cd04f6235f283cfbd/include/curl/curl.h#L342
/**
 * Object to be used as the return value for the callback set with the option `FNMATCH_FUNCTION`
 *
 * `CURL_FNMATCHFUNC_MATCH` becomes `CurlFnMatch.Match`
 *
 * @public
 */
export enum CurlFnMatchFunc {
  Match,
  NoMatch,
  Fail,
}
