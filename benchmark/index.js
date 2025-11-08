/* eslint-disable @typescript-eslint/no-unused-vars */
import http from 'http'
// import { curly, Curl, Easy } from 'node-libcurl'
import axios from 'axios'
import superagent from 'superagent'
import request from 'request'
import { Suite, chartReport } from 'bench-node'
import got from 'got'
import ky from 'ky'

// provide a `require` equivalent for ES modules, usually via createRequire, for loading CJS modules if needed
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { curly, Curl, Easy } = require('../dist')

console.log(Curl.getVersion())

const HOST = process.env.HOST || '127.0.0.1'
const PORT = process.env.PORT || '8080'
const FULL_URL = process.env.URL || `http://${HOST}:${PORT}/index.html`

const suite = new Suite({
  minSamples: 20,
  benchmarkMode: 'ops',
  reporter: chartReport,
})

suite.add(
  'node.js http.request - GET',
  async () =>
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
    }),
)

suite.add('axios - GET', async () => {
  await axios.get(FULL_URL)
})

suite.add(
  'superagent - GET',
  async () =>
    new Promise((resolve, reject) => {
      superagent.get(FULL_URL).end((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    }),
)

suite.add(
  'request - GET',
  async () =>
    new Promise((resolve, reject) => {
      request(FULL_URL, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    }),
)

suite.add('fetch - GET', async () => {
  await fetch(FULL_URL).then((res) => res.text())
})

suite.add('got - GET', async () => {
  await got(FULL_URL).text()
})

suite.add('ky - GET', async () => {
  await ky.get(FULL_URL).text()
})

suite.add('node-libcurl curly - GET', async () => {
  await curly.get(FULL_URL, {
    curlyResponseBodyParser(buffer) {
      return buffer.toString('utf8')
    },
  })
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
  })
}

suite.add(
  'node-libcurl Curl - GET',
  async () =>
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
    }),
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
  }
  timer.end(timer.count)
})

suite.run()
