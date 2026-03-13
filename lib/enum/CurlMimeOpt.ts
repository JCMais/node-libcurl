/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/master/include/curl/curl.h
/**
 * MIME option flags for use with {@link https://curl.se/libcurl/c/CURLOPT_MIME_OPTIONS.html | CURLOPT_MIME_OPTIONS}
 *
 * These flags control how MIME structures and multipart form data are encoded.
 *
 * `CURLMIMEOPT_FORMESCAPE` becomes `CurlMimeOpt.FormEscape`
 *
 * @public
 */
export enum CurlMimeOpt {
  /**
   * Tells libcurl to escape multipart form field and filenames using the
   * backslash-escaping algorithm rather than percent-encoding (HTTP only).
   *
   * Backslash-escaping consists in preceding backslashes and double quotes with
   * a backslash. Percent encoding maps all occurrences of double quote, carriage
   * return and line feed to %22, %0D and %0A respectively.
   *
   * Before libcurl 7.81.0, percent-encoding was never applied.
   *
   * HTTP browsers used to do backslash-escaping in the past but have over time
   * transitioned to use percent-encoding. This option allows one to address
   * server-side applications that have not yet been converted.
   *
   * As an example, consider field or filename `strangename"kind`. When the
   * containing multipart form is sent, this is normally transmitted as
   * `strangename%22kind`. When this option is set, it is sent as `strangename\"kind`.
   *
   * Available since libcurl 7.81.0.
   */
  FormEscape = 1 << 0,
}
