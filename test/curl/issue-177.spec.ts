import { describe, it, expect } from 'vitest'
import { Curl } from '../../lib'

describe('issues', () => {
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

    expect(error).not.toBeNull()
    const promiseResolvedTime = process.hrtime(testStartTime)
    expect(promiseResolvedTime[0]).toBeLessThan(2)

    clearTimeout(timeout)
  })
})
