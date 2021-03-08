const http = require('http')
const { curly, Curl, Easy } = require('node-libcurl')
const axios = require('axios')
const superagent = require('superagent')
const request = require('request')
const fetch = require('node-fetch')

const HOST = process.env.HOST || '127.0.0.1'
const PORT = process.env.PORT || '8080'
const URL = `http://${HOST}:${PORT}`

axios.defaults.baseURL = URL

const Benchmark = require('benchmark')
const suite = new Benchmark.Suite('node.js http request libraries', {
  initCount: 5,
})

suite.add('node.js http.request - GET', {
  defer: true,
  fn: (defer) => {
    http
      .request({ host: HOST, port: PORT, path: '/' }, (res) => {
        res.setEncoding('utf8')
        let rawData = ''
        res.on('data', (chunk) => {
          // eslint-disable-next-line no-unused-vars
          rawData += chunk
        })
        res.on('end', () => {
          defer.resolve()
        })
      })
      .end()
  },
})

suite.add('axios - GET', {
  defer: true,
  fn: (defer) => {
    axios.get('/').then(() => defer.resolve())
  },
})

suite.add('superagent - GET', {
  defer: true,
  fn: (defer) => {
    superagent.get(URL).end(() => {
      defer.resolve()
    })
  },
})

suite.add('request - GET', {
  defer: true,
  fn: (defer) => {
    request(URL, () => defer.resolve())
  },
})

suite.add('fetch - GET', {
  defer: true,
  fn: (defer) => {
    fetch(URL)
      .then((res) => res.text())
      .then((_body) => defer.resolve())
  },
})

suite.add('node-libcurl curly - GET', {
  defer: true,
  fn: (defer) => {
    curly
      .get(URL, {
        curlyResponseBodyParser(buffer) {
          return buffer.toString('utf8')
        },
      })
      .then((_result) => defer.resolve())
  },
})

suite.add('node-libcurl Curl - GET', {
  defer: true,
  fn: (defer) => {
    const curl = new Curl()
    curl.setOpt('URL', URL)
    const onEnd = () => {
      curl.close()
      defer.resolve()
    }
    const onError = (error) => {
      curl.close()
      throw error
    }
    curl.on('end', onEnd)
    curl.on('error', onError)
    curl.perform()
  },
})

let curlReuse = null
suite.add('node-libcurl Curl - reusing instance - GET', {
  defer: true,
  setup: () => {
    curlReuse = new Curl()
    curlReuse.setOpt('URL', URL)
  },
  fn: (defer) => {
    const onEnd = () => {
      curlReuse.off('end', onEnd)
      curlReuse.off('error', onError)
      defer.resolve()
    }
    const onError = (error) => {
      curlReuse.off('end', onEnd)
      curlReuse.off('error', onError)
      curlReuse.close()
      throw error
    }
    curlReuse.on('end', onEnd)
    curlReuse.on('error', onError)
    curlReuse.perform()
  },
  teardown: () => {
    curlReuse.close()
  },
})

suite.add('node-libcurl Easy - GET', {
  fn: () => {
    const easy = new Easy()
    let headers = ''
    let body = ''

    easy.setOpt('URL', URL)
    easy.setOpt('HEADERFUNCTION', (data, size, nmemb) => {
      // eslint-disable-next-line no-unused-vars
      headers += data.toString('utf8')
      return size * nmemb
    })
    easy.setOpt('WRITEFUNCTION', (data, size, nmemb) => {
      // eslint-disable-next-line no-unused-vars
      body += data.toString('utf8')
      return size * nmemb
    })

    easy.perform()
    easy.close()
  },
})

let easyReuse = null
suite.add('node-libcurl Easy - reusing instance - GET', {
  defer: true,
  setup: () => {
    easyReuse = new Easy()
    easyReuse.setOpt('URL', URL)
  },
  fn: (defer) => {
    let headers = ''
    let body = ''
    easyReuse.setOpt('URL', URL)
    easyReuse.setOpt('HEADERFUNCTION', (data, size, nmemb) => {
      // eslint-disable-next-line no-unused-vars
      headers += data.toString('utf8')
      return size * nmemb
    })
    easyReuse.setOpt('WRITEFUNCTION', (data, size, nmemb) => {
      // eslint-disable-next-line no-unused-vars
      body += data.toString('utf8')
      return size * nmemb
    })
    easyReuse.perform()
    defer.resolve()
  },
  teardown: () => {
    easyReuse.close()
  },
})

suite.on('complete', function () {
  console.log('Fastest is ' + this.filter('fastest').map('name'))
})

suite.on('cycle', function (event) {
  console.log(String(event.target))
})

suite.on('error', function (error) {
  console.error(error)
})

suite.run({ async: true })
