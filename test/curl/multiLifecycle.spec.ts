/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, expect, it } from 'vitest'

import { Multi } from '../../lib'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('Multi lifecycle', () => {
  it('releases the multi instance after close() so it can be collected', async () => {
    let multi: Multi | null = new Multi()
    const weakRef = new WeakRef(multi)

    multi.close()
    multi = null

    // The self reference is released from an async close callback, so give it
    // a few event loop iterations before forcing garbage collection.
    for (let i = 0; i < 5; i += 1) {
      await sleep(10)
      global.gc?.()
    }

    expect(weakRef.deref()).toBeUndefined()
  })
})
