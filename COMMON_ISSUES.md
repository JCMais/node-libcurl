## Error: SSL peer certificate or SSH remote key was not Ok

The proper fix to this, is to set one of these options:
- [`CAINFO`](https://curl.haxx.se/libcurl/c/CURLOPT_CAINFO.html)
- [`CAPATH`](https://curl.haxx.se/libcurl/c/CURLOPT_CAPATH.html)
- [`CAINFO_BLOB`](https://curl.haxx.se/libcurl/c/CURLOPT_CAINFO_BLOB.html)

Or you can disable SSL verification with [`SSL_VERIFYPEER`](https://curl.haxx.se/libcurl/c/CURLOPT_SSL_VERIFYPEER.html), but this is not recommended.

Starting with `node-libcurl` v5.0.0, every instance is initialized with default CA certificates from Node.js's tls module, by using the result of the "getCACertificates" function. This is done using `CURLOPT_CAINFO_BLOB`.
