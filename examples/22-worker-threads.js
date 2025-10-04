#!/usr/bin/env node
/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require('worker_threads')
const path = require('path')

const nodeLibcurl = require(
  path.join(__dirname, '..', 'lib', 'binding', 'node_libcurl.node'),
)

const { Curl } = require('../dist')

// Worker thread - run the actual tests

function log(message) {
  parentPort.postMessage({
    type: 'log',
    message: `[thread: ${nodeLibcurl.Curl.THREAD_ID}] ${message}`,
  })
}

async function workerMain() {
  const { testName, url } = workerData

  try {
    log(`Worker ${testName}: Module loaded successfully - ${Curl.getVersion()}`)

    switch (testName) {
      case 'basic-test':
        await runBasicTest(nodeLibcurl, log)
        break
      case 'concurrent-1':
      case 'concurrent-2':
      case 'concurrent-3':
        await runConcurrentTest(nodeLibcurl, log, url)
        break
      case 'multi-test':
        await runMultiTest(nodeLibcurl, log)
        break
      case 'share-test':
        await runShareTest(nodeLibcurl, log)
        break
      default:
        throw new Error(`Unknown test: ${testName}`)
    }

    log(`Worker ${testName}: All tests passed!`)
    process.exit(0)
  } catch (error) {
    log(`Worker ${testName}: Error - ${error.message}`)
    process.exit(1)
  }
}

async function runBasicTest(nodeLibcurl, log) {
  // Test basic module components
  log('Testing Curl object...')
  if (!nodeLibcurl.Curl) throw new Error('Curl object not found')

  const version = nodeLibcurl.Curl.getVersion()
  log(`Curl version: ${version}`)

  const count = nodeLibcurl.Curl.getCount()
  log(`Active handles: ${count}`)

  // Test Easy class
  log('Testing Easy class...')
  if (!nodeLibcurl.Easy) throw new Error('Easy class not found')

  const easy = new nodeLibcurl.Easy()
  log(`Easy ID: ${easy.id}, isOpen: ${easy.isOpen}`)

  // Test basic setOpt/getInfo
  const result = easy.setOpt('URL', 'https://httpbin.org/get')
  log(`setOpt result: ${result}`)

  easy.close()
  log('Easy handle closed')

  // Test Share class
  log('Testing Share class...')
  const share = new nodeLibcurl.Share()
  const shareResult = share.setOpt('SHARE', 2)
  log(`Share setOpt result: ${shareResult}`)
  share.close()

  // Test Multi class
  log('Testing Multi class...')
  const multi = new nodeLibcurl.Multi()
  const multiCount = multi.getCount()
  log(`Multi count: ${multiCount}`)
  multi.close()
}

async function runConcurrentTest(nodeLibcurl, log, testUrl) {
  try {
    log(`Making HTTP request to: ${testUrl}`)

    const easy = new nodeLibcurl.Easy()
    easy.setOpt('URL', testUrl)
    easy.setOpt('FOLLOWLOCATION', 1)
    easy.setOpt('TIMEOUT', 10)

    log(`Past setOpt`)

    // Use default write behavior for now

    const performResult = easy.perform()
    log(`Perform result: ${performResult}`)

    const statusCode = easy.getInfo('RESPONSE_CODE')
    const effectiveUrl = easy.getInfo('EFFECTIVE_URL')

    log(`Response code: ${statusCode.data}`)
    log(`Effective URL: ${effectiveUrl.data}`)

    easy.close()
  } catch (error) {
    log(`Error in runConcurrentTest: ${error.message}`)
    throw error
  }
}

async function runMultiTest(nodeLibcurl, log) {
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

    // await new Promise((res) => setTimeout(res, 10000))
    await innerPromise

    log(`Performed request!`)

    multi.close()
  } catch (error) {
    log(`Error in runMultiTest: ${error.message}`)
    console.error(error)
    throw error
  }
}

async function runShareTest(nodeLibcurl, log) {
  try {
    log('Testing Share objects...')

    // Create share object for cookies
    const share = new nodeLibcurl.Share()
    share.setOpt('SHARE', 2) // CURL_LOCK_DATA_COOKIE

    // Create two Easy handles that will share cookies
    const easy1 = new nodeLibcurl.Easy()
    const easy2 = new nodeLibcurl.Easy()

    easy1.setOpt('URL', 'https://httpbin.org/cookies/set/test/worker-thread')
    easy1.setOpt('SHARE', share)
    easy1.perform()

    log('First request completed (set cookie)')

    easy2.setOpt('URL', 'https://httpbin.org/cookies')
    easy2.setOpt('SHARE', share)

    // Use default write behavior for now

    easy2.perform()

    log('Second request completed (should have cookie)')
    log('✅ Cookie sharing test completed (response written to default output)')

    easy1.close()
    easy2.close()
    share.close()
    log('Share test completed')
  } catch (error) {
    log(`Error in runShareTest: ${error.message}`)
    throw error
  }
}

async function runWorkerTest(workerName, testData = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: { testName: workerName, ...testData },
    })

    let output = ''

    worker.on('message', (data) => {
      if (data.type === 'log') {
        output += data.message + '\n'
        console.log(`[nodejs ${workerName}] ${data.message}`)
      }
    })

    worker.on('error', (error) => {
      reject(new Error(`Worker ${workerName} error: ${error.message}`))
    })

    worker.on('exit', (code) => {
      if (code === 0) {
        resolve({ workerName, success: true, output })
      } else {
        reject(new Error(`Worker ${workerName} exited with code ${code}`))
      }
    })
  })
}

async function main() {
  try {
    // Test 1: Basic functionality test in worker
    console.log('Test 1: Basic functionality in worker thread')
    await runWorkerTest('basic-test')

    // Test 2: Single worker with HTTP request to avoid complexity
    console.log('\nTest 2: Single worker with HTTP request')
    await Promise.all([
      runWorkerTest('concurrent-1', { url: 'https://httpbin.org/json' }),
      runWorkerTest('concurrent-2', { url: 'https://httpbin.org/json' }),
      runWorkerTest('concurrent-3', { url: 'https://httpbin.org/json' }),
    ])

    // Test 3: Worker with Multi interface
    console.log('\nTest 3: Multi interface in worker thread')
    await runWorkerTest('multi-test')

    // Test 4: Share objects between operations in worker
    console.log('\nTest 4: Share objects in worker thread')
    await runWorkerTest('share-test')

    console.log('\n✅ All worker thread tests completed successfully!')
  } catch (error) {
    console.error('\n❌ Worker thread test failed:', error.message)
    process.exit(1)
  }
}

const logMainThread = (message) => {
  console.log(
    `[nodejs main] [thread: ${nodeLibcurl.Curl.THREAD_ID}] ${message}`,
  )
}

if (isMainThread) {
  logMainThread('🚀 Starting N-API Worker Thread Tests\n')

  main()
} else {
  workerMain()
}
