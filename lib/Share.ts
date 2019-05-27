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
import { CurlShareOption } from './enum/CurlShareOption'

const bindingPath = binary.find(
  path.resolve(path.join(__dirname, './../package.json')),
)

const bindings: NodeLibcurlNativeBinding = require(bindingPath)

/**
 * Share class
 *
 * @public
 */
class Share extends bindings.Share {
  /**
   * Options to be used with `Share.setOpt`
   *
   * See the official documentation of [curl_share_setopt()](http://curl.haxx.se/libcurl/c/curl_share_setopt.html)
   *  for reference.
   *
   * `CURLSHOPT_SHARE` becomes `Share.option.SHARE`
   */
  static option = CurlShareOption
}

export { Share }
