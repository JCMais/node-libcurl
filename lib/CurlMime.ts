/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import './moduleSetup'

import { CurlMimePart } from './CurlMimePart'
import { Easy } from './Easy'
import { Curl } from './Curl'

/**
 * `CurlMime` class that acts as a wrapper around the native libcurl mime handle.
 * > [C++ source code](https://github.com/JCMais/node-libcurl/blob/master/src/CurlMime.cc)
 *
 * This class is used to create MIME structures for multipart form data uploads.
 * It replaces the deprecated HTTPPOST option and provides more flexibility and features.
 *
 * @remarks
 * The MIME API is available in libcurl 7.56.0 and later. If you're using an older
 * version of libcurl, you'll need to use the deprecated HTTPPOST option instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { Curl, CurlMime } from 'node-libcurl'
 *
 * const curl = new Curl()
 * const mime = new CurlMime(curl)
 *
 * mime
 *   .addPart()
 *   .setName('field_name')
 *   .setData('field_value')
 *
 * mime
 *   .addPart()
 *   .setName('file')
 *   .setFiledata('/path/to/file.txt')
 *
 * curl.setOpt('URL', 'https://httpbin.org/post')
 * curl.setOpt('MIMEPOST', mime)
 * curl.perform()
 * ```
 *
 * @see {@link https://curl.se/libcurl/c/curl_mime_init.html | curl_mime_init}
 * @see {@link https://curl.se/libcurl/c/CURLOPT_MIMEPOST.html | CURLOPT_MIMEPOST}
 *
 * @public
 */
// @ts-expect-error - we are abusing TS merging here to have sane types for the addon classes
declare class CurlMime {
  /**
   * Creates a new MIME structure associated with an Easy or Curl handle.
   *
   * @param handle - The Easy or Curl handle this MIME structure will be associated with
   *
   * @example
   * ```typescript
   * const curl = new Curl()
   * const mime = new CurlMime(curl)
   * ```
   *
   * @example
   * ```typescript
   * const easy = new Easy()
   * const mime = new CurlMime(easy)
   * ```
   */
  constructor(handle: Easy | Curl)

  /**
   * Adds a new empty part to this MIME structure.
   *
   * @returns A new {@link CurlMimePart} instance that can be configured
   *
   * @example
   * ```typescript
   * const mime = new CurlMime(curl)
   * mime
   *  .addPart()
   *  .setName('field_name')
   *  .setData('field_value')
   * ```
   *
   * @see {@link https://curl.se/libcurl/c/curl_mime_addpart.html | curl_mime_addpart}
   */
  addPart(): CurlMimePart
}

const bindings: any = require('../lib/binding/node_libcurl.node')

// @ts-expect-error - we are abusing TS merging here to have sane types for the addon classes
const CurlMime = bindings.CurlMime as typeof CurlMime

export { CurlMime }
