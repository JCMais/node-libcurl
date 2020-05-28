/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { CurlGlobalInit } from '../enum/CurlGlobalInit'

import { CurlInfo } from '../generated/CurlInfo'
import { CurlOption } from '../generated/CurlOption'
import { MultiOption } from '../generated/MultiOption'

/**
 * This is the internal `Curl` object exported by the addon. It's not available for library users directly.
 *
 * @internal
 */
export declare interface CurlNativeBindingObject {
  globalInit(flags: CurlGlobalInit): number
  globalCleanup(): void
  getVersion(): string
  VERSION_NUM: number

  info: CurlInfo
  option: CurlOption
  multi: MultiOption
}
