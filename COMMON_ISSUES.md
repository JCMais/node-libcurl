## Error: SSL peer certificate or SSH remote key was not Ok

You need to set either [`CAINFO`](https://curl.haxx.se/libcurl/c/CURLOPT_CAINFO.html) or [`CAPATH`](https://curl.haxx.se/libcurl/c/CURLOPT_CAPATH.html) options, or disable SSL verification with [`SSL_VERIFYPEER`](https://curl.haxx.se/libcurl/c/CURLOPT_SSL_VERIFYPEER.html) which is not recommended.

The certificate file can be obtained in multiple ways:
1. Downloaded from https://curl.haxx.se/docs/caextract.html
2. Creating a file with the contents of `tls.rootCertificates`, which was added with Node.js `v12.3.0`
