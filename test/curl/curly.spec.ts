/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, beforeAll, afterAll, it, expect } from 'vitest'

import { curly } from '../../lib'
import { createServer } from '../helper/server'
import { allMethodsWithMultipleReqResTypes } from '../helper/commonRoutes'

let serverInstance: ReturnType<typeof createServer>

describe('curly', () => {
  beforeAll(async () => {
    serverInstance = createServer()
    allMethodsWithMultipleReqResTypes(serverInstance.app)
    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()
    // beautiful is not it?
    serverInstance.app._router.stack.pop()
  })

  describe('common usage', () => {
    it('works for multiple methods', async () => {
      const urlMethod = `${serverInstance.url}/all?type=method`

      const emptyData = {
        // this is necessary to do an empty post request with libcurl
        // otherwise the default READFUNCTION will be used, which reads data from stdin
        postFields: '',
      }

      const methods = [
        ['post', emptyData],
        ['get'],
        ['patch'],
        ['head'],
        ['put'],
        ['delete'],
      ] as const

      for (const [method, options] of methods) {
        const { statusCode, headers } = await curly[method](urlMethod, {
          ...options,
          curlyProgressCallback() {
            return 0
          },
        })

        expect(statusCode).toBe(200)
        expect(headers[0]['x-req-method']).toBe(method)
      }
    })

    it('can set base url', async () => {
      const curlyBaseUrl = serverInstance.url

      const { statusCode } = await curly.get('/all', {
        curlyBaseUrl,
      })

      expect(statusCode).toBe(200)
    })

    it('lower cases headers when setting curlyLowerCaseHeaders to true', async () => {
      const { statusCode, headers } = await curly.get(
        `${serverInstance.url}/all`,
        {
          curlyLowerCaseHeaders: true,
        },
      )

      expect(statusCode).toBe(200)

      for (const headerReq of headers) {
        for (const key of Object.keys(headerReq)) {
          expect(key).toBe(key.toLowerCase())
        }
      }
    })

    it('can set global defaults in a curly object with .create()', async () => {
      const curlyObj = curly.create({
        postFields: 'field=value',
      })

      const { statusCode, data } = await curlyObj.post<Record<string, any>>(
        `${serverInstance.url}/all?type=json-body`,
      )

      expect(statusCode).toBe(200)
      expect(data).toEqual({
        field: 'value',
      })
    })

    it('default content-type parsers work - text', async () => {
      const { statusCode, data } = await curly.get<string>(
        `${serverInstance.url}/all`,
      )
      expect(statusCode).toBe(200)

      expect(typeof data).toBe('string')
      expect(data).toBe('Hello World!')
    })

    it('default content-type parsers work - json', async () => {
      const { statusCode, data } = await curly.get<Record<string, any>>(
        `${serverInstance.url}/all?type=json`,
      )

      expect(statusCode).toBe(200)

      expect(typeof data).toBe('object')
      expect(data).toHaveProperty('test', true)
    })

    it('default content-type parsers work - *', async () => {
      const { statusCode, data } = await curly.get<Buffer>(
        `${serverInstance.url}/all?type=something`,
      )

      expect(statusCode).toBe(200)

      expect(data).toBeInstanceOf(Buffer)
      expect(data.toString('utf-8')).toBe('binary data would go here :)')
    })

    it('overrides content-type parser with the curlyResponseBodyParsers option - json', async () => {
      const options = {
        curlyResponseBodyParsers: {
          'application/json': (data: Buffer, header: any[]) => {
            expect(data).toBeInstanceOf(Buffer)
            expect(Array.isArray(header)).toBe(true)

            return 'json'
          },
        },
      }

      const req1 = await curly.get<string>(
        `${serverInstance.url}/all?type=json`,
        options,
      )
      expect(req1.statusCode).toBe(200)
      expect(req1.data).toBe('json')

      // make sure the others default parsers are still working

      const req2 = await curly.get<string>(
        `${serverInstance.url}/all?type=something`,
        options,
      )
      expect(req2.statusCode).toBe(200)
      expect(req2.data).toBeInstanceOf(Buffer)
    })

    it('overrides all content-type parsers with the curlyResponseBodyParser option - json', async () => {
      const options = {
        curlyResponseBodyParser: (data: Buffer, header: any[]) => {
          expect(data).toBeInstanceOf(Buffer)
          expect(Array.isArray(header)).toBe(true)

          return 'data'
        },
      }

      const req1 = await curly.get<string>(
        `${serverInstance.url}/all?type=json`,
        options,
      )
      expect(req1.statusCode).toBe(200)
      expect(req1.data).toBe('data')

      const req2 = await curly.get<string>(
        `${serverInstance.url}/all?type=something`,
        options,
      )
      expect(req2.statusCode).toBe(200)
      expect(req1.data).toBe('data')
    })

    it('can set curlyResponseBodyParser option to false', async () => {
      const { statusCode, data } = await curly.get<string>(
        `${serverInstance.url}/all?type=json`,
        {
          curlyResponseBodyParser: false,
        },
      )

      expect(statusCode).toBe(200)
      expect(data).toBeInstanceOf(Buffer)
    })
  })

  describe('Curl internal handling', () => {
    it('Set-Cookie header is an array of strings', async () => {
      const { statusCode, headers } = await curly.get(
        `${serverInstance.url}/all?type=set-cookie`,
      )

      expect(statusCode).toBe(200)
      expect(headers).toHaveLength(1)
      expect(headers[0]).toHaveProperty('Set-Cookie')
      expect(headers[0]['Set-Cookie']).toEqual([
        'test-a=abc; Path=/; HttpOnly',
        'test-b=def; Path=/',
      ])
    })

    it('headers is an array where each element contains the headers of each redirect', async () => {
      const { statusCode, headers } = await curly.get(
        `${serverInstance.url}/all?type=redirect-c`,
        {
          followLocation: true,
        },
      )

      expect(statusCode).toBe(200)
      // there are 3 redirects and the final response, so 4 HeaderInfo objects
      expect(headers).toHaveLength(4)

      for (const [idx, header] of headers.entries()) {
        expect(header.result!.code).toBe(idx === headers.length - 1 ? 200 : 301)
      }
    })
  })

  describe('weird servers', () => {
    it('works with response without a content-type', async () => {
      const { statusCode, data } = await curly.get(
        `${serverInstance.url}/all?type=no-content-type`,
      )

      expect(statusCode).toBe(200)
      expect(data).toBeInstanceOf(Buffer)
    })
  })

  describe('error handling', () => {
    it('throw error on invalid curlyProgressCallback', () => {
      const options = {
        curlyProgressCallback: 'I should have been a function :)',
      }

      expect(() =>
        curly
          // @ts-expect-error not assignable!
          .get<string>(`${serverInstance.url}/all?type=json`, options),
      ).toThrow(/^curlyProgressCallback must be a function/)
    })

    it('throw error on invalid response body parser in option curlyResponseBodyParsers', async () => {
      const options = {
        curlyResponseBodyParsers: {
          'application/json': 'abc',
        },
      }

      await expect(
        curly
          // @ts-expect-error
          .get<string>(`${serverInstance.url}/all?type=json`, options),
      ).rejects.toThrow(/^Response body parser for/)
    })

    it('throw error on invalid response body parser in option curlyResponseBodyParser', async () => {
      const options = {
        curlyResponseBodyParser: 'abc',
      }

      await expect(
        curly
          // @ts-expect-error
          .get<string>(`${serverInstance.url}/all?type=json`, options),
      ).rejects.toThrow(/^`curlyResponseBodyParser` passed to curly must be/)
    })

    it('error thrown inside response body parser bubble up to the original call', async () => {
      const options = {
        curlyResponseBodyParser: () => {
          throw new Error('error here')
        },
      }

      await expect(
        curly.get<string>(`${serverInstance.url}/all?type=json`, options),
      ).rejects.toThrow(/^error here/)
    })

    it('default response body parser for application/json throws an error when it receives invalid json', async () => {
      await expect(
        curly.get<string>(`${serverInstance.url}/all?type=json-invalid`),
      ).rejects.toThrow(/^curly failed to parse/)
    })

    it('throws an error when the internal Curl instance emits an error', async () => {
      await expect(
        curly.get<string>(`${serverInstance.url}/abc`, {
          failOnError: true,
        }),
      ).rejects.toThrow(/^HTTP response code said error/)
    })
  })
})
