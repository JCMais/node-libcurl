/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to use the Multi handle to make async requests.
 */
const Easy = require('../lib/Easy')
const Multi = require('../lib/Multi')

const urls = [
  'http://google.com',
  'http://bing.com',
  'http://msn.com',
  'http://ask.com/',
]

const multi = new Multi()
const handles = []
const handlesData = []

let finished = 0

multi.onMessage((error, handle, errorCode) => {
  const responseCode = handle.getInfo('RESPONSE_CODE').data

  const handleData = handlesData[handles.indexOf(handle)]
  const handleUrl = urls[handles.indexOf(handle)]

  let responseData = null

  console.log('# of handles active: ' + multi.getCount())

  if (error) {
    console.log(
      handleUrl +
        ' returned error: "' +
        error.message +
        '" with errcode: ' +
        errorCode,
    )
  } else {
    for (let i = 0; i < handleData.length; i++) {
      responseData += handleData[i].toString()
    }

    console.log(handleUrl + ' returned response code: ' + responseCode)
    console.log(
      handleUrl + ' returned response body length: ' + responseData.length,
    )
  }

  multi.removeHandle(handle)
  handle.close()

  if (++finished === urls.length) {
    console.log('Finished all requests!')
    multi.close()
  }
})

/**
 * @param {Buffer} data
 * @param {Number} n
 * @param {Number} nmemb
 * @returns {number}
 */
function onData(data, n, nmemb) {
  //this === the handle
  const key = handles.indexOf(this)

  handlesData[key].push(data)

  return n * nmemb
}

for (let i = 0; i < urls.length; i++) {
  const handle = new Easy()
  handle.setOpt('URL', urls[i])
  handle.setOpt('FOLLOWLOCATION', true)
  handle.setOpt('WRITEFUNCTION', onData)

  handlesData.push([])
  handles.push(handle)

  multi.addHandle(handle)
}
