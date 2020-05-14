## Error: SSL peer certificate or SSH remote key was not Ok

You need to set either [`CAINFO`](https://curl.haxx.se/libcurl/c/CURLOPT_CAINFO.html) or [`CAPATH`](https://curl.haxx.se/libcurl/c/CURLOPT_CAPATH.html) options, or disable SSL verification with [`SSL_VERIFYPEER`](https://curl.haxx.se/libcurl/c/CURLOPT_SSL_VERIFYPEER.html) (not recommended).

The certificate file can be obtained in multiple ways:

1. Extracted directly from your system/browser
2. Downloaded from https://curl.haxx.se/docs/caextract.html, which is based on the one from Firefox
3. Creating a file with the contents of `tls.rootCertificates`, which was added with Node.js `v12.3.0`, example:
```javascript
const fs = require('fs')
const path = require('path')
const tls = require('tls')

const { curly } = require('node-libcurl')

// important steps
const certFilePath = path.join(__dirname, 'cert.pem')
const tlsData = tls.rootCertificates.join('\n')
fs.writeFileSync(certFilePath, tlsData)

async function run() {
  return curly.post('https://httpbin.org/anything', {
    postFields: JSON.stringify({ a: 'b' }),
    httpHeader: ['Content-type: application/json'],
    caInfo: certFilePath,
    verbose: true,
  })
}

run()
  .then(({ data, statusCode, headers }) =>
    console.log(
      require('util').inspect(
        {
          data: JSON.parse(data),
          statusCode,
          headers,
        },
        null,
        4,
      ),
    ),
  )
  .catch((error) => console.error(`Something went wrong`, { error }))
```
