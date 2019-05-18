Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Breaking Change
- Dropped support for Node.js 4 and 6
- Prebuilt binary is now built statically with libssh2, nghttp2, OpenSSL and zlib. OpenSSL, nghttp2 and zlib versions match their respective versions used by Node.js.
- The minimum libcurl version being tested is now `7.50.0`, which itself is almost 3 years old.
   The addon will still try to be compatible with old versions up to `7.32.0`, but there are no guarantees.
- `Curl.reset` now correctly resets their instance (#141)
- Previously `Curl.code` had all Curl codes into a single enum like object, that is, it included properties for each `CURLMCode`, `CURLcode` and `CURLSHcode` libcurl enums.
  
  Now they are separated, each on their own object:  
   `CURLMCode`  -> `Multi.code`  
   `CURLcode`   -> `Curl.code`  
   `CURLSHCode` -> `Share.code`  
- `DEBUGFUNCTION` now receives a `Buffer` as the `data` argument, instead of a `string`.
- `Easy.send` and `Easy.recv` now return an object, `{ code: CurlCode, bytesSent: number }` and `{ code: CurlCode, bytesReceived: number }` respectively.
- `_` prefix of `Curl` class private members has been removed, this is only a breaking change in case you were using internal methods.
- Removed deprecated `onData` and `onHeader` instance fields, use options `WRITEFUNCTION` and `HEADERFUNCTION` respectively.
- Prototype functions `onData` and `onHeader` renamed to `defaultWriteFunction` and `defaultHeaderFunction`
- `Curl.dupHandle`, argument `shouldCopyCallbacks` was removed, it was the first one.
- `Curl.multi` moved to `Multi.option`
- `Curl.share` moved to `Share.option`
- Following members were moved to their own export:  
  `Curl.auth` -> `CurlAuth`  
  `Curl.pause` -> `CurlPause`  
  `Curl.http` -> `CurlHttpversion`  
  `Curl.feature` -> `CurlFeature`  
  `Curl.lock` -> `CurlShareLock`  
  `Curl.header` -> `CurlHeader`  
  `Curl.info.debug` -> `CurlInfoDebug`  
  `Curl.netrc` -> `CurlNetrc`  
  `Curl.chunk` -> `CurlChunk`  
  `Curl.filetype` -> `CurlFileType`  
  `Curl.fnmatchfunc` -> `CurlFnMatchFunc`  
  `Curl.ftpauth` -> `CurlFtpAuth`  
  `Curl.ftpssl` -> `CurlFtpSsl`  
  `Curl.ftpmethod` -> `CurlFtpMethod`  
  `Curl.rtspreq` -> `CurlRtspRequest`  
  `Curl.ipresolve` -> `CurlIpResolve`  
  `Curl.proxy` -> `CurlProxy`  
  `Curl.pipe` -> `CurlPipe`  
  `Curl.usessl` -> `CurlUseSsl`  
  `Curl.sslversion` -> `CurlSslVersion`  
  `Curl.sslversion.max` -> `CurlSslVersionMax`  
  `Curl.ssh_auth` -> `CurlSshAuth`  
  `Curl.timecond` -> `CurlTimeCond`  
  And their fields were changed from `SNAKE_CASE` to `PascalCase` (changed to follow Typescript's Enum naming conventions)
- `Curl.protocol` moved to their own export `CurlProtocol`, no changes were made to fields casing in this case.
- Passing non-integer option value to `Multi.setOpt` will now throw an error, previously the value was converted to `1` if it was a truthy value, or `0` if otherwise. 
### Fixed
- Fix SigAbort caused by calling v8 AsFunction on null value at Easy::SetOpt
- Fix SegFault during gargage collection after process.exit (#165)
- Using `curl_socket_t` without libcurl version guard on Easy::GetInfo
### Added
- Support Node.js 12
- Added missing options:
  - `CURLOPT_DNS_SHUFFLE_ADDRESSES`
  - `CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS`
  - `CURLOPT_HAPROXYPROTOCOL`
  - `CURLOPT_REQUEST_TARGET`
  - `CURLOPT_FTP_FILEMETHOD` ([#148](https://github.com/JCMais/node-libcurl/pull/148))
  - `CURLOPT_SSH_COMPRESSION`
  - `CURLOPT_TIMEVALUE_LARGE`
- Add missing info fields: 
  - `CURLINFO_*_{DOWNLOAD,UPLOAD}_T`
  - `CURLINFO_FILETIME_T`
- Add `Curl.getVersionInfo()` which returns an object that represents the struct returned from `curl_version_info()`
  See their type definition for details: [`./lib/types/CurlVersionInfoNativeBinding.ts`](./lib/types/CurlVersionInfoNativeBinding.ts)
- Errors thrown inside callbacks are correctly caught / passed forward (if using multi interface)
- Added **experimental** `curl.<http-verb>()` async api  
  This API can change between minor releases.
### Changed
- Migrated project to Typescript and added type definitions
- Bumped libcurl version used on Windows to `7.64.1`, with `nghttp2` support
- Added the `Curl` instance that emitted the event as the last param passed to events, can be useful if using anonymous functions as callback for the events.
  Example:
  ```javascript
    // ...
    curl.on('end', (statusCode, data, headers, curlInstance) => {
       // ...
    })
  ```
- Fix erratic condition when setting option `HEADERFUNCTION` (#142)
- macOS libs should be linked against @rpath (#145)

## [1.3.3]
### Added
- Node.js 10 on CI and respective prebuilt binaries
### Changed
- Removed deprecated NAN method calls

## [1.3.2] - 2018-05-24
### Fixed
- Curl multi integer options being wrongly tested (#126)

## [1.3.1] - 2018-05-04
### Added
- Changelog file (finally)
### Changed
- Improved code style, started using prettier
## [1.2.0] - 2017-08-28

[Unreleased]: https://github.com/JCMais/compare/v1.3.3...HEAD
[1.3.3]: https://github.com/JCMais/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/JCMais/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/JCMais/compare/v1.2.0...v1.3.1
[1.2.0]: https://github.com/JCMais/compare/v1.1.0...v1.2.0
