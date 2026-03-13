/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  describe,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  it,
  expect,
  inject,
} from 'vitest'
import { test } from 'vitest'

import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { Readable } from 'stream'

import { Curl, CurlMime, CurlCode, CurlPause, CurlEasyError } from '../../lib'
import { withCommonTestOptions } from '../helper/commonOptions'

// Extend global for gc() function (requires --expose-gc flag)
declare global {
  var gc: (() => void) | undefined
}

const image =
  'iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAMAAACahl6sAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MzdFRkY3QTlGQjc4MTFFMjk0NDBCMERBRkQzQUE3M0IiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzdFRkY3QUFGQjc4MTFFMjk0NDBCMERBRkQzQUE3M0IiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozN0VGRjdBN0ZCNzgxMUUyOTQ0MEIwREFGRDNBQTczQiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozN0VGRjdBOEZCNzgxMUUyOTQ0MEIwREFGRDNBQTczQiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Ps/V1jgAAAKyUExURZrWULHgef///oTOLP7//cHmlKLZXtDsrv3+/IXOLYPNKuLzzfn99fv9+InQNPD55vr99/z++u744ofPMP3++5TURorQNZvXUvv995XUR5zXVKDZW4/SPvb78IXOLP7+/PT67JDSQNPts4rQNvf88d/yyK7ec7njhqPaYLXhf+P0zuv33Nzxw/f88pPTRO/55LLgeoTNK4zROLThfej22IfPMdbuuPL66JHTQYjPMbvkiub107bigcTnmdjvu5bVS4bOLo3ROuj217Dfd/r99vL66cvqpYvQNsXnmsrpo83rqanca/j88o/SPafcaOHzy7/lkNXutvz++ZLTQ77lj6rdbczqp/P668LmlZXUSPn89L3kjeP0z9Hsr/j88/H66I3RO5jVTajcarThfonPM7jjha/fddrwvobOL5jWTrfiguz33ovQN+/54+v33azdb9TutMfonqXbZOr3257YV7zki7rjibzkjMnpoYjPMr/lkfP66tzxwqTaYs7rqo7SPMbondLtstjvvPb77/X77Z3XVd3xxabbZsjpn6bbZZvXU/H555HSQNHtsMrqpOf11uT00JPTRen22dXut9nwvdbvucDmku344bnjh+DyyeT00Z/YWc/srdvwwer22pLTQtrwv47RO6rdbO3438bonJXUScPnmJfVTM7rq8Dmk5zXVaLaX+f11dTutdnwvuHzzMPnl/X77un22LrjiLfig63ecpbVSq3ecb3ljp7YWLjihKvdb+b11PT77ZrWUdvwwNfvupnWUKzecN7yxozROaHZXK7edO344Kvdbqjcad7yx53YVqTaYeDzypnWT6fcZ9Ltsez33ZfVS8LmlsjpoPD55cnporHfeN3xxNfvubPge7bhgKncarDfdqHZXeX00sXom5DSP8vqpuX104PNKf///6+VmogAAAsnSURBVHja7J33W1PHGsdx2XUXlrZ0QVwUEBCQIkJABOlNkCoooEHBglhQUZSOJvbeu7HEEhNLNMaYdpOb3pOb3H7vOf/HRR8wZ87O7M5pu+/eZ78/sjtz5sOec+Z935l5Xyf2/0RODhAHiAPEAeIAcYA4QBQHCdF++k0Lw7R886l2ix2DpLb5MC/lk5FqpyBemukMoukaLzsEUU2ayJho4iSVvYFMeY3B6sspdgXiOZkharKn3YC4VfgwZuSz2c0uQNTa8YwFjdeq4YPMCWIoFHQb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'
const imageFilePath = path.resolve(
  __dirname,
  `${crypto.randomBytes(8).toString('hex')}.png`,
)
const buffer = Buffer.from(image, 'base64')
const size = buffer.length

let curl: Curl

// Parse libcurl version for conditional tests
const versionString = Curl.getVersion()
const versionMatch = versionString.match(/libcurl\/(\d+)\.(\d+)\.(\d+)/)
const libcurlVersion = versionMatch
  ? {
      major: parseInt(versionMatch[1]),
      minor: parseInt(versionMatch[2]),
      patch: parseInt(versionMatch[3]),
    }
  : { major: 0, minor: 0, patch: 0 }

// MIME sharing between handles is supported in 7.86.0+ (curl PR #9927)
const supportsMimeSharing =
  libcurlVersion.major > 7 ||
  (libcurlVersion.major === 7 && libcurlVersion.minor >= 86)

type MultipartResponse = Array<{
  name: string
  type: 'field' | 'file'
  byteSize: number
  value?: string
  filename?: string
  mimetype?: string
}>

function findPart(
  parts: MultipartResponse,
  name: string,
  type: 'field' | 'file',
) {
  return parts.find((p) => p.name === name && p.type === type)
}

describe.runIf(Curl.isVersionGreaterOrEqualThan(7, 56, 0))('CurlMime', () => {
  beforeEach(() => {
    curl = new Curl()
    withCommonTestOptions(curl)
    curl.setOpt('URL', `${inject('httpServerUrl')}/multipart`)
  })

  afterEach(() => {
    curl.close()
  })

  beforeAll(async () => {
    await fs.writeFile(imageFilePath, buffer)
  })

  afterAll(async () => {
    await fs.unlink(imageFilePath)
  })

  it('should upload text field correctly', async () => {
    const mime = new CurlMime(curl)

    // Test method chaining
    mime.addPart().setName('username').setData('john_doe')

    curl.setOpt('MIMEPOST', mime)

    const result = await new Promise<{ status: number; data: string }>(
      (resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }

          resolve({ status, data: data as string })
        })

        curl.on('error', (error: Error) =>
          reject('cause' in error ? error.cause : error),
        )

        curl.perform()
      },
    )

    const parts: MultipartResponse = JSON.parse(result.data)
    const field = findPart(parts, 'username', 'field')

    expect(field).toBeDefined()
    expect(field!.value).toBe('john_doe')
    expect(field!.byteSize).toBe(Buffer.byteLength('john_doe'))
  })

  it('should upload multiple text fields correctly', async () => {
    const mime = new CurlMime(curl)

    const part1 = mime.addPart()
    part1.setName('username')
    part1.setData('john_doe')

    const part2 = mime.addPart()
    part2.setName('email')
    part2.setData('john@example.com')

    curl.setOpt('MIMEPOST', mime)

    const result = await new Promise<{ status: number; data: string }>(
      (resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }

          resolve({ status, data: data as string })
        })

        curl.on('error', (error: Error) =>
          reject('cause' in error ? error.cause : error),
        )

        curl.perform()
      },
    )

    const parts: MultipartResponse = JSON.parse(result.data)
    const username = findPart(parts, 'username', 'field')
    const email = findPart(parts, 'email', 'field')

    expect(username).toBeDefined()
    expect(username!.value).toBe('john_doe')
    expect(email).toBeDefined()
    expect(email!.value).toBe('john@example.com')
  })

  it('should upload Buffer data correctly', async () => {
    const mime = new CurlMime(curl)
    const part = mime.addPart()

    part.setName('data')
    const testData = Buffer.from('binary data test')
    part.setData(testData)

    curl.setOpt('MIMEPOST', mime)

    const result = await new Promise<{ status: number; data: string }>(
      (resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }

          resolve({ status, data: data as string })
        })

        curl.on('error', (error: Error) =>
          reject('cause' in error ? error.cause : error),
        )

        curl.perform()
      },
    )

    const parts: MultipartResponse = JSON.parse(result.data)
    const field = findPart(parts, 'data', 'field')

    expect(field).toBeDefined()
    expect(field!.value).toBe('binary data test')
  })

  it('should upload file correctly', async () => {
    const mime = new CurlMime(curl)
    const part = mime.addPart()

    part.setName('file').setFileData(imageFilePath).setType('image/png')

    curl.setOpt('MIMEPOST', mime)

    const result = await new Promise<{ status: number; data: string }>(
      (resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }

          resolve({ status, data: data as string })
        })

        curl.on('error', (error: Error) =>
          reject('cause' in error ? error.cause : error),
        )

        curl.perform()
      },
    )

    const parts: MultipartResponse = JSON.parse(result.data)
    const file = findPart(parts, 'file', 'file')

    expect(file).toBeDefined()
    expect(file!.byteSize).toBe(size)
    expect(file!.mimetype).toBe('image/png')
  })

  it('should upload file with custom filename correctly', async () => {
    const customFilename = 'custom-avatar.png'
    const mime = new CurlMime(curl)
    const part = mime.addPart()

    part.setName('avatar')
    part.setFileData(imageFilePath)
    part.setType('image/png')
    part.setFileName(customFilename)

    curl.setOpt('MIMEPOST', mime)

    const result = await new Promise<{ status: number; data: string }>(
      (resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }

          resolve({ status, data: data as string })
        })

        curl.on('error', (error: Error) =>
          reject('cause' in error ? error.cause : error),
        )

        curl.perform()
      },
    )

    const parts: MultipartResponse = JSON.parse(result.data)
    const file = findPart(parts, 'avatar', 'file')

    expect(file).toBeDefined()
    expect(file!.filename).toBe(customFilename)
    expect(file!.byteSize).toBe(size)
    expect(file!.mimetype).toBe('image/png')
  })

  it('should handle mixed text fields and file uploads', async () => {
    const mime = new CurlMime(curl)

    const textPart = mime.addPart()
    textPart.setName('description')
    textPart.setData('User profile picture')

    const filePart = mime.addPart()
    filePart.setName('file').setFileData(imageFilePath).setType('image/png')

    curl.setOpt('MIMEPOST', mime)

    const result = await new Promise<{ status: number; data: string }>(
      (resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }

          resolve({ status, data: data as string })
        })

        curl.on('error', (error: Error) =>
          reject('cause' in error ? error.cause : error),
        )

        curl.perform()
      },
    )

    const parts: MultipartResponse = JSON.parse(result.data)
    const description = findPart(parts, 'description', 'field')
    const file = findPart(parts, 'file', 'file')

    expect(description).toBeDefined()
    expect(description!.value).toBe('User profile picture')
    expect(file).toBeDefined()
    expect(file!.byteSize).toBe(size)
  })

  it('should accept null to reset data', () => {
    const mime = new CurlMime(curl)
    const part = mime.addPart()

    part.setName('test')
    part.setData('initial')

    // Should not throw when resetting
    part.setData(null)
  })

  it('should accept null to reset name', () => {
    const mime = new CurlMime(curl)
    const part = mime.addPart()

    part.setName('test')

    // Should not throw when resetting
    part.setName(null)
  })

  it('should accept null to reset type', () => {
    const mime = new CurlMime(curl)
    const part = mime.addPart()

    part.setType('text/plain')

    // Should not throw when resetting
    part.setType(null)
  })

  it('should accept null to reset filename', () => {
    const mime = new CurlMime(curl)
    const part = mime.addPart()

    part.setFileName('test.txt')

    // Should not throw when resetting
    part.setFileName(null)
  })

  it('should accept null to reset filedata', () => {
    const mime = new CurlMime(curl)
    const part = mime.addPart()

    part.setFileData(imageFilePath)

    // Should not throw when resetting
    part.setFileData(null)
  })

  describe('Advanced Features', () => {
    it('should set encoder to base64', () => {
      const mime = new CurlMime(curl)

      // Test method chaining with encoder
      mime
        .addPart()
        .setName('encoded')
        .setData('test data')
        .setEncoder('base64')
    })

    it('should set encoder to quoted-printable', () => {
      const mime = new CurlMime(curl)

      // Test method chaining with encoder
      mime
        .addPart()
        .setName('encoded')
        .setData('test data')
        .setEncoder('quoted-printable')
    })

    it('should accept null to reset encoder', () => {
      const mime = new CurlMime(curl)
      const part = mime.addPart()

      part.setEncoder('base64')

      // Should not throw when resetting
      part.setEncoder(null)
    })

    it('should set custom headers', () => {
      const mime = new CurlMime(curl)

      // Test method chaining with headers
      mime
        .addPart()
        .setName('test')
        .setData('test data')
        .setHeaders([
          'X-Custom-Header: custom-value',
          'X-Another-Header: another-value',
        ])
    })

    it('should accept null to reset headers', () => {
      const mime = new CurlMime(curl)
      const part = mime.addPart()

      part.setHeaders(['X-Custom: value'])

      // Should not throw when resetting
      part.setHeaders(null)
    })

    it('should set nested subparts', () => {
      const mime = new CurlMime(curl)
      const subMime = new CurlMime(curl)

      // Test method chaining in nested parts
      subMime.addPart().setName('nested_field').setData('nested content')

      // Test method chaining with setSubparts
      mime.addPart().setName('multipart_section').setSubparts(subMime)
    })

    it('should accept null to reset subparts', () => {
      const mime = new CurlMime(curl)
      const subMime = new CurlMime(curl)

      const mainPart = mime.addPart()
      mainPart.setSubparts(subMime)

      // Should not throw when resetting
      mainPart.setSubparts(null)
    })
  })

  describe('Data Callbacks', () => {
    it('should handle basic read callback', async () => {
      const mime = new CurlMime(curl)

      const testData = 'Data from callback!'
      let offset = 0

      // Test method chaining with setDataCallback
      mime
        .addPart()
        .setName('callback_field')
        .setDataCallback(testData.length, {
          read: (size: number) => {
            if (offset >= testData.length) return null // EOF
            const chunk = testData.slice(offset, offset + size)
            offset += chunk.length
            return chunk
          },
        })

      curl.setOpt('MIMEPOST', mime)

      const result = await new Promise<{ status: number; data: string }>(
        (resolve, reject) => {
          curl.on('end', (status, data) => {
            if (status !== 200) {
              reject(new Error(`Invalid status code: ${status}`))
              return
            }

            resolve({ status, data: data as string })
          })

          curl.on('error', (error: Error) =>
            reject('cause' in error ? error.cause : error),
          )

          curl.perform()
        },
      )

      const parts: MultipartResponse = JSON.parse(result.data)
      const field = findPart(parts, 'callback_field', 'field')

      expect(field).toBeDefined()
      expect(field!.value).toBe(testData)
      expect(field!.byteSize).toBe(Buffer.byteLength(testData))
    })

    it('should handle errors being thrown from read callback', async () => {
      const mime = new CurlMime(curl)

      let originalError: Error | null = null

      const part = mime.addPart()
      part.setName('callback_field')
      part.setDataCallback(100, {
        read: () => {
          originalError = new Error('Test error')
          throw originalError
        },
      })

      curl.setOpt('MIMEPOST', mime)

      await new Promise<void>((resolve, reject) => {
        curl.on('end', () => {
          reject(new Error('end called - request was not aborted by request'))
        })

        curl.on('error', (error: CurlEasyError) => {
          try {
            expect(error).toBeInstanceOf(CurlEasyError)
            expect(error.cause).toBe(originalError)
            expect(error.code).toBe(CurlCode.CURLE_ABORTED_BY_CALLBACK)
            resolve()
          } catch (error) {
            reject(error)
          }
        })

        curl.perform()
      })
    })

    it('should handle read callback with Buffer', async () => {
      const mime = new CurlMime(curl)

      const testData = Buffer.from('Buffer data from callback!')
      let offset = 0

      // Test method chaining with Buffer callback
      mime
        .addPart()
        .setName('buffer_callback')
        .setDataCallback(testData.length, {
          read: (size: number) => {
            if (offset >= testData.length) return null // EOF
            const end = Math.min(offset + size, testData.length)
            const chunk = testData.slice(offset, end)
            offset = end
            return chunk
          },
        })

      curl.setOpt('MIMEPOST', mime)

      const result = await new Promise<{ status: number; data: string }>(
        (resolve, reject) => {
          curl.on('end', (status, data) => {
            if (status !== 200) {
              reject(new Error(`Invalid status code: ${status}`))
              return
            }

            resolve({ status, data: data as string })
          })

          curl.on('error', (error: Error) =>
            reject('cause' in error ? error.cause : error),
          )

          curl.perform()
        },
      )

      const parts: MultipartResponse = JSON.parse(result.data)
      const field = findPart(parts, 'buffer_callback', 'field')

      expect(field).toBeDefined()
      expect(field!.value).toBe(testData.toString())
      expect(field!.byteSize).toBe(testData.length)
    })

    it('should handle read callback with seek', async () => {
      const mime = new CurlMime(curl)

      const testData = 'Seekable data!'
      let offset = 0

      // Test method chaining with seek callback
      mime
        .addPart()
        .setName('seekable_field')
        .setDataCallback(testData.length, {
          read: (size: number) => {
            if (offset >= testData.length) return null // EOF
            const chunk = testData.slice(offset, offset + size)
            offset += chunk.length
            return chunk
          },
          seek: (newOffset: number, origin: number) => {
            if (origin === 0) {
              // SEEK_SET
              offset = newOffset
              return true
            }
            return false // Other origins not supported in this test
          },
        })

      curl.setOpt('MIMEPOST', mime)

      const result = await new Promise<{ status: number; data: string }>(
        (resolve, reject) => {
          curl.on('end', (status, data) => {
            if (status !== 200) {
              reject(new Error(`Invalid status code: ${status}`))
              return
            }

            resolve({ status, data: data as string })
          })

          curl.on('error', (error: Error) =>
            reject('cause' in error ? error.cause : error),
          )

          curl.perform()
        },
      )

      const parts: MultipartResponse = JSON.parse(result.data)
      const field = findPart(parts, 'seekable_field', 'field')

      expect(field).toBeDefined()
      expect(field!.value).toBe(testData)
    })

    it('should handle read callback with free', async () => {
      const mime = new CurlMime(curl)
      const testData = 'Data with cleanup!'
      let offset = 0
      let freeCalled = false

      // Test method chaining with free callback
      mime
        .addPart()
        .setName('free_callback_field')
        .setDataCallback(testData.length, {
          read: (size: number) => {
            if (offset >= testData.length) return null // EOF
            const chunk = testData.slice(offset, offset + size)
            offset += chunk.length
            return chunk
          },
          free: () => {
            freeCalled = true
          },
        })

      curl.setOpt('MIMEPOST', mime)

      const result = await new Promise<{ status: number; data: string }>(
        (resolve, reject) => {
          curl.on('end', (status, data) => {
            if (status !== 200) {
              reject(new Error(`Invalid status code: ${status}`))
              return
            }

            resolve({ status, data: data as string })
          })

          curl.on('error', (error: Error) =>
            reject('cause' in error ? error.cause : error),
          )

          curl.perform()
        },
      )

      const parts: MultipartResponse = JSON.parse(result.data)
      const field = findPart(parts, 'free_callback_field', 'field')

      expect(field).toBeDefined()
      expect(field!.value).toBe(testData)
      expect(freeCalled).toBe(false)

      // close handle
      curl.close()

      // verify that the free callback was called
      expect(freeCalled).toBe(true)
    })

    it('should validate callback arguments and throw errors', () => {
      const mime = new CurlMime(curl)
      const part = mime.addPart()

      // Test that TypeError is thrown for missing read callback
      expect(() => {
        part.setDataCallback(100, {} as any)
      }).toThrow(TypeError)

      // Test that TypeError is thrown for invalid size type
      expect(() => {
        part.setDataCallback('invalid' as any, {
          read: () => null,
        })
      }).toThrow(TypeError)

      // Test that TypeError is thrown for invalid argument count
      expect(() => {
        ;(part as any).setName()
      }).toThrow(TypeError)
    })

    it('should invoke free callback and survive GC during upload', async () => {
      const httpServerUrl = inject('httpServerUrl')
      const url = `${httpServerUrl}/multipart`

      let freeCallbackInvoked = false
      let readCallCount = 0
      const testData = 'data-that-survives-gc'

      // Create MIME and part with callbacks in a scope that can be GC'd
      const mime = new CurlMime(curl)
      let part: any = mime.addPart()
      part.setName('gc_test_field')

      part.setDataCallback(testData.length, {
        read: () => {
          readCallCount++
          if (readCallCount === 1) {
            return Buffer.from(testData)
          }
          return null // EOF
        },
        free: () => {
          freeCallbackInvoked = true
        },
      })

      // Nullify the part reference to make it eligible for GC
      // The self-reference should keep it alive during the upload
      part = null

      // Force garbage collection if available (requires --expose-gc)
      if (global.gc) {
        global.gc()
      }

      curl.setOpt('URL', url)
      curl.setOpt('MIMEPOST', mime)

      const result = await new Promise<{ status: number; data: string }>(
        (resolve, reject) => {
          curl.on('end', (status, data) => {
            if (status !== 200) {
              reject(new Error(`Invalid status code: ${status}`))
              return
            }
            resolve({ status, data: data as string })
          })
          curl.on('error', (error: Error) =>
            reject('cause' in error ? error.cause : error),
          )
          curl.perform()
        },
      )

      expect(result.status).toBe(200)

      const parts: MultipartResponse = JSON.parse(result.data)
      const field = findPart(parts, 'gc_test_field', 'field')

      expect(field).toBeDefined()
      expect(field!.value).toBe(testData)
      expect(field!.byteSize).toBe(Buffer.byteLength(testData))

      // Verify read callback was invoked
      expect(readCallCount).toBeGreaterThan(0)

      // The free callback is invoked when the MIME is cleaned up by libcurl
      // This happens when curl_mime_free() is called, which is done in ToFree destructor
      // We trigger this by resetting the handle, which clears toFree
      curl.reset()

      // Now the free callback should have been invoked
      expect(freeCallbackInvoked).toBe(true)
    })
  })

  describe('Data Stream', () => {
    it('should handle basic stream upload', async () => {
      const httpServerUrl = inject('httpServerUrl')
      const url = `${httpServerUrl}/multipart`

      const testData = 'Stream data content for testing'

      // Create a simple readable stream from a string
      const stream = Readable.from([testData], {
        objectMode: false,
      })

      const mime = new CurlMime(curl)
      mime
        .addPart()
        .setName('stream_field')
        .setDataStream(stream, () => {
          if (curl.handle.isPausedRecv) {
            curl.pause(curl.handle.pauseFlags & ~CurlPause.Recv)
          }
        })

      curl.setOpt('URL', url)
      curl.setOpt('MIMEPOST', mime)

      const result = await new Promise<{
        status: number
        data: string
      }>((resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }
          resolve({ status, data: data as string })
        })
        curl.on('error', (error: Error) =>
          reject('cause' in error ? error.cause : error),
        )
        curl.perform()
      })

      expect(result.status).toBe(200)

      const parts: MultipartResponse = JSON.parse(result.data)
      const field = findPart(parts, 'stream_field', 'field')

      expect(field).toBeDefined()
      expect(field!.value).toBe(testData)
    })

    it('should handle stream with known size', async () => {
      const httpServerUrl = inject('httpServerUrl')
      const url = `${httpServerUrl}/multipart`

      const testData = 'Stream data with known size'
      const stream = Readable.from([testData], {
        objectMode: false,
      })

      const mime = new CurlMime(curl)
      mime
        .addPart()
        .setName('sized_stream')
        .setDataStream(
          stream,
          () => {
            if (curl.handle.isPausedRecv) {
              curl.pause(curl.handle.pauseFlags & ~CurlPause.Recv)
            }
          },
          testData.length,
        )

      curl.setOpt('URL', url)
      curl.setOpt('MIMEPOST', mime)

      const result = await new Promise<{
        status: number
        data: string
      }>((resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }
          resolve({ status, data: data as string })
        })
        curl.on('error', (error: Error) =>
          reject('cause' in error ? error.cause : error),
        )
        curl.perform()
      })

      expect(result.status).toBe(200)

      const parts: MultipartResponse = JSON.parse(result.data)
      const field = findPart(parts, 'sized_stream', 'field')

      expect(field).toBeDefined()
      expect(field!.value).toBe(testData)
    })

    it('should handle Buffer stream', async () => {
      const httpServerUrl = inject('httpServerUrl')
      const url = `${httpServerUrl}/multipart`

      const testBuffer = Buffer.from('Binary stream data', 'utf-8')
      const stream = Readable.from([testBuffer], {
        objectMode: false,
      })

      const mime = new CurlMime(curl)
      mime
        .addPart()
        .setName('buffer_stream')
        .setDataStream(stream, () => {
          if (curl.handle.isPausedRecv) {
            curl.pause(curl.handle.pauseFlags & ~CurlPause.Recv)
          }
        })

      curl.setOpt('URL', url)
      curl.setOpt('MIMEPOST', mime)

      const result = await new Promise<{
        status: number
        data: string
      }>((resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }
          resolve({ status, data: data as string })
        })
        curl.on('error', (error: Error) =>
          reject('cause' in error ? error.cause : error),
        )
        curl.perform()
      })

      expect(result.status).toBe(200)

      const parts: MultipartResponse = JSON.parse(result.data)
      const field = findPart(parts, 'buffer_stream', 'field')

      expect(field).toBeDefined()
      expect(field!.value).toBe(testBuffer.toString())
    })

    it('should support method chaining with streams', async () => {
      const httpServerUrl = inject('httpServerUrl')
      const url = `${httpServerUrl}/multipart`

      const testData = 'Chained stream data'
      const stream = Readable.from([testData])

      const mime = new CurlMime(curl)

      // Test full method chaining
      mime
        .addPart()
        .setName('chained_stream')
        .setDataStream(stream, () => {
          if (curl.handle.isPausedRecv) {
            curl.pause(curl.handle.pauseFlags & ~CurlPause.Recv)
          }
        })
        .setType('text/plain')
        .setFileName('data.txt')

      curl.setOpt('URL', url)
      curl.setOpt('MIMEPOST', mime)

      const result = await new Promise<{
        status: number
        data: string
      }>((resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }
          resolve({ status, data: data as string })
        })
        curl.on('error', (error: Error) =>
          reject('cause' in error ? error.cause : error),
        )
        curl.perform()
      })

      expect(result.status).toBe(200)

      const parts: MultipartResponse = JSON.parse(result.data)
      const field = findPart(parts, 'chained_stream', 'file')

      expect(field).toBeDefined()
      expect(field!.byteSize).toBe(testData.length)
      expect(field!.filename).toBe('data.txt')
      expect(field!.mimetype).toBe('text/plain')
    })

    it('should handle multiple chunks', async () => {
      const httpServerUrl = inject('httpServerUrl')
      const url = `${httpServerUrl}/multipart`

      // Create a stream that emits data in multiple chunks
      const chunks = ['First chunk, ', 'Second chunk, ', 'Third chunk']
      const stream = Readable.from(chunks)

      const mime = new CurlMime(curl)
      mime
        .addPart()
        .setName('chunked_stream')
        .setDataStream(stream, () => {
          if (curl.handle.isPausedRecv) {
            curl.pause(curl.handle.pauseFlags & ~CurlPause.Recv)
          }
        })

      curl.setOpt('URL', url)
      curl.setOpt('MIMEPOST', mime)

      const result = await new Promise<{
        status: number
        data: string
      }>((resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }
          resolve({ status, data: data as string })
        })
        curl.on('error', (error: Error) =>
          reject('cause' in error ? error.cause : error),
        )
        curl.perform()
      })

      expect(result.status).toBe(200)

      const parts: MultipartResponse = JSON.parse(result.data)
      const field = findPart(parts, 'chunked_stream', 'field')

      expect(field).toBeDefined()
      expect(field!.value).toBe(chunks.join(''))
    })

    it('should handle empty stream', async () => {
      const httpServerUrl = inject('httpServerUrl')
      const url = `${httpServerUrl}/multipart`

      // Create an empty stream
      const stream = Readable.from([Buffer.alloc(0)])

      const mime = new CurlMime(curl)
      mime
        .addPart()
        .setName('empty_stream')
        .setDataStream(stream, () => {
          if (curl.handle.isPausedRecv) {
            curl.pause(curl.handle.pauseFlags & ~CurlPause.Recv)
          }
        })

      curl.setOpt('URL', url)
      curl.setOpt('MIMEPOST', mime)

      const result = await new Promise<{
        status: number
        data: string
      }>((resolve, reject) => {
        curl.on('end', (status, data) => {
          if (status !== 200) {
            reject(new Error(`Invalid status code: ${status}`))
            return
          }
          resolve({ status, data: data as string })
        })
        // todo actually assert for error:
        // Request failed: Operation was aborted by an application callback
        // Serialized Error: { code: 42 }
        curl.on('error', (error: Error) =>
          reject('cause' in error ? error.cause : error),
        )
        curl.perform()
      })

      expect(result.status).toBe(200)

      const parts: MultipartResponse = JSON.parse(result.data)
      const field = findPart(parts, 'empty_stream', 'field')

      expect(field).toBeDefined()
      expect(field!.value).toBe('')
    })
  })

  describe('Constructor', () => {
    it('should create CurlMime with Curl instance', () => {
      const mime = new CurlMime(curl)
      expect(mime).toBeDefined()
    })

    it('should allow adding multiple parts', () => {
      const mime = new CurlMime(curl)
      const part1 = mime.addPart()
      const part2 = mime.addPart()
      const part3 = mime.addPart()

      expect(part1).toBeDefined()
      expect(part2).toBeDefined()
      expect(part3).toBeDefined()
    })

    test.runIf(supportsMimeSharing)(
      'should allow MIME to be used with different handles (libcurl 7.86.0+)',
      async () => {
        // After curl PR #9927 (libcurl 7.86.0+), MIME structures can be shared
        // between different handles
        const httpServerUrl = inject('httpServerUrl')
        const url = `${httpServerUrl}/multipart`

        // Create MIME with first handle
        const curl1 = new Curl()
        const mime = new CurlMime(curl1)
        const part = mime.addPart()
        part.setName('field1')
        part.setData('value1')

        // Use MIME with second handle (should work on 7.86.0+)
        const curl2 = new Curl()
        curl2.setOpt('URL', url)
        curl2.setOpt('MIMEPOST', mime)

        withCommonTestOptions(curl2)

        const result = await new Promise<{
          status: number
          data: string
        }>((resolve, reject) => {
          curl2.on('end', (status, data) => {
            if (status !== 200) {
              reject(new Error(`Invalid status code: ${status}`))
              return
            }
            resolve({ status, data: data as string })
          })
          curl2.on('error', reject)
          curl2.perform()
        })

        expect(result.status).toBe(200)

        const parts: MultipartResponse = JSON.parse(result.data)
        const field = findPart(parts, 'field1', 'field')

        expect(field).toBeDefined()
        expect(field!.value).toBe('value1')

        curl1.close()
        curl2.close()
      },
    )

    test.runIf(!supportsMimeSharing)(
      'should throw error when MIME is used with different handles (libcurl < 7.86.0)',
      () => {
        // On older versions, MIME is tied to the handle it was created with
        // Attempting to use with different handle should fail
        const curl1 = new Curl()
        const curl2 = new Curl()
        const mime = new CurlMime(curl1)

        expect(() => {
          curl2.setOpt('MIMEPOST', mime)
        }).toThrow(/MIME.*different handle/i)

        curl1.close()
        curl2.close()
      },
    )

    test.runIf(supportsMimeSharing)(
      'should allow MIME reuse after original Easy handle is closed (libcurl 7.86.0+)',
      async () => {
        // Test what happens when we reuse a MIME after closing the Easy handle it was created with
        // On 7.86.0+, MIME structures can be shared, so this should work
        const httpServerUrl = inject('httpServerUrl')
        const url = `${httpServerUrl}/multipart`

        // Create MIME with first handle
        const curl1 = new Curl()
        const mime = new CurlMime(curl1)
        const part = mime.addPart()
        part.setName('reuse_field')
        part.setData('reuse_value')

        // Close the original handle
        curl1.close()

        // Now try to use the MIME with a different handle
        const curl2 = new Curl()
        curl2.setOpt('URL', url)
        curl2.setOpt('MIMEPOST', mime)

        withCommonTestOptions(curl2)

        const result = await new Promise<{
          status: number
          data: string
        }>((resolve, reject) => {
          curl2.on('end', (status, data) => {
            if (status !== 200) {
              reject(new Error(`Invalid status code: ${status}`))
              return
            }
            resolve({ status, data: data as string })
          })
          curl2.on('error', reject)
          curl2.perform()
        })

        expect(result.status).toBe(200)

        const parts: MultipartResponse = JSON.parse(result.data)
        const field = findPart(parts, 'reuse_field', 'field')

        expect(field).toBeDefined()
        expect(field!.value).toBe('reuse_value')

        curl2.close()
      },
    )
  })
})
