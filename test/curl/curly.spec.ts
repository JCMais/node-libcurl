/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { app, host, port, server } from '../helper/server'
import { curly } from '../../lib'

const url = `http://${host}:${port}`

describe('curly', () => {
  before((done) => {
    server.listen(port, host, done)

    app.all('/all', (req, res) => {
      const method = req.method.toLowerCase()

      switch (req.query.type) {
        case 'no-content-type':
          res.writeHead(200)
          res.write('no content type :)')
          return res.end()
        case 'method':
          return res.set({ 'x-req-method': method }).send(method)
        case 'json':
          return res
            .set({ 'content-type': 'application/json;charset=utf-8' })
            .json({
              test: true,
            })
        case 'json-body':
          return res
            .set({ 'content-type': 'application/json;charset=utf-8' })
            .json(req.body)
        case 'json-invalid':
          return res
            .set({ 'content-type': 'application/json;charset=utf-8' })
            .send("I'm invalid :)")
        case 'something':
          return res
            .contentType('application/something')
            .send('binary data would go here :)')
        default:
          return res.send('Hello World!')
      }
    })
  })

  after(() => {
    server.close()
    // beatiful is not it?
    app._router.stack.pop()
  })

  describe('common usage', () => {
    it('works for multiple methods', async () => {
      const urlMethod = `${url}/all?type=method`

      const emptyData = {
        // this is necessary to do an empty post request with libcurl
        // otherwise the default READFUNCTION will be used, which reads data from stdin
        postFields: '',
      }

      const methods = [
        ['post', emptyData],
        ['get'],
        ['patch'],
        ['head'],
        ['put'],
        ['delete'],
      ] as const

      for (const [method, options] of methods) {
        const { statusCode, headers } = await curly[method](urlMethod, options)

        statusCode.should.be.equal(200)
        headers[0]['x-req-method'].should.be.equal(method)
      }
    })

    it('can set base url', async () => {
      const curlyBaseUrl = url

      const { statusCode } = await curly.get('/all', {
        curlyBaseUrl,
      })

      statusCode.should.be.equal(200)
    })

    it('can set global defaults in a curly object with .create()', async () => {
      const curlyObj = curly.create({
        postFields: 'field=value',
      })

      const { statusCode, data } = await curlyObj.post<Record<string, any>>(
        `${url}/all?type=json-body`,
      )

      statusCode.should.be.equal(200)
      data.should.be.deepEqual({
        field: 'value',
      })
    })

    it('default content-type parsers work - text', async () => {
      const { statusCode, data } = await curly.get<string>(`${url}/all`)
      statusCode.should.be.equal(200)

      data.should.be.a.String()
      data.should.be.equal('Hello World!')
    })

    it('default content-type parsers work - json', async () => {
      const { statusCode, data } = await curly.get<Record<string, any>>(
        `${url}/all?type=json`,
      )

      statusCode.should.be.equal(200)

      data.should.be.an.Object()
      data.should.have.a.property('test', true)
    })

    it('default content-type parsers work - *', async () => {
      const { statusCode, data } = await curly.get<Buffer>(
        `${url}/all?type=something`,
      )

      statusCode.should.be.equal(200)

      data.should.be.instanceOf(Buffer)
      data.toString('utf-8').should.be.equal('binary data would go here :)')
    })

    it('overrides content-type parser with the curlyResponseBodyParsers option - json', async () => {
      const options = {
        curlyResponseBodyParsers: {
          'application/json': (data: Buffer, header: any[]) => {
            data.should.be.an.instanceOf(Buffer)
            header.should.be.an.Array()

            return 'json'
          },
        },
      }

      const req1 = await curly.get<string>(`${url}/all?type=json`, options)
      req1.statusCode.should.be.equal(200)
      req1.data.should.be.equal('json')

      // make sure the others default parsers are still working

      const req2 = await curly.get<string>(`${url}/all?type=something`, options)
      req2.statusCode.should.be.equal(200)
      req2.data.should.be.an.instanceOf(Buffer)
    })

    it('overrides all content-type parsers with the curlyResponseBodyParser option - json', async () => {
      const options = {
        curlyResponseBodyParser: (data: Buffer, header: any[]) => {
          data.should.be.an.instanceOf(Buffer)
          header.should.be.an.Array()

          return 'data'
        },
      }

      const req1 = await curly.get<string>(`${url}/all?type=json`, options)
      req1.statusCode.should.be.equal(200)
      req1.data.should.be.equal('data')

      const req2 = await curly.get<string>(`${url}/all?type=something`, options)
      req2.statusCode.should.be.equal(200)
      req1.data.should.be.equal('data')
    })

    it('can set curlyResponseBodyParser option to false', async () => {
      const { statusCode, data } = await curly.get<string>(
        `${url}/all?type=json`,
        {
          curlyResponseBodyParser: false,
        },
      )

      statusCode.should.be.equal(200)
      data.should.be.an.instanceOf(Buffer)
    })
  })

  describe('weird servers', () => {
    it('works with response without a content-type', async () => {
      const { statusCode, data } = await curly.get(
        `${url}/all?type=no-content-type`,
      )

      statusCode.should.be.equal(200)
      data.should.be.instanceOf(Buffer)
    })
  })

  describe('error handling', () => {
    it('throw error on invalid response body parser in option curlyResponseBodyParsers', async () => {
      const options = {
        curlyResponseBodyParsers: {
          'application/json': 'abc',
        },
      }

      await curly
        // @ts-expect-error
        .get<string>(`${url}/all?type=json`, options)
        // @ts-ignore
        .should.be.rejectedWith(TypeError, {
          message: /^Response body parser for/,
        })
    })

    it('throw error on invalid response body parser in option curlyResponseBodyParser', async () => {
      const options = {
        curlyResponseBodyParser: 'abc',
      }

      await curly
        // @ts-expect-error
        .get<string>(`${url}/all?type=json`, options)
        // @ts-ignore
        .should.be.rejectedWith(TypeError, {
          message: /^`curlyResponseBodyParser` passed to curly must be/,
        })
    })

    it('error thrown inside response body parser bubble up to the original call', async () => {
      const options = {
        curlyResponseBodyParser: () => {
          throw new Error('error here')
        },
      }

      await curly
        .get<string>(`${url}/all?type=json`, options)
        // @ts-ignore
        .should.be.rejectedWith(Error, {
          message: /^error here/,
        })
    })

    it('default response body parser for application/json throws an error when it receives invalid json', async () => {
      await curly
        .get<string>(`${url}/all?type=json-invalid`)
        // @ts-ignore
        .should.be.rejectedWith(Error, {
          message: /^curly failed to parse/,
        })
    })

    it('throws an error when the internal Curl instance emits an error', async () => {
      await curly
        .get<string>(`${url}/abc`, {
          failOnError: true,
        })
        // @ts-ignore
        .should.be.rejectedWith(Error, {
          message: /^HTTP response code said error/,
          code: 22,
        })
    })
  })
})
