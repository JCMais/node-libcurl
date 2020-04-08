/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { NodeLibcurlNativeBinding } from './types'

const bindings: NodeLibcurlNativeBinding = require('../lib/binding/node_libcurl.node')

/**
 * Multi class
 *
 * @public
 */
class Multi extends bindings.Multi {
  /**
   * Options to be used with `Multi.setOpt`
   *
   * See the official documentation of [curl_multi_setopt()](http://curl.haxx.se/libcurl/c/curl_multi_setopt.html)
   *  for reference.
   *
   * `CURLMOPT_MAXCONNECTS` becomes `Multi.option.MAXCONNECTS`
   */
  static option = bindings.Curl.multi
}

export { Multi }
