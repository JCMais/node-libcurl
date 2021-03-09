import { Curl } from '../../lib'

import should from 'should'

describe('issues', function () {
  this.timeout(20000)

  it('issue-177 - node.js microtasks interference', async () => {
    const testStartTime = process.hrtime()
    const timeout = setTimeout(() => void 0, 15000)
    const makeCall = () =>
      new Promise((resolve, reject) => {
        const curl = new Curl()

        curl.setOpt('URL', '10.255.255.1')
        curl.setOpt('CONNECTTIMEOUT', 1)
        curl.setOpt('TIMEOUT', 1)

        curl.on('error', () => {
          curl.close()
          reject(new Error('Rejected'))
        })

        curl.on('end', () => {
          curl.close()
          resolve(void 0)
        })

        curl.perform()
      })

    let error = null
    try {
      await makeCall()
    } catch (_error) {
      error = _error
    }

    should(error).not.be.equal(null)
    const promiseResolvedTime = process.hrtime(testStartTime)
    promiseResolvedTime[0].should.be.lessThan(2)

    clearTimeout(timeout)
  })
})
