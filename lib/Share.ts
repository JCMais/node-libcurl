/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { NodeLibcurlNativeBinding } from './types'
import { CurlShareOption } from './enum/CurlShareOption'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bindings: NodeLibcurlNativeBinding = require('../lib/binding/node_libcurl.node')

/**
 * This is a Node.js wrapper around the binding {@link EasyNativeBinding | native Easy class}.
 *
 * The only extra is that it provides a static field `option` and `lock`.
 *
 * @public
 */
class Share extends bindings.Share {
  /**
   * Options to be used with {@link setOpt | `setOpt`}.
   *
   * See the official documentation of [`curl_share_setopt()`](http://curl.haxx.se/libcurl/c/curl_share_setopt.html)
   *  for reference.
   *
   * `CURLSHOPT_SHARE` becomes `Share.option.SHARE`
   *
   * @deprecated Use {@link CurlShareOption|`CurlShareOption`} directly instead.
   */
  static option = CurlShareOption
}

export { Share }
