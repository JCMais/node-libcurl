/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeAll, afterAll, it, expect } from 'vitest'

import { createServer } from '../helper/server'
import { Easy, Multi } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let serverInstance: ReturnType<typeof createServer>

const createEasy = (path = '/') => {
  const easy = new Easy()
  withCommonTestOptions(easy)
  easy.setOpt('URL', `${serverInstance.url}${path}`)
  easy.setOpt('WRITEFUNCTION', (_buffer, size, nmemb) => size * nmemb)
  return easy
}

describe('Multi lifecycle', () => {
  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.get('/', (_req, res) => {
      res.send('Hello World!')
    })
    serverInstance.app.get('/delay', (_req, res) => {
      setTimeout(() => res.send('finally!'), 1000)
    })
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
  })

  it('rejects pending perform() promises when the multi is closed', async () => {
    const multi = new Multi()
    const easy = createEasy('/delay')

    const promise = multi.perform(easy)
    // let the transfer actually start
    await sleep(50)

    multi.close()

    await expect(promise).rejects.toThrow(/closed/i)

    // the easy must have been detached so it can be closed by the user
    expect(easy.isInsideMultiHandle).toBe(false)
    expect(() => easy.close()).not.toThrow()

    // give any stray socket events a chance to fire against the closed multi
    await sleep(100)
  })

  it('settles the pending request when its easy handle is removed', async () => {
    const multi = new Multi()
    const easy = createEasy('/delay')

    try {
      const request = multi.perform(easy)
      const rejected = expect(request).rejects.toThrow(/removed/i)
      multi.removeHandle(easy)
      await rejected

      multi.removeHandle(easy)
      expect(multi.getCount()).toBe(0)
      expect(easy.isInsideMultiHandle).toBe(false)
    } finally {
      multi.close()
      easy.close()
    }
  })

  it('detaches handles added with addHandle() when the multi is closed', async () => {
    const multi = new Multi()
    const easy = createEasy('/delay')

    multi.onMessage(() => {})
    multi.addHandle(easy)
    await sleep(50)

    multi.close()

    expect(easy.isInsideMultiHandle).toBe(false)
    expect(() => easy.close()).not.toThrow()

    await sleep(100)
  })

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

  it('keeps a fire-and-forget easy alive until the transfer finishes', async () => {
    const multi = new Multi()

    // no reference to the easy handle is kept by this scope
    const promise = multi.perform(createEasy('/delay'))

    await sleep(50)
    global.gc?.()
    await sleep(50)
    global.gc?.()

    const easy = await promise
    expect(easy.isOpen).toBe(true)

    multi.removeHandle(easy)
    easy.close()
    multi.close()
  })

  it('supports removing and closing everything from inside the onMessage callback', async () => {
    const multi = new Multi()
    const easy = createEasy()

    await new Promise<void>((resolve, reject) => {
      multi.onMessage((error, handle) => {
        try {
          if (error) {
            throw error
          }
          multi.removeHandle(handle)
          handle.close()
          multi.close()
          resolve()
        } catch (callbackError) {
          reject(callbackError)
        }
      })

      multi.addHandle(easy)
    })

    // give any stray socket events a chance to fire against the closed multi
    await sleep(100)
  })
})
