import { CurlGlobalInit } from '../enum/CurlGlobalInit'

import { CurlInfo } from '../generated/CurlInfo'
import { CurlOption } from '../generated/CurlOption'
import { MultiOption } from '../generated/MultiOption'

export declare interface CurlNativeBindingObject {
  globalInit(flags: CurlGlobalInit): number
  globalCleanup(): void
  getVersion(): string
  VERSION_NUM: number

  info: CurlInfo
  option: CurlOption
  multi: MultiOption
}
