/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2015-2016, Jonathan Cardoso Machado
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var serverObj = require('./../helper/server'),
  Curl = require('../../lib/Curl'),
  path = require('path'),
  fs = require('fs'),
  crypto = require('crypto')

var server = serverObj.server,
  app = serverObj.app,
  curl = new Curl(),
  fileSize = 10 * 1024, //10Kb
  fileName = path.resolve(__dirname, 'upload.test'),
  fileHash = '',
  uploadLocation = '',
  url = ''

function hashOfFile(file, cb) {
  var fd = fs.createReadStream(file),
    hash = crypto.createHash('sha1')

  hash.setEncoding('hex')

  fd.on('end', function() {
    console.log('hashOfFile - end')
    hash.end()

    cb(null, hash.read())
  })

  fd.on('error', function(error) {
    console.log('hashOfFile - error', error)
    cb(error)
  })

  fd.pipe(hash)
}

beforeEach(function(done) {
  curl = new Curl()
  curl.setOpt(Curl.option.URL, url + '/upload/upload-result.test')
  curl.setOpt(Curl.option.HTTPHEADER, [
    'Content-Type: application/node-libcurl.raw',
  ])

  //write random bytes to a file, this will be our test file.
  fs.writeFileSync(fileName, crypto.randomBytes(fileSize))

  //get a hash of given file so we can assert later
  // that the file sent is equals to the one we created.
  hashOfFile(fileName, function(error, hash) {
    console.log('beforeEach - obtained hash', error, hash)
    fileHash = hash
    done(error)
  })
})

afterEach(function() {
  curl.close()

  fs.unlinkSync(fileName)
  if (fs.existsSync(uploadLocation)) {
    fs.unlinkSync(uploadLocation)
  }
})

before(function(done) {
  server.listen(serverObj.port, serverObj.host, function() {
    url = server.address().address + ':' + server.address().port

    done()
  })

  app.put('/upload/:filename', function(req, res, next) {
    uploadLocation = path.resolve(__dirname, req.params['filename'])

    var fd = fs.openSync(uploadLocation, 'w+')

    fs.writeSync(fd, req.body, 0, req.body.length, 0)
    fs.closeSync(fd)
    hashOfFile(uploadLocation, function(error, hash) {
      console.log('server - obtained hash', error, hash)
      if (error) {
        res.status(500).send(error.message)
      } else {
        res.send(hash)
      }
      next()
    })
  })

  app.use(function(error, req, res, next) {
    console.log('server - error', error)
    if (error.type !== 'request.aborted') {
      res.status(500).send(error.message)
    } else {
      res.status(error.status).send('Aborted')
    }
  })
})

after(function() {
  server.close()

  app._router.stack.pop()
  app._router.stack.pop()
})

it('should upload data correctly using put', function(done) {
  var fd = fs.openSync(fileName, 'r+')

  curl.setOpt(Curl.option.UPLOAD, 1)
  curl.setOpt(Curl.option.READDATA, fd)

  curl.on('end', function(statusCode, body) {
    statusCode.should.be.equal(200)
    body.should.be.equal(fileHash)

    fs.closeSync(fd)
    done()
  })

  curl.on('error', function(err) {
    fs.closeSync(fd)
    done(err)
  })

  curl.perform()
})

it('should upload data correctly using READFUNCTION callback option', function(done) {
  var CURL_READFUNC_PAUSE = 0x10000001
  var CURL_READFUNC_ABORT = 0x10000000
  var CURLPAUSE_CONT = 0

  var stream = fs.createReadStream(fileName)
  var cancelRequested = false

  curl.setOpt(Curl.option.UPLOAD, true)

  curl.on('end', function(statusCode, body) {
    console.log('curl - evt - end', statusCode, body)
    statusCode.should.be.equal(200)
    body.should.be.equal(fileHash)

    done()
  })

  curl.on('error', function(err) {
    console.log('curl - evt - error', err)
    done(err)
  })

  stream.on('error', function(err) {
    done(err)

    // make sure curl is not left in "waiting for data" state
    console.log('stream - evt - error - cancelling readfunc')
    cancelRequested = true
    curl.pause(CURLPAUSE_CONT) // resume curl
  })

  var isReadable = true // flag not to spam curl with resume requests
  stream.on('readable', function() {
    console.log('stream - evt - readable')
    if (!isReadable) {
      console.log('stream - evt - readable - readfunc was paused, resuming')
      curl.pause(CURLPAUSE_CONT) // resume curl to let it ask for available data
      isReadable = true
    }
  })
  var isEnded = false // stream has no method to get this state
  stream.on('end', function() {
    console.log('stream - evt - ended')
    isEnded = true
  })

  curl.setOpt(Curl.option.READFUNCTION, function(targetBuffer) {
    console.log('readfunction callback - start', {
      cancelRequested,
      isEnded,
      isReadable,
    })
    if (cancelRequested) {
      console.log('readfunction callback - cancelling by request')
      return CURL_READFUNC_ABORT
    }

    // stream returns null if it has < requestedBytes available
    var readBuffer = stream.read(100) || stream.read()

    if (readBuffer === null) {
      if (isEnded) {
        console.log('readfunction callback - returning 0 because it ended')
        return 0
      }
      // stream buffer was drained and we need to pause curl while waiting for new data
      isReadable = false
      console.log('readfunction callback - pausing because stream was drained')
      return CURL_READFUNC_PAUSE
    }

    readBuffer.copy(targetBuffer)
    console.log(`returning length of data sent: ${readBuffer.length}`)
    return readBuffer.length
  })

  curl.perform()
})

it('should abort upload with invalid fd', function(done) {
  curl.setOpt(Curl.option.UPLOAD, 1)
  curl.setOpt(Curl.option.READDATA, -1)

  curl.on('end', function() {
    done(
      new Error(
        'Invalid file descriptor specified but upload was performed correctly.'
      )
    )
  })

  curl.on('error', function(err, errCode) {
    //[Error: Operation was aborted by an application callback]
    errCode.should.be.equal(42)

    done()
  })

  curl.perform()
})
