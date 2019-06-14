Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased Changes
### Breaking Change

### Fixed

### Added

### Changed

## [2.0.1] - 2019-06-06
### Fixed
- Fixed problem when building with libcurl <= 7.38

## [2.0.0] - 2019-06-02
### Breaking Change
- Dropped support for Node.js 4 and 6
- Prebuilt binary is now statically built with brotli, libssh2, nghttp2, OpenSSL and zlib. brotli, OpenSSL, nghttp2 and zlib versions match their respective versions used by Node.js.
- The minimum libcurl version being tested is now `7.50.0`, which itself is almost 3 years old.  
   The addon will still try to be compatible with old versions up to `7.32.0`, but there are no guarantees.
- `Curl.reset` now correctly resets their instance ([#141](https://github.com/JCMais/node-libcurl/pull/141))
- Previously `Curl.code` had all Curl codes into a single enum like object, that is, it included properties for each `CURLMCode`, `CURLcode` and `CURLSHcode` libcurl enums.  
  Now they are separated, each on their own object:  
   `CURLMCode  -> Multi.code`  
   `CURLcode`   -> `Curl.code`  
   `CURLSHCode` -> `Share.code`  
- `DEBUGFUNCTION` now receives a `Buffer` as the `data` argument, instead of a `string`.
- `Easy.send` and `Easy.recv` now return an object, `{ code: CurlCode, bytesSent: number }` and `{ code: CurlCode, bytesReceived: number }` respectively.
- `Curl` class: removed `_` prefix from their private members.  
  Only a breaking change in case you were using internal methods.
- `Curl` class: methods `onData` and `onHeader` renamed to `defaultWriteFunction` and `defaultHeaderFunction`.  
  Only a breaking change in case you were using internal methods.
- `Curl` class: deprecated instance fields `onData` and `onHeader` were removed.  
  Use options `WRITEFUNCTION` and `HEADERFUNCTION` respectively.
- `Curl.dupHandle`, argument `shouldCopyCallbacks` was removed, it was the first one.  
  This is not needed anymore because the previously set callbacks (`onData` and `onHeader`) can now only be set using their respective libcurl options, which is always copied when duplicating a handle.
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
  `Easy.socket` -> `SocketState`  
  And their fields were changed from `SNAKE_CASE` to `PascalCase`.  
  The change in casing was to follow Typescript's Enum naming convention.
- `Curl.protocol` also moved to their own export `CurlProtocol`, no changes were made to fields casing in this case.
- Passing non-integer option value to `Multi.setOpt` will now throw an error.  
  Previously the value was converted to `1` if it was a truthy value, or `0` if otherwise. 
### Fixed
- Fix SigAbort caused by calling v8 `AsFunction` on null value at `Easy::SetOpt`
- Fix SegFault during gargage collection after `process.exit` ([#165](https://github.com/JCMais/node-libcurl/issues/165))
- Using `curl_socket_t` without libcurl version guard on `Easy::GetInfo`
### Added
- Support Node.js 12
- Added missing options:
  - `CURLOPT_DISALLOW_USERNAME_IN_URL`
  - `CURLOPT_DNS_SHUFFLE_ADDRESSES`
  - `CURLOPT_DOH_URL`
  - `CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS`
  - `CURLOPT_HAPROXYPROTOCOL`
  - `CURLOPT_HTTP09_ALLOWED`
  - `CURLOPT_REQUEST_TARGET`
  - `CURLOPT_FTP_FILEMETHOD` ([#148](https://github.com/JCMais/node-libcurl/pull/148))
  - `CURLOPT_MAXAGE_CONN`
  - `CURLOPT_PROXY_*`
  - `CURLOPT_RTSPHEADER`
  - `CURLOPT_RTSP_REQUEST`
  - `CURLOPT_SOCKS5_AUTH`
  - `CURLOPT_SSH_COMPRESSION`
  - `CURLOPT_TLS13_CIPHERS`
  - `CURLOPT_TIMEVALUE_LARGE`
  - `CURLOPT_TRAILERFUNCTION`
  - `CURLOPT_UPKEEP_INTERVAL_MS`
- Add missing info fields: 
  - `CURLINFO_*_{DOWNLOAD,UPLOAD}_T`
  - `CURLINFO_*_TIME_T`
  - `CURLINFO_FILETIME_T`
- Add `Curl.getVersionInfo()` which returns an object that represents the struct returned from `curl_version_info()`.  
  See their type definition for details: [`./lib/types/CurlVersionInfoNativeBinding.ts`](./lib/types/
- Add `Curl.getVersionInfoString()` which returns a string representation of the above function.  
  It should be almost identical to the one returned from `curl -V`.
- Add `Curl.isVersionGreaterOrEqualThan(x, y, z)` to help test if the libcurl version the addon was built against is greater or equal than x.y.z.
- Add `upkeep` function to Easy and Curl classes. This is a binding for the `curl_easy_upkeep()` function.
- Errors thrown inside callbacks are correctly caught / passed forward (if using multi interface)
- All `Curl` instances now set their `USERAGENT` to `node-libcurl/${packageVersion}` during creation.  
  You change the default user agent string by changing `Curl.defaultUserAgent`, and disable it by setting their value to null.
- `CurlWriteFunc` and `CurlReadFunc` enums with special return codes for their respective options, `WRITEFUNCTION` and `READFUNCTION`.
- Added **experimental** `curly(url: string, options: {})` / `curly.<http-verb>(url: string, options: {})` async api.  
  This API can change between minor releases.
### Changed
- Migrated project to Typescript and added type definitions
- Bumped libcurl version used on Windows to `7.64.1`, which has `nghttp2` support
- Added the `Curl` instance that emitted the event as the last param passed to events, can be useful if using anonymous functions as callback for the events.
  Example:
  ```javascript
    // ...
    curl.on('end', (statusCode, data, headers, curlInstance) => {
       // ...
    })
  ```
- Fix erratic condition when setting option `HEADERFUNCTION` ([#142](https://github.com/JCMais/node-libcurl/pull/142))
- macOS libs should be linked against @rpath ([#145](https://github.com/JCMais/node-libcurl/pull/145))


Special Thanks to [@koskokos2](https://github.com/koskokos2) for their contributions to this release.

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
