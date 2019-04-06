/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
    hash.end()

    cb(null, hash.read())
  })

  fd.on('error', function(error) {
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
      if (error) {
        res.status(500).send(error.message)
      } else {
        res.send(hash)
      }
      next()
    })
  })

  app.use(function(error, req, res, next) {
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
    statusCode.should.be.equal(200)
    body.should.be.equal(fileHash)

    done()
  })

  curl.on('error', function(err) {
    done(err)
  })

  // flag not to spam curl with resume requests
  var isPaused = false

  stream.on('error', function(err) {
    done(err)

    cancelRequested = true

    // make sure curl is not left in "waiting for data" state
    if (isPaused) {
      isPaused = false
      curl.pause(CURLPAUSE_CONT)
    }
  })

  stream.on('readable', function() {
    // resume curl to let it ask for available data
    if (isPaused) {
      isPaused = false
      curl.pause(CURLPAUSE_CONT)
    }
  })

  // stream has no method to get this state
  var isEnded = false
  stream.on('end', function() {
    isEnded = true

    // resume curl to let it see there is no more data, just in case it was paused
    if (isPaused) {
      isPaused = false
      curl.pause(CURLPAUSE_CONT)
    }
  })

  curl.setOpt(Curl.option.READFUNCTION, function(targetBuffer) {
    if (cancelRequested) {
      return CURL_READFUNC_ABORT
    }

    // stream returns null if it has < requestedBytes available
    var readBuffer = stream.read(100) || stream.read()

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
