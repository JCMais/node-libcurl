/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeAll, afterAll, it, expect } from 'vitest'

import { createServer } from '../helper/server'
import {
  Curl,
  CurlAltSvc,
  CurlCode,
  CurlFtpAuth,
  CurlFtpSsl,
  CurlMimeOpt,
  CurlWsOptions,
  Easy,
  Multi,
} from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

let serverInstance: ReturnType<typeof createServer>

describe('options from newer libcurl versions', () => {
  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.get('/', (_req, res) => {
      res.send('Hello World!')
    })
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
  })

  describe.runIf(Curl.isVersionGreaterOrEqualThan(7, 86, 0))(
    'easy options',
    () => {
      it('accepts the string options', () => {
        const easy = new Easy()
        try {
          expect(easy.setOpt('ABSTRACT_UNIX_SOCKET', '/tmp/test.sock')).toBe(
            CurlCode.CURLE_OK,
          )
          expect(easy.setOpt('ALTSVC', '/tmp/altsvc-cache.txt')).toBe(
            CurlCode.CURLE_OK,
          )
          expect(
            easy.setOpt(
              'SSH_HOST_PUBLIC_KEY_SHA256',
              'NDVkMTQxMGQ4NTk3ZmY0YjVjMjI5OTc4NWMyY2RmMjE=',
            ),
          ).toBe(CurlCode.CURLE_OK)
        } finally {
          easy.close()
        }
      })

      it('accepts the integer options', () => {
        const easy = new Easy()
        try {
          expect(
            easy.setOpt('ALTSVC_CTRL', CurlAltSvc.H1 | CurlAltSvc.H2),
          ).toBe(CurlCode.CURLE_OK)
          expect(easy.setOpt('FTPSSLAUTH', CurlFtpAuth.Tls)).toBe(
            CurlCode.CURLE_OK,
          )
          expect(easy.setOpt('FTP_SSL_CCC', CurlFtpSsl.CccPassive)).toBe(
            CurlCode.CURLE_OK,
          )
          expect(easy.setOpt('MIME_OPTIONS', CurlMimeOpt.FormEscape)).toBe(
            CurlCode.CURLE_OK,
          )
          expect(easy.setOpt('TFTP_NO_OPTIONS', true)).toBe(CurlCode.CURLE_OK)
          expect(easy.setOpt('WS_OPTIONS', CurlWsOptions.RawMode)).toBe(
            CurlCode.CURLE_OK,
          )
        } finally {
          easy.close()
        }
      })

      it('accepts PROXY_ISSUERCERT_BLOB', () => {
        const easy = new Easy()
        try {
          expect(
            easy.setOpt('PROXY_ISSUERCERT_BLOB', Buffer.from('not-a-cert')),
          ).toBe(CurlCode.CURLE_OK)
          expect(easy.setOpt('PROXY_ISSUERCERT_BLOB', null)).toBe(
            CurlCode.CURLE_OK,
          )
        } finally {
          easy.close()
        }
      })

      it('accepts INTERLEAVEFUNCTION', () => {
        const easy = new Easy()
        try {
          expect(
            easy.setOpt('INTERLEAVEFUNCTION', (_data, size, nmemb) => {
              return size * nmemb
            }),
          ).toBe(CurlCode.CURLE_OK)
          expect(easy.setOpt('INTERLEAVEFUNCTION', null)).toBe(
            CurlCode.CURLE_OK,
          )
        } finally {
          easy.close()
        }
      })

      it('accepts SSH_HOSTKEYFUNCTION', () => {
        const easy = new Easy()
        try {
          expect(easy.setOpt('SSH_HOSTKEYFUNCTION', () => 0)).toBe(
            CurlCode.CURLE_OK,
          )
          expect(easy.setOpt('SSH_HOSTKEYFUNCTION', null)).toBe(
            CurlCode.CURLE_OK,
          )
        } finally {
          easy.close()
        }
      })

      it('rejects the internally used _DATA options with a descriptive error', () => {
        const easy = new Easy()
        try {
          for (const option of [
            'HSTSREADDATA',
            'HSTSWRITEDATA',
            'PREREQDATA',
            'SSH_HOSTKEYDATA',
          ]) {
            expect(() => easy.setOpt(option as never, 1 as never)).toThrow(
              /Unsupported option/,
            )
          }
        } finally {
          easy.close()
        }
      })
    },
  )

  describe.runIf(Curl.isVersionGreaterOrEqualThan(8, 20, 0))(
    'libcurl 8.20 additions',
    () => {
      it('exposes CURLINFO_SIZE_DELIVERED', async () => {
        const curl = new Curl()
        withCommonTestOptions(curl)
        curl.setOpt('URL', serverInstance.url)

        try {
          const sizeDelivered = await new Promise<number>((resolve, reject) => {
            curl.on('end', () => {
              resolve(curl.getInfo('SIZE_DELIVERED') as number)
            })
            curl.on('error', reject)
            curl.perform()
          })

          expect(sizeDelivered).toBeGreaterThan(0)
        } finally {
          curl.close()
        }
      })

      it('accepts the new multi options', () => {
        const multi = new Multi()
        try {
          expect(multi.setOpt('QUICK_EXIT', 1)).toBe(0)
          expect(multi.setOpt('RESOLVE_THREADS_MAX', 4)).toBe(0)
        } finally {
          multi.close()
        }
      })
    },
  )
})
