/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeAll, afterAll, it, expect } from 'vitest'

import { createServer } from '../helper/server'
import { Curl } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

let serverInstance: ReturnType<typeof createServer>

// Regression guard for requests awaited one at a time.
//
// Multi::OnSocket and Multi::OnTimeout enter JS from a libuv callback. The
// promise `perform()` settles is resolved from there, and Node.js only runs a
// microtask checkpoint when a callback scope is closed. Without one, the
// continuation that emits `end` was not scheduled until the next tick of
// libcurl's multi timer, making every serialized request take ~1s on Node.js 26
// (Linux). Concurrency hid it, because other transfers kept the loop busy.
describe('Curl', () => {
  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.get('/', (_req, res) => {
      res.send('Hello World!')
    })
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
    serverInstance.app._router.stack.pop()
  })

  describe('perform', () => {
    const performOnce = () =>
      new Promise<number>((resolve, reject) => {
        const startedAt = process.hrtime.bigint()
        const curl = new Curl()
        withCommonTestOptions(curl)
        curl.setOpt('URL', serverInstance.url)

        curl.on('end', () => {
          const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6
          curl.close()
          resolve(elapsedMs)
        })
        curl.on('error', (error) => {
          curl.close()
          reject(error)
        })

        curl.perform()
      })

    it('should emit end without waiting for the multi timer when requests are awaited one at a time', async () => {
      // warm-up: the very first request pays for connection setup and JIT
      await performOnce()

      const latencies: number[] = []
      for (let i = 0; i < 10; i += 1) {
        latencies.push(await performOnce())
      }

      // Against a local server each request is sub-millisecond. The bug pinned
      // every one of them at libcurl's multi timer period (~1000ms), so a
      // generous threshold still separates the two regimes decisively.
      const sorted = [...latencies].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]

      expect(median).toBeLessThan(250)
    })
  })
})
