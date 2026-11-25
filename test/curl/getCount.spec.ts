/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, it, expect } from 'vitest'

import { Curl } from '../../lib'

describe('Curl.getCount()', () => {
  it('should return the number of handles in the internal multi handle', () => {
    expect(Curl.getCount()).toBe(0)

    const curl = new Curl()
    try {
      // not performing, so the handle is not inside the multi yet
      expect(Curl.getCount()).toBe(0)
    } finally {
      curl.close()
    }
  })
})
