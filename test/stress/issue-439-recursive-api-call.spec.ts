/**
 * Stress test for https://github.com/JCMais/node-libcurl/issues/439
 *
 * v5.0.0 enabled libcurl 8.17's CURLMOPT_NOTIFYFUNCTION by default. The
 * notify callback fires from inside curl_multi_socket_action. Our handler
 * synchronously resolves the perform() promise from there, and microtask
 * draining can then run the `.then()` handler — including the
 * curl_multi_remove_handle call — while libcurl is still on its own call
 * stack. libcurl rejects that with CURLM_RECURSIVE_API_CALL.
 *
 * The fix wraps removeHandle in setImmediate so libcurl unwinds first.
 *
 * This is a stress test (not part of the normal suite) because it has to
 * push enough concurrent work through the multi handle to make the
 * timing window observable. On Alpine + libcurl 8.17, the bug
 * reproduces in ~73% of requests under load; on glibc-based systems it
 * shows up more rarely but is still real. Either way, a clean run here
 * means the deferral is working.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'http'
import type { AddressInfo } from 'net'

import { Curl, CurlEasyError } from '../../lib'

const TARGET_DURATION_MS = Number(process.env.STRESS_DURATION_MS ?? 10_000)
const REQUESTS_PER_TICK = Number(process.env.STRESS_BURST ?? 40)
const TICK_INTERVAL_MS = Number(process.env.STRESS_INTERVAL_MS ?? 20)

describe('stress: recursive-api-call regression (#439)', () => {
  let server: http.Server
  let url: string

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('ok')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const addr = server.address() as AddressInfo
    url = `http://127.0.0.1:${addr.port}/`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it(
    `runs ${REQUESTS_PER_TICK} concurrent requests every ${TICK_INTERVAL_MS}ms for ${TARGET_DURATION_MS}ms without CURLM_RECURSIVE_API_CALL`,
    async () => {
      let completed = 0
      let recursive = 0
      const otherErrors: Error[] = []

      function fire() {
        const curl = new Curl()
        curl.setOpt('URL', url)
        curl.setOpt('TIMEOUT', 5)

        curl.on('end', () => {
          completed++
          curl.close()
        })
        curl.on('error', (err: Error) => {
          if (
            err instanceof CurlEasyError &&
            // CURLM_RECURSIVE_API_CALL = 8
            (err as CurlEasyError & { code?: number }).code === 8
          ) {
            recursive++
          } else if (err.message?.includes('within callback')) {
            // Belt and braces — if the error type ever changes, still catch
            // the underlying libcurl string.
            recursive++
          } else {
            otherErrors.push(err)
          }
          curl.close()
        })

        try {
          curl.perform()
        } catch (e) {
          otherErrors.push(e as Error)
        }
      }

      const recursiveFromRejection: string[] = []
      const onRejection = (reason: unknown) => {
        const message =
          reason instanceof Error
            ? reason.message
            : typeof reason === 'string'
              ? reason
              : ''
        if (message.includes('within callback')) {
          recursive++
          recursiveFromRejection.push(message)
        }
      }
      process.on('unhandledRejection', onRejection)

      try {
        const interval = setInterval(() => {
          for (let i = 0; i < REQUESTS_PER_TICK; i++) fire()
        }, TICK_INTERVAL_MS)

        await new Promise<void>((resolve) =>
          setTimeout(resolve, TARGET_DURATION_MS),
        )
        clearInterval(interval)

        // Drain the in-flight requests
        await new Promise<void>((resolve) => setTimeout(resolve, 2_000))
      } finally {
        process.off('unhandledRejection', onRejection)
      }

      // Sanity: we actually pushed real load through the multi handle
      expect(completed).toBeGreaterThan(0)

      expect(
        recursive,
        `Got ${recursive} CURLM_RECURSIVE_API_CALL errors out of ${
          completed + recursive
        } finished requests. Sample rejection messages: ${recursiveFromRejection.slice(0, 3).join(' | ')}`,
      ).toBe(0)
    },
    TARGET_DURATION_MS + 30_000,
  )
})
