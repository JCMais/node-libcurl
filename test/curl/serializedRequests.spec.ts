/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeAll, afterAll, it, expect } from 'vitest'

import { createServer } from '../helper/server'
import { Curl, Multi } from '../../lib'
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
    const performOnce = (multi?: Multi) =>
      new Promise<number>((resolve, reject) => {
        const startedAt = process.hrtime.bigint()
        const curl = new Curl()
        withCommonTestOptions(curl)
        curl.setOpt('URL', serverInstance.url)

        if (multi) {
          curl.setMulti(multi)
        }

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

    // Against a local server each request is sub-millisecond. The bug pinned
    // every one of them at libcurl's multi timer period (~1000ms), so a
    // generous threshold still separates the two regimes decisively.
    const medianSerializedLatency = async (multi?: Multi) => {
      // warm-up: the very first request pays for connection setup and JIT
      await performOnce(multi)

      const latencies: number[] = []
      for (let i = 0; i < 10; i += 1) {
        latencies.push(await performOnce(multi))
      }

      const sorted = [...latencies].sort((a, b) => a - b)
      return sorted[Math.floor(sorted.length / 2)]
    }

    it('should emit end without waiting for the multi timer when requests are awaited one at a time', async () => {
      expect(await medianSerializedLatency()).toBeLessThan(250)
    })

    // The default Multi drains completions from Multi::NotifyCallback when built
    // against libcurl >= 8.17, and straight from OnSocket / OnTimeout otherwise.
    // Both are inside the callback scopes this guards, so pin the polling
    // fallback explicitly instead of relying on a libcurl < 8.17 build to be the
    // only thing exercising it.
    it('should emit end without waiting for the multi timer when the notifications API is disabled', async () => {
      const multi = new Multi({ shouldUseNotificationsApi: false })

      try {
        expect(await medianSerializedLatency(multi)).toBeLessThan(250)
      } finally {
        multi.close()
      }
    })
  })
})
