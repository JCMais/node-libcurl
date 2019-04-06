/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var auth = require('http-auth'),
  crypto = require('crypto'),
  serverObj = require('./../helper/server'),
  Curl = require('../../lib/Curl')

var server = serverObj.server,
  app = serverObj.app,
  username = 'user',
  password = 'pass',
  realmBasic = 'basic',
  realmDigest = 'digest',
  basic = auth.basic(
    {
      realm: realmBasic,
    },
    function(usr, pass, callback) {
      callback(usr === username && pass === password)
    }
  ),
  digest = auth.digest(
    {
      realm: realmDigest,
    },
    function(usr, callback) {
      var hash = crypto.createHash('md5')

      if (usr === username) {
        hash.update([username, realmDigest, password].join(':'))
        const hashDigest = hash.digest('hex')

        callback(hashDigest)
      } else {
        callback()
      }
    }
  ),
  curl = {}

beforeEach(function() {
  curl = new Curl()
  curl.setOpt('URL', `http://${serverObj.host}:${serverObj.port}/`)
})

afterEach(function() {
  curl.close()

  app._router.stack.pop()
  app._router.stack.pop()
})

before(function(done) {
  server.listen(serverObj.port, serverObj.host, function() {
    done()
  })
})

after(function() {
  server.close()
})

it('should authenticate using basic auth', function(done) {
  app.use(auth.connect(basic))
  app.get('/', function(req, res) {
    res.send(req.user)
  })

  curl.setOpt('HTTPAUTH', Curl.auth.BASIC)
  curl.setOpt(Curl.option.USERNAME, username)
  curl.setOpt(Curl.option.PASSWORD, password)

  curl.on('end', function(status, data) {
    if (status !== 200) {
      throw Error('Invalid status code: ' + status)
    }

    data.should.be.equal(username)

    done()
  })

  curl.on('error', done)

  curl.perform()
})

it('should authenticate using digest', function(done) {
  //Currently, there is a bug with libcurl > 7.40 when using digest auth
  // on Windows, the realm is not populated from the Auth header.
  //  So we need to use the workaround below to make it work.
  var user = username

  if (process.platform === 'win32' && Curl.VERSION_NUM >= 0x072800) {
    user = realmDigest + '/' + username
  }

  app.use(auth.connect(digest))
  app.get('/', function(req, res) {
    res.send(req.user)
  })

  // curl.setOpt('URL', 'http://httpbin.org/digest-auth/auth/jcm/123')
  curl.setOpt('HTTPAUTH', Curl.auth.DIGEST)
  curl.setOpt(Curl.option.USERNAME, user)
  curl.setOpt(Curl.option.PASSWORD, password)
  // curl.setOpt(Curl.option.USERNAME, 'jcm')
  // curl.setOpt(Curl.option.PASSWORD, '123')

  // curl.setOpt(Curl.option.VERBOSE, 1)

  curl.on('end', function(status, data) {
    if (status !== 200) {
      throw Error('Invalid status code: ' + status)
    }

    data.should.be.equal(username)

    done()
  })

  curl.on('error', done)

  curl.perform()
})

it('should not authenticate using basic', function(done) {
  app.use(auth.connect(basic))
  app.get('/', function(req, res) {
    res.send(req.user)
  })

  curl.setOpt('HTTPAUTH', Curl.auth.ANYSAFE)
  curl.setOpt(Curl.option.USERNAME, username)
  curl.setOpt(Curl.option.PASSWORD, password)

  curl.on('end', function(status) {
    status.should.be.equal(401)

    done()
  })

  curl.on('error', done)

  curl.perform()
})
