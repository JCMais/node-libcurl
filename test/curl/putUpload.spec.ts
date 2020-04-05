/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

import express from 'express'

import { app, host, port, server } from '../helper/server'
import { Curl } from '../../lib'

const url = `http://${host}:${port}`

const fileSize = 10 * 1024 // 10K
const fileName = path.resolve(__dirname, 'upload.test')

let fileHash = ''
let uploadLocation = ''
let curl: Curl

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
  beforeEach((done) => {
    curl = new Curl()
    curl.setOpt(Curl.option.URL, `${url}/upload/upload-result.test`)
    curl.setOpt(Curl.option.HTTPHEADER, [
      'Content-Type: application/node-libcurl.raw',
    ])

    // write random bytes to a file, this will be our test file.
    fs.writeFileSync(fileName, crypto.randomBytes(fileSize))

    // get a hash of given file so we can assert later
    // that the file sent is equals to the one we created.
    hashOfFile(fileName, (error, hash) => {
      fileHash = hash
      done(error)
    })
  })

  afterEach(() => {
    curl.close()

    fs.unlinkSync(fileName)
    if (fs.existsSync(uploadLocation)) {
      fs.unlinkSync(uploadLocation)
    }
  })

  before((done) => {
    app.put('/upload/:filename', (req, res) => {
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

    app.use(
      (
        error: any,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        if (error.type !== 'request.aborted') {
          res.status(500).send(error.message)
        } else {
          res.status(error.status).send('Aborted')
        }
      },
    )

    server.listen(port, host, done)
  })

  after(() => {
    server.close()

    app._router.stack.pop()
    app._router.stack.pop()
  })

  it('should upload data correctly using put', (done) => {
    const fd = fs.openSync(fileName, 'r+')

    curl.setOpt('UPLOAD', 1)
    curl.setOpt('READDATA', fd)

    curl.on('end', (statusCode, body) => {
      statusCode.should.be.equal(200)
      body.should.be.equal(fileHash)

      fs.closeSync(fd)
      done()
    })

    curl.on('error', (error) => {
      fs.closeSync(fd)
      done(error)
    })

    curl.perform()
  })

  it('should upload data correctly using READFUNCTION callback option', (done) => {
    const CURL_READFUNC_PAUSE = 0x10000001
    const CURL_READFUNC_ABORT = 0x10000000
    const CURLPAUSE_CONT = 0

    const stream = fs.createReadStream(fileName)

    const cancelRequested = false
    let isPaused = false
    let isEnded = false

    curl.setOpt(Curl.option.UPLOAD, true)

    curl.on('end', (statusCode, body) => {
      statusCode.should.be.equal(200)
      body.should.be.equal(fileHash)

      done()
    })

    curl.on('error', done)

    stream.on('error', done)

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
  })

  it('should abort upload with invalid fd', (done) => {
    curl.setOpt('UPLOAD', 1)
    curl.setOpt('READDATA', -1)

    curl.on('end', () => {
      done(
        new Error(
          'Invalid file descriptor specified but upload was performed correctly.',
        ),
      )
    })

    curl.on('error', (_error, errorCode) => {
      // [Error: Operation was aborted by an application callback]
      errorCode.should.be.equal(42)

      done()
    })

    curl.perform()
  })
})
