/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const serverObj = require('./../helper/server')
const Curl = require('../../lib/Curl')

const { app, host, port, server } = serverObj

const responseData = 'Ok'
const responseLength = responseData.length

const url = `http://${host}:${port}/`

let curl = null
let headerLength = null

beforeEach(() => {
  curl = new Curl()
  curl.setOpt('URL', url)
})

afterEach(() => {
  curl.close()
})

before(done => {
  server.listen(port, host, done)

  app.get('/', (req, res) => {
    res.send(responseData)

    headerLength = res._header.length
  })
})

after(() => {
  server.close()
  app._router.stack.pop()
})

it('should not store data when NO_DATA_STORAGE is set', done => {
  curl.enable(Curl.feature.NO_DATA_STORAGE)

  curl.on('end', (status, data, headers) => {
    data.should.be.an.instanceOf(Buffer).and.have.property('length', 0)
    headers.should.be.an.instanceOf(Array).and.have.property('length', 1)
    done()
  })

  curl.on('error', done)

  curl.perform()
})

it('should not store headers when NO_HEADER_STORAGE is set', done => {
  curl.enable(Curl.feature.NO_HEADER_STORAGE)

  curl.on('end', (status, data, headers) => {
    data.should.be.an
      .instanceOf(String)
      .and.have.property('length', responseLength)
    headers.should.be.instanceOf(Buffer).and.have.property('length', 0)
    done()
  })

  curl.on('error', done)

  curl.perform()
})

it('should not parse data when NO_DATA_PARSING is set', done => {
  curl.enable(Curl.feature.NO_DATA_PARSING)

  curl.on('end', (status, data, headers) => {
    data.should.be.an
      .instanceOf(Buffer)
      .and.have.property('length', responseLength)
    headers.should.be.an.instanceOf(Array).and.have.property('length', 1)
    done()
  })

  curl.on('error', done)

  curl.perform()
})

it('should not parse headers when NO_HEADER_PARSING is set', done => {
  curl.enable(Curl.feature.NO_HEADER_PARSING)

  curl.on('end', (status, data, headers) => {
    data.should.be.an
      .instanceOf(String)
      .and.have.property('length', responseLength)
    headers.should.be.an
      .instanceOf(Buffer)
      .and.have.property('length', headerLength)
    done()
  })

  curl.on('error', done)

  curl.perform()
})
