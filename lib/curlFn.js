const http = require('http')

const {
  allowedOptions,
  allowedOptionsCamelCaseMap,
} = require('./generated/options')

const Curl = require('./Curl')

const create = () => {
  function curl(url, options = {}) {
    let setOptCalls = [['URL', url]]

    for (const [key, value] of Object.entries(options)) {
      setOptCalls = [
        ...setOptCalls,
        [allowedOptionsCamelCaseMap[key] || key, value],
      ]
    }

    return new Promise((resolve, reject) => {
      const curlHandle = new Curl()

      try {
        for (const setOptCall of setOptCalls) {
          curlHandle.setOpt.apply(curlHandle, setOptCall)
        }

        curlHandle.on('end', (statusCode, data, headers) => {
          curlHandle.close()
          resolve({
            statusCode,
            data,
            headers,
          })
        })

        curlHandle.on('error', (error, errorCode) => {
          curlHandle.close()
          error.code = errorCode
          reject(error)
        })

        curlHandle.perform()
      } catch (error) {
        curlHandle.close()
        reject(error)
      }
    })
  }

  return curl
}

const curl = create()

curl.create = create

for (const httpMethod of http.METHODS) {
  const lowerCaseHttpMethod = httpMethod.toLowerCase()
  curl[lowerCaseHttpMethod] =
    lowerCaseHttpMethod === 'get'
      ? curl
      : (url, options = {}) =>
          curl(url, {
            customRequest: httpMethod,
            ...options,
          })
}

module.exports = curl
