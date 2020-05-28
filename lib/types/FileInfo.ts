/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { CurlFileType } from '../enum/CurlFileType'

/**
 * This is the object passed as first parameter to the callback set with the `CHUNK_BGN_FUNCTION` option.
 *
 * @public
 */
export type FileInfo = {
  fileType: CurlFileType
  fileName: string
  time: Date
  perm: number
  uid: number
  gid: number
  size: number
  hardLinks: number
  strings: {
    time: string
    perm: string
    user: string
    group: string
    target: string | null
  }
}
