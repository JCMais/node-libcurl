/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { NodeLibcurlNativeBinding } from './types'

const bindings: NodeLibcurlNativeBinding = require('../lib/binding/node_libcurl.node')

/**
 * Easy Class
 *
 * @public
 */
class Easy extends bindings.Easy {}

export { Easy }
