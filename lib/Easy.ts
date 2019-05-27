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
 * Easy Class
 *
 * @public
 */
class Easy extends bindings.Easy {}

export { Easy }
