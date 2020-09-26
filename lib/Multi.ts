/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { NodeLibcurlNativeBinding } from './types'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bindings: NodeLibcurlNativeBinding = require('../lib/binding/node_libcurl.node')

/**
 * This is a Node.js wrapper around the binding {@link MultiNativeBinding | native Multi class}.
 *
 * The only extra is that it provides a static field `option`.
 *
 * @public
 */
class Multi extends bindings.Multi {
  /**
   * Options to be used with {@link setOpt | `setOpt`}.
   *
   * See the official documentation of [`curl_multi_setopt()`](http://curl.haxx.se/libcurl/c/curl_multi_setopt.html)
   *  for reference.
   *
   * `CURLMOPT_MAXCONNECTS` becomes `Multi.option.MAXCONNECTS`
   */
  static option = bindings.Curl.multi
}

export { Multi }
