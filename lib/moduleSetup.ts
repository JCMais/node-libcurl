import tls from 'node:tls'
// this is ugly, but required so we can easily access the tls module from C++
// order is important here
;(globalThis as any).__libcurlTls = tls
require('../lib/binding/node_libcurl.node')
delete (globalThis as any).__libcurlTls
