/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import 'should'

import { app, host, port, server } from '../helper/server'
import { Curl } from '../../lib'

const url = `http://${host}:${port}/`

let curl: Curl

describe('setOpt()', () => {
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
      res.send('Hello World!')
    })
  })

  after(() => {
    server.close()
    app._router.stack.pop()
  })

  it('should accept Curl.option constants', () => {
    curl.setOpt(Curl.option.URL, url)
  })

  it('should not accept invalid argument type', () => {
    const optionsToTest = [
      ['URL', 0],
      ['HTTPPOST', 0],
      ['POSTFIELDS', 0],
    ] as const

    let errorsCaught = 0

    for (const optionTuple of optionsToTest) {
      try {
        // @ts-ignore
        curl.setOpt.apply(curl, optionTuple)
      } catch (error) {
        errorsCaught++
      }
    }

    if (errorsCaught !== optionsToTest.length)
      throw Error('Invalid option was accepted.')
  })

  it('should not work with non-implemented options', () => {
    ;(() => {
      curl.setOpt(Curl.option.SSL_CTX_FUNCTION, 1)
    }).should.throw(/^Unsupported/)
  })

  it('should restore default internal callbacks when setting WRITEFUNCTION and HEADERFUNCTION callback back to null', done => {
    let shouldCallEvents = false
    let lastCall = false
    let headerEvtCalled = false
    let dataEvtCalled = false

    curl.setOpt('WRITEFUNCTION', buffer => {
      buffer.should.be.instanceof(Buffer)
      return buffer.length
    })

    curl.setOpt('HEADERFUNCTION', buffer => {
      buffer.should.be.instanceof(Buffer)
      return buffer.length
    })

    curl.on('data', () => {
      shouldCallEvents.should.be.true()
      dataEvtCalled = true
    })

    curl.on('header', () => {
      shouldCallEvents.should.be.true()
      headerEvtCalled = true
    })

    curl.on('end', () => {
      curl.setOpt('WRITEFUNCTION', null)
      curl.setOpt('HEADERFUNCTION', null)

      if (!lastCall) {
        lastCall = true
        shouldCallEvents = true
        curl.perform()
        return
      }

      dataEvtCalled.should.be.true()
      headerEvtCalled.should.be.true()

      done()
    })

    curl.on('error', done)

    curl.perform()
  })

  describe('HTTPPOST', () => {
    it('should not accept invalid arrays', () => {
      try {
        // @ts-ignore
        curl.setOpt('HTTPPOST', [1, 2, {}])
      } catch (error) {
        return
      }

      throw Error('Invalid array accepted.')
    })

    it('should not accept invalid property names', () => {
      try {
        // @ts-ignore
        curl.setOpt('HTTPPOST', [{ dummy: 'property' }])
      } catch (error) {
        return
      }

      throw Error('Invalid property name accepted.')
    })

    it('should not accept invalid property value', () => {
      const args = [{}, [], 1, null, false, undefined]
      let invalidArgs: string[] = []

      for (const arg of args) {
        try {
          // @ts-ignore
          curl.setOpt('HTTPPOST', [{ name: arg }])
        } catch (error) {
          console.log(error)
          invalidArgs = [...invalidArgs, arg === null ? 'null' : typeof arg]
        }
      }

      if (invalidArgs.length !== args.length) {
        throw Error(
          'Invalid property value accepted. Invalid Args: ' +
            JSON.stringify(invalidArgs) +
            ', Args: ' +
            JSON.stringify(args),
        )
      }
    })
  })
})
