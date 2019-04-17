/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { app, host, port, server } from '../helper/server'
import { Curl, CurlFeature } from '../../lib'

const responseData = 'Ok'
const responseLength = responseData.length

const url = `http://${host}:${port}/`

let curl: Curl
let headerLength: number

describe('Features', () => {
  beforeEach(() => {
    curl = new Curl()
    curl.setOpt('URL', url)
  })

  afterEach(() => {
    curl.close()
  })

  before(done => {
    server.listen(port, host, done)

    app.get('/', (_req, res) => {
      res.send(responseData)

      // @ts-ignore
      headerLength = res._header.length
    })
  })

  after(() => {
    server.close()
    app._router.stack.pop()
  })

  it('should not store data when NoDataStorage is set', done => {
    curl.enable(CurlFeature.NoDataStorage)

    curl.on('end', (_status, data, headers) => {
      data.should.be.an.instanceOf(Buffer).and.have.property('length', 0)
      headers.should.be.an.instanceOf(Array).and.have.property('length', 1)
      done()
    })

    curl.on('error', done)

    curl.perform()
  })

  it('should not store headers when NoHeaderStorage is set', done => {
    curl.enable(CurlFeature.NoHeaderStorage)

    curl.on('end', (_status, data, headers) => {
      data.should.be.an
        .instanceOf(String)
        .and.have.property('length', responseLength)
      headers.should.be.instanceOf(Buffer).and.have.property('length', 0)
      done()
    })

    curl.on('error', done)

    curl.perform()
  })

  it('should not parse data when NoDataParsing is set', done => {
    curl.enable(CurlFeature.NoDataParsing)

    curl.on('end', (_status, data, headers) => {
      data.should.be.an
        .instanceOf(Buffer)
        .and.have.property('length', responseLength)
      headers.should.be.an.instanceOf(Array).and.have.property('length', 1)
      done()
    })

    curl.on('error', done)

    curl.perform()
  })

  it('should not parse headers when NoHeaderParsing is set', done => {
    curl.enable(CurlFeature.NoHeaderParsing)

    curl.on('end', (_status, data, headers) => {
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
})
