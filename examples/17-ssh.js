/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how one could connect to a ssh server using sftp
 */
const { Curl } = require('../dist')

const host = process.argv[2] || 'sftp://user:pass@host'

const curl = new Curl()

curl.setOpt(Curl.option.URL, host)
curl.setOpt(Curl.option.VERBOSE, true)
curl.setOpt(Curl.option.SSH_AUTH_TYPES, Curl.ssh_auth.PASSWORD)

curl.setOpt(Curl.option.WRITEFUNCTION, (buf, size, nmemb) => {
  console.log(buf.toString('utf8'))
  return size * nmemb
})

curl.on('end', () => {
  console.log('Finished SFTP session')
  curl.close()
})

curl.on('error', (error) => {
  console.error(error)
  curl.close()
})

curl.perform()
