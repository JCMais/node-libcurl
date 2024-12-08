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
} from 'vitest'

import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

import express from 'express'

import { createServer, ServerInstance } from '../helper/server'
import { Curl } from '../../lib'

import http from 'http'

const fileSize = 10 * 1024 // 10K
const fileName = path.resolve(__dirname, 'upload.test')

let fileHash = ''
let uploadLocation = ''
let curl: Curl
let serverInstance!: ServerInstance<http.Server>

const hashOfFile = (
  file: string,
  cb: (error: Error | null, hash: string) => void,
) => {
  const fd = fs.createReadStream(file)
  const hash = crypto.createHash('sha1')

  hash.setEncoding('hex')

  fd.on('end', () => {
    hash.end()

    cb(null, hash.read())
  })

  fd.on('error', cb)

  fd.pipe(hash)
}

describe('Put Upload', () => {
  beforeEach(async () => {
    return new Promise<void>((resolve, reject) => {
      curl = new Curl()
      curl.setOpt(
        Curl.option.URL,
        serverInstance.path('/upload/upload-result.test'),
      )
      curl.setOpt(Curl.option.HTTPHEADER, [
        'Content-Type: application/node-libcurl.raw',
      ])

      // write random bytes to a file, this will be our test file.
      fs.writeFileSync(fileName, crypto.randomBytes(fileSize))

      // get a hash of given file so we can assert later
      // that the file sent is equals to the one we created.
      hashOfFile(fileName, (error, hash) => {
        if (error) {
          reject(error)
          return
        }
        fileHash = hash
        resolve()
      })
    })
  })

  afterEach(() => {
    curl.close()

    fs.unlinkSync(fileName)
    if (fs.existsSync(uploadLocation)) {
      fs.unlinkSync(uploadLocation)
    }
  })

  beforeAll(async () => {
    serverInstance = createServer()
    serverInstance.app.put('/upload/:filename', (req, res) => {
      uploadLocation = path.resolve(__dirname, req.params['filename'])

      const fd = fs.openSync(uploadLocation, 'w+')

      fs.writeSync(fd, req.body, 0, req.body.length, 0)
      fs.closeSync(fd)
      hashOfFile(uploadLocation, (error, hash) => {
        if (error) {
          res.status(500).send(error.message)
        } else {
          res.send(hash)
        }
      })
    })

    serverInstance.app.use(
      (
        error: any,
        _req: express.Request,
        res: express.Response<string>,
        _next: express.NextFunction,
      ) => {
        if (error.type !== 'request.aborted') {
          res.status(500).send(error.message)
        } else {
          res.status(error.status).send('Aborted')
        }
      },
    )

    await serverInstance.listen()
  })

  afterAll(async () => {
    await serverInstance.close()

    serverInstance.app._router.stack.pop()
    serverInstance.app._router.stack.pop()
  })

  it('should upload data correctly using put', async () => {
    const fd = fs.openSync(fileName, 'r+')

    curl.setOpt('UPLOAD', 1)
    curl.setOpt('READDATA', fd)

    const result = await new Promise<{ statusCode: number; body: string }>(
      (resolve, reject) => {
        curl.on('end', (statusCode, body) => {
          fs.closeSync(fd)
          resolve({ statusCode, body: body as string })
        })

        curl.on('error', (error) => {
          fs.closeSync(fd)
          reject(error)
        })

        curl.perform()
      },
    )

    expect(result.statusCode).toBe(200)
    expect(result.body).toBe(fileHash)
  })

  it('should upload data correctly using READFUNCTION callback option', async () => {
    const CURL_READFUNC_PAUSE = 0x10000001
    const CURL_READFUNC_ABORT = 0x10000000
    const CURLPAUSE_CONT = 0

    const stream = fs.createReadStream(fileName)

    const cancelRequested = false
    let isPaused = false
    let isEnded = false

    curl.setOpt(Curl.option.UPLOAD, true)

    const result = await new Promise<{ statusCode: number; body: string }>(
      (resolve, reject) => {
        curl.on('end', (statusCode, body) => {
          resolve({ statusCode, body: body as string })
        })

        curl.on('error', reject)

        stream.on('error', reject)

        stream.on('readable', () => {
          // resume curl to let it ask for available data
          if (isPaused) {
            isPaused = false
            curl.pause(CURLPAUSE_CONT)
          }
        })

        stream.on('end', () => {
          isEnded = true

          // resume curl to let it see there is no more data, just in case it was paused
          if (isPaused) {
            isPaused = false
            curl.pause(CURLPAUSE_CONT)
          }
        })

        curl.setOpt('READFUNCTION', (targetBuffer) => {
          if (cancelRequested) {
            return CURL_READFUNC_ABORT
          }

          // stream returns null if it has < requestedBytes available
          const readBuffer = stream.read(100) || stream.read()

          if (readBuffer === null) {
            if (isEnded) {
              return 0
            }

            // stream buffer was drained and we need to pause curl while waiting for new data
            isPaused = true
            return CURL_READFUNC_PAUSE
          }

          readBuffer.copy(targetBuffer)
          return readBuffer.length
        })

        curl.perform()
      },
    )

    expect(result.statusCode).toBe(200)
    expect(result.body).toBe(fileHash)
  })

  it('should abort upload with invalid fd', async () => {
    curl.setOpt('UPLOAD', 1)
    curl.setOpt('READDATA', -1)

    const error = await new Promise<{ error: Error; errorCode: number }>(
      (resolve) => {
        curl.on('end', () => {
          throw new Error(
            'Invalid file descriptor specified but upload was performed correctly.',
          )
        })

        curl.on('error', (error, errorCode) => {
          resolve({ error, errorCode })
        })

        curl.perform()
      },
    )

    // [Error: Operation was aborted by an application callback]
    expect(error.errorCode).toBe(42)
  })
})
