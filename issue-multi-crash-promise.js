#!/usr/bin/env node
/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { Worker, isMainThread } = require('worker_threads')

const nodeLibcurl = require(
  path.join(__dirname, 'lib', 'binding', 'node_libcurl.node'),
)

function log(message) {
  if (isMainThread) {
    console.log(`[main thread: ${nodeLibcurl.Curl.THREAD_ID}] ${message}`)
  } else {
    console.log(`[worker thread: ${nodeLibcurl.Curl.THREAD_ID}] ${message}`)
  }
}

async function runMultiTest(nodeLibcurl, log) {
  return new Promise((resolve, reject) => {
    try {
      log('Testing Multi interface...')

      const multi = new nodeLibcurl.Multi()
      const easy = new nodeLibcurl.Easy()

      easy.setOpt('URL', 'https://httpbin.org/get')

      let resolveInner
      const innerPromise = new Promise((res) => {
        resolveInner = res
      })

      multi.onMessage((error, easy, errorCode) => {
        log('Multi message callback called!')
        console.log(error, easy, errorCode, resolveInner)

        if (easy) {
          const statusCode = easy.getInfo('RESPONSE_CODE')
          const effectiveUrl = easy.getInfo('EFFECTIVE_URL')
          log(`Multi response code: ${statusCode.data}`)
          log(`Multi effective URL: ${effectiveUrl.data}`)
          multi.removeHandle(easy)
          easy.close()
        }
        resolveInner()
      })

      multi.addHandle(easy)
      log(`Added ${multi.getCount()} handles to multi`)
      log(`Performing request...`)

      easy.perform()

      innerPromise
        .then(() => {
          log(`Performed request!`)
          multi.close()
          resolve()
        })
        .catch(reject)
    } catch (error) {
      log(`Error in runMultiTest: ${error.message}`)
      console.error(error)
      reject(error)
    }
  })
}

async function mainWorker() {
  await runMultiTest(nodeLibcurl, log)
}

async function runWorkerTest() {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: { testName: 'worker-test' },
    })

    worker.on('message', (data) => {
      if (data.type === 'log') {
        console.log(`[worker] ${data.message}`)
      }
    })

    worker.on('error', (error) => {
      reject(new Error(`Worker error: ${error.message}`))
    })

    worker.on('exit', (code) => {
      if (code === 0) {
        resolve({ success: true })
      } else {
        reject(new Error(`Worker exited with code ${code}`))
      }
    })
  })
}

async function main() {
  try {
    console.log('Testing Multi interface in main thread')
    await runMultiTest(nodeLibcurl, log)
    console.log('✅ Multi test in main thread completed successfully!')

    console.log('\nSpawning worker thread...')
    await runWorkerTest()
    console.log('✅ Worker thread test completed successfully!')
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

async function workerMain() {
  try {
    log('Worker started')
    await mainWorker()
    log('Worker completed successfully')
    process.exit(0)
  } catch (error) {
    log(`Worker error: ${error.message}`)
    process.exit(1)
  }
}

if (isMainThread) {
  main()
} else {
  workerMain()
}
