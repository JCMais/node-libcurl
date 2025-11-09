/* eslint-disable @typescript-eslint/no-unused-vars */

import crypto from 'crypto'
import http from 'http'
import axios from 'axios'
import { Suite, chartReport } from 'bench-node'
import { createRequire } from 'module'
// import { curly, Curl, Easy } from 'node-libcurl'
import superagent from 'superagent'
import request from 'request'
import got from 'got'
import ky from 'ky'

const require = createRequire(import.meta.url)
const { curly, Curl, Easy } = require('../dist')

console.log(Curl.getVersion())

const HOST = process.env.HOST || '127.0.0.1'
const PORT = process.env.PORT || '8080'
const FULL_URL = process.env.URL || `http://${HOST}:${PORT}/index.html`

const HASH_ITERATIONS = 1000
const HASH_ALGORITHM = 'sha256'
const DATA_TO_HASH =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10)

/**
 * Simulates CPU-intensive work between requests
 * This represents real-world processing like:
 * - Data transformation
 * - Validation
 * - Business logic computation
 * - Serialization/deserialization
 */
function simulateWork() {
  let hash = DATA_TO_HASH
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash = crypto.createHash(HASH_ALGORITHM).update(hash).digest('hex')
  }
  return hash
}

const suite = new Suite({
  name: 'Context Switching',
  minSamples: 20,
  benchmarkMode: 'ops',
  reporter: chartReport,
})

suite.add('node.js http.request - GET', async () =>
  new Promise((resolve, reject) => {
    http
      .request(FULL_URL, (res) => {
        res.setEncoding('utf8')
        let rawData = ''
        res.on('data', (chunk) => {
          rawData += chunk
        })
        res.on('end', () => {
          resolve()
        })
        res.on('error', (error) => {
          reject(error)
        })
      })
      .end()
  }).finally(simulateWork),
)

suite.add('axios - GET', async () => {
  await axios.get(FULL_URL)
  simulateWork()
})

suite.add(
  'superagent - GET',
  async () =>
    new Promise((resolve, reject) => {
      superagent.get(FULL_URL).end((err) => {
        simulateWork()
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    }),
)

suite.add('request - GET', async () =>
  new Promise((resolve, reject) => {
    request(FULL_URL, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  }).finally(simulateWork),
)

suite.add('fetch - GET', async () => {
  await fetch(FULL_URL).then((res) => res.text())
  simulateWork()
})

suite.add('got - GET', async () => {
  await got(FULL_URL).text()
  simulateWork()
})

suite.add('ky - GET', async () => {
  await ky.get(FULL_URL).text()
  simulateWork()
})

suite.add('node-libcurl curly - GET', async () => {
  await curly.get(FULL_URL, {
    curlyResponseBodyParser(buffer) {
      return buffer.toString('utf8')
    },
  })
  simulateWork()
})

if ('setObjectPoolLimit' in curly) {
  const curlyWithPool = curly.create({
    curlyResponseBodyParser(buffer) {
      return buffer.toString('utf8')
    },
  })

  curlyWithPool.setObjectPoolLimit(100)

  suite.add('node-libcurl curly with object pool - GET', async () => {
    await curlyWithPool.get(FULL_URL, {
      curlyResponseBodyParser(buffer) {
        return buffer.toString('utf8')
      },
    })
    simulateWork()
  })
}

suite.add('node-libcurl Curl - GET', async () =>
  new Promise((resolve, reject) => {
    const curl = new Curl()
    curl.setOpt('URL', FULL_URL)
    curl.on('end', () => {
      curl.close()
      resolve()
    })
    curl.on('error', (error) => {
      curl.close()
      reject(error)
    })
    curl.perform()
  }).finally(simulateWork),
)

let curlReuse = null
suite.add('node-libcurl Curl - reusing instance - GET', async (timer) => {
  if (!curlReuse) {
    curlReuse = new Curl()
  }
  curlReuse.setOpt('URL', FULL_URL)
  timer.start()
  for (let i = 0; i < timer.count; i++) {
    await new Promise((resolve, reject) => {
      const onEnd = () => {
        curlReuse.off('end', onEnd)
        curlReuse.off('error', onError)
        resolve()
      }
      const onError = (error) => {
        curlReuse.off('end', onEnd)
        curlReuse.off('error', onError)
        curlReuse.close()
        reject(error)
      }
      curlReuse.on('end', onEnd)
      curlReuse.on('error', onError)
      curlReuse.perform()
    })

    simulateWork()
  }

  timer.end(timer.count)
})

suite.add('node-libcurl Easy - GET', () => {
  const easy = new Easy()
  let headers = ''
  let body = ''

  easy.setOpt('URL', FULL_URL)
  easy.setOpt('HEADERFUNCTION', (data, size, nmemb) => {
    headers += data.toString('utf8')
    return size * nmemb
  })
  easy.setOpt('WRITEFUNCTION', (data, size, nmemb) => {
    body += data.toString('utf8')
    return size * nmemb
  })

  easy.perform()
  easy.close()
  simulateWork()
})

let easyReuse = null
suite.add('node-libcurl Easy - reusing instance - GET', (timer) => {
  if (!easyReuse) {
    easyReuse = new Easy()
  }
  timer.start()
  for (let i = 0; i < timer.count; i++) {
    let headers = ''
    let body = ''
    easyReuse.setOpt('URL', FULL_URL)
    easyReuse.setOpt('HEADERFUNCTION', (data, size, nmemb) => {
      headers += data.toString('utf8')
      return size * nmemb
    })
    easyReuse.setOpt('WRITEFUNCTION', (data, size, nmemb) => {
      body += data.toString('utf8')
      return size * nmemb
    })
    easyReuse.perform()
    simulateWork()
  }
  timer.end(timer.count)
})

suite.run()
