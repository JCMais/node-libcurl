/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 * This script does a stress test on the given domain.
 * Don't put a real domain here if you don't want to be blocked by some DDOS Protection.
 */

const path = require('path')
const Curl = require('../lib/Curl')

const url = 'http://127.0.0.1:8080'
const file = 'file:///' + path.join(__dirname, 'test.txt')

// 25 instances running at max per iteration
const instances = 25
// 10000 requests in total per iteration
const maxRequests = 1e4
// repeat n times to collect data
const iterations = 3

const precision = 3

const shouldTestFile = false
const shouldUseHeaderRequest = true

const requestData = []
const timeBetweenStdouWrite = 1000

let finishedRequests = 0
let runningRequests = 0
let currentIteration = 0
let lastTimeStdoutWrite = 0

function doRequest(data) {
  const curl = new Curl()
  curl.setOpt(Curl.option.URL, shouldTestFile ? file : url)
  curl.setOpt(Curl.option.NOBODY, shouldUseHeaderRequest)
  curl.setOpt(Curl.option.CONNECTTIMEOUT, 5)
  curl.setOpt(Curl.option.TIMEOUT, 10)
  curl.on('end', cb.bind(curl))
  curl.on('error', cb.bind(curl))

  curl.data = data

  curl.perform()
  ++runningRequests
}

function cb(code) {
  const { data } = this
  const now = Date.now()

  let shouldWrite = false

  if (now - lastTimeStdoutWrite >= timeBetweenStdouWrite) {
    shouldWrite = true
    lastTimeStdoutWrite = now
  }

  this.close()

  if (code instanceof Error) {
    ++data.errors
  }

  --runningRequests
  ++finishedRequests

  if (finishedRequests + runningRequests < maxRequests) {
    doRequest(data)
  }

  if (shouldWrite) {
    console.info(
      'Curl instances: ',
      Curl.getCount(),
      ' -> Requests finished: ',
      finishedRequests,
      ' -> Time: ',
      process.hrtime(data.startTime)[0],
      's',
    )
  }

  if (runningRequests === 0) {
    //nano to milli
    data.endTime = process.hrtime(data.startTime)

    console.info(
      'Request time: ',
      data.endTime[0] +
        's, ' +
        (data.endTime[1] / 1e9).toFixed(precision) +
        'ms',
    )

    process.nextTick(startRequests)
  }
}

function startRequests() {
  if (currentIteration == iterations) {
    return printCollectedData()
  }

  console.log('Iteration -> ', currentIteration + 1)

  finishedRequests = 0
  runningRequests = 0

  if (requestData[currentIteration] === undefined) {
    requestData[currentIteration] = {
      errors: 0,
      startTime: process.hrtime(),
      endTime: 0,
    }
  }

  for (let i = 0; i < instances; i++) {
    doRequest(requestData[currentIteration])
  }

  return currentIteration++
}

function printCollectedData() {
  //Sum all timings
  const timingSumNs = requestData.reduce((prev, curr) => {
    const currTimingNs = curr.endTime[0] * 1e9 + curr.endTime[1]

    return prev + currTimingNs
  }, 0)

  const errors = requestData.reduce((prev, curr) => {
    return prev + curr.errors
  }, 0)

  console.info('Iterations ------------ ', iterations)
  console.info('Requests   ------------ ', maxRequests)
  console.info('Instances  ------------ ', instances)

  console.info('Total Time ------------ ', timingSumNs / 1e9 + 's')
  console.info('Iteration Avg --------- ', timingSumNs / 1e9 / iterations + 's')
  console.info('Errors Avg  ------------ ', errors)
}

console.log('Starting...')
process.nextTick(startRequests)
