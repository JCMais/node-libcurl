/* eslint-disable no-inner-declarations */
/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Curl, CurlHsts, Easy } from '../lib'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const MAX_REQUESTS_AT_ONCE = 50
const AMOUNT_ITERATIONS_PER_RUN = 1e4

let instances: Easy[] | Curl[] = []
let iteration = 0

function createAndCloseCurlHandlesTest() {
  let i = 0
  const shouldClose = iteration++ % 2
  const postData = [
    {
      name: 'file',
      file: 'test.img',
      type: 'image/png',
    },
  ]

  return () => {
    if (shouldClose) {
      console.log('Closing handles.')
    } else {
      console.log('Opening handles.')
    }

    while (i++ < AMOUNT_ITERATIONS_PER_RUN) {
      if (shouldClose) {
        const instance = instances.splice(i, 1)
        if (instance) {
          instances[i].close()
        }
      } else {
        const handle = new Easy()
        handle.setOpt('HTTPPOST', postData)
        handle.setOpt(Curl.option.XFERINFOFUNCTION, () => 0)
        instances[i] = handle
      }
    }

    if (global.gc && shouldClose) {
      console.log('Calling garbage collector.')
      global.gc()
    }
  }
}

function createAndPerformAndCloseCurlHandlesMultiTest() {
  let i = AMOUNT_ITERATIONS_PER_RUN
  let toClose: Curl[] = []
  let toPerform: Curl[] = []
  let currentlyPerforming: Curl[] = []
  const postData = [
    {
      name: 'field',
      contents: 'value',
    },
  ]

  const getHstsCache = () => [
    {
      host: 'owasp.org',
      expire: null, // infinite
    },
    {
      host: 'github.com',
      expire: '20350101 00:00:00', // infinite
    },
    {
      host: 'donotcall.gov',
      includeSubdomain: true,
    },
  ]

  return function run() {
    return new Promise<void>((resolve) => {
      while (i--) {
        console.log('creating handler')

        const handle = new Curl()
        handle.setOpt('HTTPPOST', postData)
        handle.setOpt('URL', 'http://127.0.0.1:8080/index.html')
        handle.setOpt('HSTS_CTRL', CurlHsts.Enable)
        handle.setOpt('HSTSREADFUNCTION', () => getHstsCache())
        instances[i] = handle
        toPerform.push(handle)

        function doCleanupIfLastOne() {
          const totalFinished = toClose.length
          const total = instances.length

          if (totalFinished === total) {
            for (const handle of toClose) {
              try {
                handle.close()
              } catch (error) {
                console.error('error while closing handle', error)
              }
            }

            toClose = []
            toPerform = []
            currentlyPerforming = []
            instances = []

            console.log('toClose.length', toClose.length)
            console.log('instances.length', instances.length)
            console.log('toPerform.length', toPerform.length)
            console.log(
              'currentlyPerforming.length',
              currentlyPerforming.length,
            )
            console.log('Calling garbage collector.')
            global.gc()

            resolve()
          }
        }

        handle.on('end', (status, data, headers, handle) => {
          toClose.push(handle)
          console.log('end', status)
          currentlyPerforming.splice(currentlyPerforming.indexOf(handle), 1)
          doPerformIfNeeded()
          doCleanupIfLastOne()
        })

        handle.on('error', (error, code, handle) => {
          toClose.push(handle)
          console.log('error', error?.message || code)
          currentlyPerforming.splice(currentlyPerforming.indexOf(handle), 1)
          doPerformIfNeeded()
          doCleanupIfLastOne()
        })
      }

      function doPerformIfNeeded() {
        const instancesToPerform = toPerform.splice(
          0,
          MAX_REQUESTS_AT_ONCE - currentlyPerforming.length,
        )

        for (const instance of instancesToPerform) {
          instance.perform()
        }
      }

      doPerformIfNeeded()
    })
  }
}

function clearInstances() {
  return async () => {
    const instance = instances.shift()
    while (instance) {
      try {
        instance.close()
        iteration = 0
      } catch (error) {
        /* noop */
      }
    }
  }
}

function loop() {
  rl.question(
    [
      `Type number to proceed, where number is:`,
      `[1]: createAndCloseCurlHandlesTest`,
      `[2]:createAndPerformAndCloseCurlHandlesTest`,
      `[3]:clearInstances`,
      ``,
    ].join('\n'),
    async function (answer) {
      switch (answer) {
        case '1':
          await createAndCloseCurlHandlesTest()()
          break
        case '2':
          await createAndPerformAndCloseCurlHandlesMultiTest()()
          break
        case '3':
        default:
          await clearInstances()()
      }

      process.nextTick(loop)
    },
  )
}

loop()
