/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeAll, afterAll, it, expect, inject, vi } from 'vitest'

import { createServer } from '../helper/server'
import {
  Curl,
  CurlCode,
  CurlHsts,
  CurlHstsCallback,
  CurlShareLock,
  CurlShareOption,
  Easy,
  Share,
} from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

let serverInstance: ReturnType<typeof createServer>

describe('native layer regressions', () => {
  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.get('/', (_req, res) => {
      res.send('Hello World!')
    })
    serverInstance.app.put('/upload', (_req, res) => {
      res.send('ok')
    })
    serverInstance.app.get('/echo-header', (req, res) => {
      res.send(String(req.headers['x-test-header']))
    })
    serverInstance.app.post('/echo-body', (req, res) => {
      // the urlencoded middleware already parsed the body - reconstruct it
      res.send(
        Object.entries(req.body as Record<string, string>)
          .map(([key, value]) => `${key}=${value}`)
          .join('&'),
      )
    })
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
  })

  describe('READFUNCTION buffer initialization', () => {
    it('passes a zero-filled buffer to the callback', async () => {
      const curl = new Curl()
      withCommonTestOptions(curl)
      curl.setOpt('URL', `${serverInstance.url}/upload`)
      curl.setOpt('UPLOAD', true)
      curl.setOpt('HTTPHEADER', ['Transfer-Encoding: chunked'])

      let bufferWasChecked = false
      let bufferHadStaleData = false
      curl.setOpt('READFUNCTION', (buffer) => {
        if (!bufferWasChecked) {
          bufferWasChecked = true
          // the buffer must not leak previous heap contents into JS land
          bufferHadStaleData = buffer.some((byte) => byte !== 0)
        }
        return 0 // empty upload
      })

      try {
        await new Promise<void>((resolve, reject) => {
          curl.on('end', () => resolve())
          curl.on('error', reject)
          curl.perform()
        })

        expect(bufferWasChecked).toBe(true)
        expect(bufferHadStaleData).toBe(false)
      } finally {
        curl.close()
      }
    })
  })

  describe('per-transfer state on reused handles', () => {
    it('aborting via the progress callback does not poison the next transfer', () => {
      const easy = new Easy()
      withCommonTestOptions(easy)
      // easy.perform() is synchronous and blocks the event loop, so the
      // server handling the request must live in another process - the global
      // setup server runs in the vitest main process, use that one
      easy.setOpt('URL', inject('httpServerUrl'))
      easy.setOpt('WRITEFUNCTION', (_buffer, size, nmemb) => size * nmemb)
      easy.setOpt('NOPROGRESS', false)

      try {
        easy.setOpt('XFERINFOFUNCTION', () => 1) // non-zero aborts the transfer
        expect(easy.perform()).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)

        // reusing the same handle (without reset()) is the standard libcurl
        // pattern - the new progress callback must be invoked again
        let secondTransferProgressCalls = 0
        easy.setOpt('XFERINFOFUNCTION', () => {
          secondTransferProgressCalls += 1
          return 0
        })

        expect(easy.perform()).toBe(CurlCode.CURLE_OK)
        expect(secondTransferProgressCalls).toBeGreaterThan(0)
      } finally {
        easy.close()
      }
    })
  })

  describe('share handle lifetime', () => {
    it('closing a share that is still used by an easy handle throws instead of leaking', () => {
      const share = new Share()
      share.setOpt(CurlShareOption.SHARE, CurlShareLock.DataCookie)

      const easy = new Easy()
      withCommonTestOptions(easy)
      easy.setOpt('SHARE', share)

      try {
        expect(() => share.close()).toThrow(/in use/i)

        // after unsetting the share it can be closed normally
        easy.setOpt('SHARE', null)
        expect(() => share.close()).not.toThrow()
      } finally {
        easy.close()
      }
    })

    it('closing the easy handle releases the share', () => {
      const share = new Share()
      share.setOpt(CurlShareOption.SHARE, CurlShareLock.DataCookie)

      const easy = new Easy()
      withCommonTestOptions(easy)
      easy.setOpt('SHARE', share)
      easy.close()

      expect(() => share.close()).not.toThrow()
    })
  })

  it('collects an Easy with an HSTS write callback', async () => {
    let writes = 0
    let collected = false
    const registry = new FinalizationRegistry(() => {
      collected = true
    })
    const performAndDrop = () => {
      const easy = new Easy()
      easy.setOpt('URL', inject('httpServerUrl'))
      easy.setOpt('WRITEFUNCTION', (data) => data.length)
      easy.setOpt('HSTS_CTRL', CurlHsts.Enable)
      easy.setOpt('HSTSREADFUNCTION', () => [
        { host: 'example.test', includeSubDomains: false },
      ])
      easy.setOpt('HSTSWRITEFUNCTION', () => {
        writes++
        return CurlHstsCallback.Ok
      })
      expect(easy.perform()).toBe(CurlCode.CURLE_OK)
      registry.register(easy, undefined)
    }

    performAndDrop()

    await vi.waitFor(() => {
      global.gc?.()
      expect(collected).toBe(true)
    })
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(writes).toBe(0)
  })

  describe('option data replacement on reused handles', () => {
    const performRequest = (curl: Curl) =>
      new Promise<string>((resolve, reject) => {
        curl.once('end', (_status, data) => resolve(data as string))
        curl.once('error', reject)
        curl.perform()
      })

    it('uses the latest HTTPHEADER value after many replacements', async () => {
      const curl = new Curl()
      withCommonTestOptions(curl)
      curl.setOpt('URL', `${serverInstance.url}/echo-header`)

      try {
        // the previous lists are freed as they are replaced - if that freeing
        // were premature, libcurl would read freed memory here
        for (let i = 0; i <= 500; i += 1) {
          curl.setOpt('HTTPHEADER', [`x-test-header: value-${i}`])
        }

        const data = await performRequest(curl)
        expect(data).toBe('value-500')
      } finally {
        curl.close()
      }
    })

    it('uses the latest POSTFIELDS value after many replacements', async () => {
      const curl = new Curl()
      withCommonTestOptions(curl)
      curl.setOpt('URL', `${serverInstance.url}/echo-body`)

      try {
        for (let i = 0; i <= 500; i += 1) {
          curl.setOpt('POSTFIELDS', `field=value-${i}`)
        }

        const data = await performRequest(curl)
        expect(data).toBe('field=value-500')
      } finally {
        curl.close()
      }
    })

    it('does not free data still used by a duplicated handle', async () => {
      const curl = new Curl()
      withCommonTestOptions(curl)
      curl.setOpt('URL', `${serverInstance.url}/echo-body`)
      curl.setOpt('POSTFIELDS', 'origin=first')

      const duplicated = curl.dupHandle(false)

      try {
        // the storage is shared with the duplicated handle now - replacing
        // the option must NOT free the previous buffer, the duplicated
        // handle still points to it
        curl.setOpt('POSTFIELDS', 'origin=replaced')

        const dataFromDuplicate = await performRequest(duplicated)
        expect(dataFromDuplicate).toBe('origin=first')

        const dataFromOriginal = await performRequest(curl)
        expect(dataFromOriginal).toBe('origin=replaced')
      } finally {
        duplicated.close()
        curl.close()
      }
    })
  })
})
