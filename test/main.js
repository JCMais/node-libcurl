/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const should = require('should')

const Curl = require('../lib/Curl')

function importTest(name, path, only, skip) {
  if (typeof only === 'undefined') {
    only = false
  }

  if (typeof skip === 'undefined') {
    skip = false
  }

  only = !!only
  skip = !!skip

  if (only) {
    describe.only(name, function() {
      require(path)
    })
  } else if (skip) {
    describe.skip(name, function() {
      require(path)
    })
  } else {
    describe(name, function() {
      require(path)
    })
  }
}

describe('Curl', function() {
  console.log('Running tests for libcurl:', Curl.getVersion(), Curl.VERSION_NUM)
  importTest('Connection timeout', './curl/connection-timeout')
  importTest('setOpt()', './curl/setopt')
  importTest('getInfo()', './curl/getinfo')
  importTest('reset()', './curl/reset')
  importTest('dupHandle()', './curl/duphandle')
  importTest('feature()', './curl/feature')
  importTest('events', './curl/events')
  importTest('Post Fields', './curl/postfields')
  importTest('HTTP Auth', './curl/httpauth')
  importTest('HTTP Post', './curl/httppost')
  importTest('Binary Data', './curl/binary-data')
  importTest('Put Upload', './curl/put-upload')
  importTest('Callbacks', './curl/callbacks')
  importTest('SSL', './curl/ssl')
  importTest('HTTP2', './curl/http2')
})
