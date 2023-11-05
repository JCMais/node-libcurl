/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { Readable } from 'stream'
import crypto from 'crypto'

import { Curl, CurlCode, curly } from '../../lib'

import { app, closeServer, host, port, server } from '../helper/server'
import { allMethodsWithMultipleReqResTypes } from '../helper/commonRoutes'

interface GetReadableStreamForBufferOptions {
  filterDataToPush?(pushIteration: number, data: Buffer): Promise<Buffer>
}

const url = `http://${host}:${port}`

// @ts-ignore
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 1mb
const getRandomBuffer = (size: number = 1024 * 1024) => crypto.randomBytes(size)

const getReadableStreamForBuffer = (
  buffer: Buffer,
  {
    filterDataToPush = async (_, buf) => buf,
  }: GetReadableStreamForBufferOptions = {},
): Readable => {
  let bufferOffset = 0
  let pushIteration = 0
  let canRead = true
  const stream = new Readable({
    // this defaults to 16kb
    highWaterMark: 4 * 1024,
    async read(size) {
      if (!canRead) return

      canRead = false

      let wantsMore = true

      while (wantsMore) {
        try {
          const dataToPush = await filterDataToPush(
            pushIteration++,
            buffer.slice(
              bufferOffset,
              Math.min(buffer.length, bufferOffset + size),
            ),
          )
          wantsMore = this.push(dataToPush)

          bufferOffset += dataToPush.length

          if (bufferOffset >= buffer.length) {
            this.push(null)
            wantsMore = false
          }
        } catch (error) {
          stream.destroy(error as Error)
        }
      }

      canRead = true
    },
  })

  return stream
}

const getUploadOptions = (curlyStreamUpload: Readable) => {
  const options: Record<string, any> = {
    // we are doing a PUT upload
    upload: true,
    // as we are setting this, there is no need to specify the payload size
    httpHeader: ['Transfer-Encoding: chunked', 'Connection: close'],
    curlyStreamUpload,
  }

  if (Curl.isVersionGreaterOrEqualThan(7, 62)) {
    // This defaults to 64kb, setting to 16kb to cause more buffering
    options.uploadBufferSize = 16 * 1024
  }

  return options
}

const getDownloadOptions = () => ({
  curlyStreamResponse: true,
  // This defaults to undefined, which means using the Node.js default value of 16kb.
  // Here we are explicitly setting it to 4kb.
  curlyStreamResponseHighWaterMark: 4 * 1024,
})

let randomBuffer: Buffer

describe('streams', () => {
  before((done) => {
    randomBuffer = getRandomBuffer()
    server.listen(port, host, done)

    allMethodsWithMultipleReqResTypes(app, {
      putUploadBuffer: randomBuffer,
    })
  })

  after(() => {
    closeServer()
    // beatiful is not it?
    app._router.stack.pop()
  })

  describe('curly', () => {
    // libcurl versions older than this are not really reliable for streams usage.
    if (Curl.isVersionGreaterOrEqualThan(7, 69, 1)) {
      it('works for uploading and downloading', async () => {
        const curlyStreamUpload = getReadableStreamForBuffer(randomBuffer, {
          filterDataToPush: async (pushIteration, data) => {
            // we are waiting 1200 ms at the 5th iteration just to cause
            // some pauses in the READFUNCTION
            if (pushIteration === 5) {
              await sleep(1200)
            }

            return data
          },
        })

        const {
          statusCode,
          data: downloadStream,
          headers,
        } = await curly.put<Readable>(`${url}/all?type=put-upload`, {
          ...getUploadOptions(curlyStreamUpload),
          ...getDownloadOptions(),
          curlyProgressCallback() {
            return 0
          },
        })

        statusCode.should.be.equal(200)

        headers[headers.length - 1]['x-is-same-buffer'].should.be.equal('0')

        // TODO: add snapshot testing for headers

        // we cannot use async iterators here because we need to support Node.js v8

        return new Promise((resolve, reject) => {
          const acc: Buffer[] = []
          let iteration = 0

          // we are waiting 1200 ms at the 5th iteration just to cause
          // some pauses in the PUSHFUNCTION
          downloadStream.on('data', (data) => {
            acc.push(data)

            if (iteration++ === 2) {
              downloadStream.pause()
              setTimeout(() => downloadStream.resume(), 1200)
            }
          })

          downloadStream.on('close', () => {
            curlyStreamUpload.destroy()
          })

          downloadStream.on('end', () => {
            const finalBuffer = Buffer.concat(acc)

            const result = finalBuffer.compare(randomBuffer)
            result.should.be.equal(0)

            resolve()
          })

          downloadStream.on('error', (error) => {
            reject(error)
          })
        })
      })

      it('works with responses without body', async function () {
        this.timeout(3000)

        const { statusCode, data: downloadStream } = await curly.get<Readable>(
          `${url}/all?type=no-body`,
          {
            ...getDownloadOptions(),
            curlyProgressCallback() {
              return 0
            },
          },
        )

        statusCode.should.be.equal(200)

        // TODO: add snapshot testing for headers

        // we cannot use async iterators here because we need to support Node.js v8

        return new Promise((resolve, reject) => {
          const acc: Buffer[] = []

          downloadStream.on('data', (data) => {
            acc.push(data)
          })

          downloadStream.on('end', () => {
            const finalBuffer = Buffer.concat(acc)

            finalBuffer.byteLength.should.be.equal(0)

            resolve()
          })

          downloadStream.on('error', (error) => {
            reject(error)
          })
        })
      })

      it('works with HEAD requests', async function () {
        this.timeout(3000)

        const { statusCode, data: downloadStream } = await curly.head<Readable>(
          `${url}/all?type=method`,
          {
            ...getDownloadOptions(),
            curlyProgressCallback() {
              return 0
            },
          },
        )

        statusCode.should.be.equal(200)

        // TODO: add snapshot testing for headers

        // we cannot use async iterators here because we need to support Node.js v8

        return new Promise((resolve, reject) => {
          const acc: Buffer[] = []

          downloadStream.on('data', (data) => {
            acc.push(data)
          })

          downloadStream.on('end', () => {
            const finalBuffer = Buffer.concat(acc)

            finalBuffer.byteLength.should.be.equal(0)

            resolve()
          })

          downloadStream.on('error', (error) => {
            reject(error)
          })
        })
      })
    }

    it('returns an error when the upload stream throws an error', async () => {
      const errorMessage = 'custom error'
      const curlyStreamUpload = getReadableStreamForBuffer(randomBuffer, {
        async filterDataToPush(iteration, buffer) {
          if (iteration === 5) {
            throw new Error(errorMessage)
          }

          return buffer
        },
      })

      await curly
        .put(`${url}/all?type=put-upload`, getUploadOptions(curlyStreamUpload))
        // @ts-ignore
        .should.be.rejectedWith(Error, {
          message: errorMessage,
          isCurlError: true,
          code: CurlCode.CURLE_ABORTED_BY_CALLBACK,
        })
    })

    it('returns an error when the upload stream is destroyed unexpectedly', async () => {
      const curlyStreamUpload = getReadableStreamForBuffer(randomBuffer, {
        async filterDataToPush(iteration, buffer) {
          if (iteration === 5) {
            curlyStreamUpload.destroy()
          }

          return buffer
        },
      })

      await curly
        .put(`${url}/all?type=put-upload`, getUploadOptions(curlyStreamUpload))
        // @ts-ignore
        .should.be.rejectedWith(Error, {
          message: 'Curl upload stream was unexpectedly destroyed',
          isCurlError: true,
          code: CurlCode.CURLE_ABORTED_BY_CALLBACK,
        })
    })

    it('returns an error when the upload stream is destroyed unexpectedly with a specific error', async () => {
      const errorMessage = 'Custom error message'
      const curlyStreamUpload = getReadableStreamForBuffer(randomBuffer, {
        async filterDataToPush(iteration, buffer) {
          if (iteration === 5) {
            curlyStreamUpload.destroy(new Error(errorMessage))
          }

          return buffer
        },
      })

      await curly
        .put(`${url}/all?type=put-upload`, getUploadOptions(curlyStreamUpload))
        // @ts-ignore
        .should.be.rejectedWith(Error, {
          message: errorMessage,
          isCurlError: true,
          code: CurlCode.CURLE_ABORTED_BY_CALLBACK,
        })
    })

    it('emits an error when the download stream is destroyed unexpectedly', async () => {
      const { statusCode, data: downloadStream } = await curly.get<Readable>(
        `${url}/all?type=json`,
        {
          ...getDownloadOptions(),
        },
      )

      statusCode.should.be.equal(200)

      // we cannot use async iterators here because we need to support Node.js v8

      return new Promise((resolve, reject) => {
        downloadStream.on('data', () => {
          downloadStream.destroy()
        })

        downloadStream.on('end', () => {
          reject(
            new Error('Stream ended without any errors - This is invalid!'),
          )
        })

        downloadStream.on('error', (error) => {
          error.should.match({
            message: 'Curl response stream was unexpectedly destroyed',
            isCurlError: true,
            code: CurlCode.CURLE_ABORTED_BY_CALLBACK,
          })
          resolve()
        })
      })
    })

    it('emits an error when the download stream is destroyed unexpectedly with a specific error', async () => {
      const errorMessage = 'Custom error message'

      const { statusCode, data: downloadStream } = await curly.get<Readable>(
        `${url}/all?type=json`,
        {
          ...getDownloadOptions(),
          // this is just to also test the branching for when this is not set
          curlyStreamResponseHighWaterMark: undefined,
        },
      )

      statusCode.should.be.equal(200)

      // we cannot use async iterators here because we need to support Node.js v8

      return new Promise((resolve, reject) => {
        downloadStream.on('data', () => {
          downloadStream.destroy(new Error(errorMessage))
        })

        downloadStream.on('end', () => {
          reject(
            new Error('Stream ended without any errors - This is invalid!'),
          )
        })

        downloadStream.on('error', (error) => {
          error.should.match({
            message: errorMessage,
            isCurlError: true,
            code: CurlCode.CURLE_ABORTED_BY_CALLBACK,
          })
          resolve()
        })
      })
    })
  })

  describe('Curl', () => {
    it('throws an error when passing something that is not a stream to setUploadStream', async () => {
      const curl = new Curl()

      const values = [123, [], { read: true }]

      for (const val of values) {
        ;(() => {
          // @ts-expect-error
          curl.setUploadStream(val)
        }).should.throw(Error, {
          message: /^The passed value to setUploadStream does not/,
        })
      }
    })

    it('does nothing when passing the same stream to setUploadStream', async () => {
      const streamUpload = getReadableStreamForBuffer(randomBuffer)

      const curl = new Curl()

      curl.setUploadStream(streamUpload)
      curl.setUploadStream(streamUpload)

      // the way we are testing this is by making sure we are
      // not adding more listeners to the stream end evt
      streamUpload.listenerCount('end').should.be.equal(1)
    })

    it('resets stream back to null after calling setUploadStream(null)', async () => {
      const streamUpload = getReadableStreamForBuffer(randomBuffer)

      const curl = new Curl()

      curl.setUploadStream(streamUpload)
      streamUpload.listenerCount('end').should.be.equal(1)

      curl.setUploadStream(null)
      streamUpload.listenerCount('end').should.be.equal(0)
    })
  })
})
