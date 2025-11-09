import tls from 'node:tls'
import { CurlEasyError } from './CurlEasyError'
import { CurlMultiError } from './CurlMultiError'
import { CurlSharedError } from './CurlSharedError'
// this is ugly, but required so we can easily access these modules from C++
// order is important here
;(globalThis as any).__libcurlTls = tls
;(globalThis as any).__libcurlCurlEasyError = CurlEasyError
;(globalThis as any).__libcurlCurlMultiError = CurlMultiError
;(globalThis as any).__libcurlCurlSharedError = CurlSharedError
require('../lib/binding/node_libcurl.node')
delete (globalThis as any).__libcurlTls
delete (globalThis as any).__libcurlCurlEasyError
delete (globalThis as any).__libcurlCurlMultiError
delete (globalThis as any).__libcurlCurlSharedError
