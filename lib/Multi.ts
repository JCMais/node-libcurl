/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import path from 'path'

// tslint:disable-next-line
import binary from 'node-pre-gyp'

import { NodeLibcurlNativeBinding } from './types'

const bindingPath = binary.find(
  path.resolve(path.join(__dirname, './../package.json')),
)

const bindings: NodeLibcurlNativeBinding = require(bindingPath)

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
