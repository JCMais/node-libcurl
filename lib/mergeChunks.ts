/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * This function is used to merge the buffers
 *  that were stored while the request was being processed.
 *
 * @internal
 */
export function mergeChunks(chunks: Buffer[], length: number) {
  // We init the whole buffer below, so no need to use, the slower, Buffer.alloc
  const buffer = Buffer.allocUnsafe(length)
  const chunksLen = chunks.length

  let currentPos = 0

  for (let i = 0; i < chunksLen; i += 1) {
    const chunk = chunks[i]
    chunk.copy(buffer, currentPos)
    currentPos += chunk.length
  }

  return buffer
}
