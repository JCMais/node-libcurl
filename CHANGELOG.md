# Changelog
All notable changes to this project will be documented in this file.  
  
The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking Change  
### Fixed  
### Added  
### Changed  
### Removed  

## [4.0.0]

### Breaking Change  
- Mininum supported Node.js version is now Node.js 16.14.
- The prebuilt binaries are only available on:
  - Node.js 18, 20, and 21
  - Electron 27, 27, and 28
- NW.js binaries were removed, and may be re-introduced in the future.

## [3.0.0] - 2022-11-17

### Breaking Change  
- The supported engines of Node.js were bumped to: `^14.14 || >=16`.
- The supported versions of Electron now are: `v21`, `v20`, `v19`, `v18`, and `v17`.
- The node-gyp package has been bumped, which means Python 3.0 is now required to build from source.
- Minimum c++ version your compiler needs to support is now `c++17`.
- The minimum macOS version is now Big Sur (11.6)
- The prebuilt binaries on glibc Linux are now built on Ubuntu 20.04.
- The prebuilt binaries on musl Linux (Alpine) are now built on Alpine 3.16.
- The prebuilt binaries on Windows are now built with Visual Studio 2019.
- There are no prebuilt binaries for NW.js anymore. This is because nw-gyp does not support Python 3 currently.
- Option types for `CURLOPT_FTP_RESPONSE_TIMEOUT` has been removed, since libcurl 7.20 it was the same as `CURLOPT_SERVER_RESPONSE_TIMEOUT`.

### Added  
- Add support for the following options:
  - [`PREREQFUNCTION`](https://curl.haxx.se/libcurl/c/CURLOPT_MAIL_RCPT_ALLLOWFAILS)
  - [`MAXLIFETIME_CONN`](https://curl.haxx.se/libcurl/c/CURLOPT_MAXLIFETIME_CONN)
  - [`PROTOCOLS_STR`](https://curl.haxx.se/libcurl/c/CURLOPT_PROTOCOLS_STR)
  - [`REDIR_PROTOCOLS_STR`](https://curl.haxx.se/libcurl/c/CURLOPT_REDIR_PROTOCOLS_STR)
- Add support for the following info options:
  - [`CAINFO`](https://curl.se/libcurl/c/CURLINFO_CAINFO.html)
  - [`CAPATH`](https://curl.se/libcurl/c/CURLINFO_CAPATH.html)

### Changed  
- Upgraded prebuild binaries to use libcurl 7.86.0. On Windows, OpenSSL 3.0.7 will be used.

## [2.3.4] - 2022-01-29

### Added
- support `curl_blob` options [#300](https://github.com/JCMais/node-libcurl/issues/300) by @johnwchadwick 
- added arm64 builds for macOS [#312](https://github.com/JCMais/node-libcurl/issues/312) by @johnwchadwick 
- added most options that were missing up xto libcurl version 7.79.1, including HSTS support.
- added prebuilt binaries for Node.js v17.

### Changed
- Upgraded prebuild binaries to use libcurl 7.79.1. On Windows, OpenSSL 3.0.0 will be used.
- The **only** Electron versions with prebuilt binaries are: `16`, `15`, `14`, `13`, `12`, and `11`.
- The **only** Nwjs versions with prebuilt binaries are: `0.58`, `0.57`, and `0.56`.

## [2.3.3] - 2021-05-09
### Fixed
- Fix support for Node.js v16

## [2.3.2] - 2021-03-24

### Changed
- The prebuilt binaries are not build with c-ares anymore, for reasoning see issue [#280](https://github.com/JCMais/node-libcurl/issues/280).
  c-ares was included in the prebuilt binaries starting with `2.3.0`.

## [2.3.1] - 2021-03-09

The yes, `curly` is still experimental release. 😅

If you are using `curly` in your project, and you want to share any feedback about it, please [post them in our Discord](https://discord.io/jonathancardoso). I would love to read and discuss it!

### Fixed
- Fixed not building zstd lib statically. [#274](https://github.com/JCMais/node-libcurl/issues/274)
- Fixed download streams not working with responses that did not include a body. [#271](https://github.com/JCMais/node-libcurl/issues/271)
 
### Added
- Added prebuilt binaries for: Node.js 15, Electron v11, Electron v12, Nwjs 0.49.2, Nwjs 0.51.2, and Nwjs 0.52.0.

### Changed
- Building the addon from source now requires a C++ compiler with support for c++1z (c++17).

### Removed
- Removed prebuilt binaries for: Node.js 10, Electron v5, Electron v6, Electron v7, Nwjs v0.43, and Nwjs v0.44.

## [2.3.0] - 2020-11-15

Probably the last release that `curly` is considered experimental.

### Breaking Change
- `curly` (and `curly.<method>`) is now able to automatically parse the response body based on the content-type header of the response. [#240](https://github.com/JCMais/node-libcurl/issues/240)  
  Default parsers for `application/json` (calls `JSON.parse`) and `text/*` (converts the raw `Buffer` to a string with `utf8` encoding) were added. This means that for responses without a matching content-type the raw `Buffer` will be returned. This is different from the previous behavior where a string would always be returned.
  The default parsers can be overwritten by setting `curly.defaultResponseBodyParsers` to an object with the format:
  ```
  {
    'content-type': (data: Buffer, headers: HeaderInfo[]) => any
  }
  ```
  Where `content-type` can be one of these:
  - the exact content-type.
  - a pattern using `*` to match specific parts of the content-type, like `text/*`.
  - a catch-all pattern: just `*`.

  You can also override the parsers using the following options:
  - `curlyResponseBodyParsers` object that will be merged with `defaultResponseBodyParsers`.
  - `curlyResponseBodyParser` a parser that will be used for all responses.

  It's also possible to set `curlyResponseBodyParser` to `false` and the data returned will always be the raw `Buffer`.

  Of course, it is still possible to use your own `writeFunction` (libcurl `CURLOPT_WRITEFUNCTION` option) to set your own write callback and not rely on this default handling of the response.


As `curly` is marked as experimental, this allows us to do a breaking change in a minor version bump. This release should make the curly API more stable and provide a better developer experience, however, the API remains experimental.

### Fixed
- Some `curly.<method>` calls not working correctly, to be more specific, all calls that were not `get`, `post` and `head`.
- Errors thrown by the internal `Curl` instance used by `curly` not being re-thrown correctly.
- Progress callbacks were not allowing to use default libcurl progress meter (by returning `CurlProgressFunc.Continue`).
  
### Added
- Calling `curly.create(options)` will now return a new `curly` object that will use the passed `options` as defaults. [#247](https://github.com/JCMais/node-libcurl/issues/247)
- TypeScript: `curly` (and `curly.<method>`) now accepts a generic type parameter which will be the type of the `data` returned. By default, this is set to `any`.
- Added new options to the `curly` API:
  - `curlyBaseUrl: string`, if set, their value will always be added as the prefix for the URL.
  - `curlyLowerCaseHeaders: boolean`, if set to true, headers will be returned in lower case. Defaults to false. [#240](https://github.com/JCMais/node-libcurl/issues/240)
- Added new methods and `CurlFeature` allowing the use of streams to upload and download data without having to set `WRITEFUNCTION` and/or `READFUNCTION` manually. [#237](https://github.com/JCMais/node-libcurl/issues/237)
  - `Curl.setUploadStream`
  - `Curl.setStreamProgress`
  - `Curl.setStreamResponseHighWaterMark`
  - `CurlFeature.StreamResponse`  
  New options were also added to the `curly` API:
  - `curlyProgressCallback`
  - `curlyStreamResponse`
  - `curlyStreamResponseHighWaterMark`
  - `curlyStreamUpload`  
  These new features related to streams are only reliable when using a libcurl version >= 7.69.1.
- Support libcurl info `CURLINFO_CERTINFO`. Can be retrieved using `getInfo("CERTINFO")`. Thanks to [@Sergey-Mityukov](https://github.com/Sergey-Mityukov) for most of the work on this.
- Support libcurl info `CURLINFO_EFFECTIVE_METHOD`. Requires libcurl >= 7.72.0.
- Support libcurl info `CURLINFO_PROXY_ERROR`. Use `CurlPx` for constants. Requires libcurl >= 7.73.0.
- Support libcurl option `CURLOPT_SSL_EC_CURVES`. Requires libcurl >= 7.73.0.
- Added prebuilt binaries for Electron v10.1
- The libcurl version being used by prebuilt binaries is now 7.73.0 and it's now built with c-ares.
  
### Changed
- `curly` now has 100% code coverage.

### Removed
- Removed prebuilt binaries for: Electron v3, Electron v4, Nwjs v0.42, and Nwjs v0.43

## [2.2.0] - 2020-07-14
### Fixed
- Fix `curly.get` not working correctly ([#230](https://github.com/JCMais/node-libcurl/pull/230))
- Fix not resetting `CURLOPT_TRAILERDATA` when duplicating an `Easy` instance (7bf3a51)
### Added
- Added initial support to the `CURLMOPT_PUSHFUNCTION` libcurl multi option. ([#232](https://github.com/JCMais/node-libcurl/issues/232)) (b8d0fac)
- Added `private` member to the `EasyNativeBinding` typescript class, you can set this value on the `Easy` instances to anything, and Typescript should not complain.
- Adde prebuilt binaries for Electron v9
### Changed
- Improved Typescript types / documentation for some libcurl options. (63a71b7)

## [2.1.3] - 2020-06-02
### Fixed
- `v2.1.2` had a caching issue on during the dist files generation, which caused it to not build some required files.

## [2.1.2] - 2020-06-01
### Fixed  
- Fix `curly.post` and `curly.head` using wrong libcurl options to set the HTTP Method.
- Fix `postinstall` script not working properly.
- Setting the `HTTPPOST` option to `null`would, wrongly, throw an Error.
- Setting any string option to `null` would, wrongly, throw an Error.
### Added
- We now have API docs! 🥳 http://jcmais.github.io/node-libcurl/modules/_index_.html
  Thanks to [typedoc](https://typedoc.org/)
- Added back prebuilt binaries for:
  - Electron v3, v4 and v5
- Added `isMonitoringSockets` boolean readonly property to `Easy` instances, it is `true`
    when `monitorSocketEvents` has been called on that `Easy` instance.
- Added `CurlVersion` enum to be used with the `rawFeatures` property returned from `Curl.getVersionInfo`.

## [2.1.1] - 2020-04-28
### Fixed  
- Remove `benchmark` folder from the distributed npm package (reducing the package size)

## [2.1.0] - 2020-04-12
### Fixed
- Fix retrieve-win-deps Windows build script not working correctly
- Fix context switches between addon callbacks not causing Node.js to drain microtasks - ([#177](https://github.com/JCMais/node-libcurl/issues/204))
- Fix some curl_off_t getinfo values corrupting the stack
- `WRITEFUNCTION`, `HEADERFUNCTION` and `READFUNCTION` callbacks now correctly rethrow JS errors thrown inside of them.
  The return value of both callbacks is now also checked to be an integer, any other type will cause an error.
  This is considered a fix because previously the return value was being cast to an integer, which means the method would already fail, as there are remote chances (aka impossible) casting something else to an integer would yield the length of the data passed by libcurl.

### Added
- Added missing [`CURLOPT_SASL_AUTHZID`](https://curl.haxx.se/libcurl/c/CURLOPT_SASL_AUTHZID.html) option - libcurl 7.66.0
- Added missing `CURLE_AUTH_ERROR` error code added with libcurl 7.66.0
- Added missing [`CURLINFO_RETRY_AFTER`](https://curl.haxx.se/libcurl/c/CURLINFO_RETRY_AFTER.html) info field - libcurl 7.66.0
- Added missing `CURL_HTTP_VERSION_3` constant related http version to the `CurlHttpVersion` enum - libcurl 7.66.0
- Added missing [`CURLMOPT_MAX_CONCURRENT_STREAMS`](https://curl.haxx.se/libcurl/c/CURLMOPT_MAX_CONCURRENT_STREAMS.html) option - libcurl 7.67.0
- Added missing `CurlProgressFunc` enum to reflect the new `CURL_PROGRESSFUNC_CONTINUE` constant - libcurl 7.68.0
- Added missing `CurlSslOpt` enum member `NoPartialChain` - libcurl 7.68.0
- Added missing `CURLE_HTTP3` error code - An HTTP/3 layer problem - libcurl 7.68.0
- Added missing `CURLM_WAKEUP_FAILURE` error code - wakeup is unavailable or failed - libcurl 7.68.0
- Added missing `CURLM_BAD_FUNCTION_ARGUMENT` error code - function called with a bad parameter - libcurl 7.69.0
- Added missing `CURLE_QUIC_CONNECT_ERROR` error code - QUIC connection error - libcurl 7.69.0
- Added missing [`CURLOPT_MAIL_RCPT_ALLLOWFAILS`](https://curl.haxx.se/libcurl/c/CURLOPT_MAIL_RCPT_ALLLOWFAILS) option - libcurl 7.69.0

### Changed
- Prebuilt binaries are now compiled with libcurl 7.69.1 and, when possible, latest version of other related dependencies:
  - OpenSSL 1.1.1d
  - nghttp2 1.4.0
  - libssh2 1.9.0
- Added prebuilt binaries for:
  - Electron v8
  - NW.js v0.44, v0.43 and v0.42
- Dropped prebuilt binaries for:
  - Node.js 8
  - Electron v3, v4 and v5
  - NW.js v0.38 and v0.39
- Remove dynamic require ([#204](https://github.com/JCMais/node-libcurl/issues/204))
- The C++ implementation for the previously removed `onData` and `onHeader` Curl/Easy instance fields has been removed - If you were still using those internal fields your code is going to break. Use `WRITEFUNCTION`  and `HEADERFUNCTION` options instead.

## [2.0.3] - 2019-12-11
### Fixed
- Updated return type of DEBUGFUNCTION ([#202](https://github.com/JCMais/node-libcurl/issues/202))
- Fixed issues when building with newer versions of v8 (Node.js >= 13 and Electron >= 7) ([#203](https://github.com/JCMais/node-libcurl/issues/203))

### Added
- Type for `this` added to event listeners callbacks
- Build on Node.js 13 and Electron 7

## [2.0.2] - 2019-09-20
### Added
- Build on Electron v6
### Changed
- Improved build scripts
- bump libssh2 to 1.9.0

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
   `CURLMCode`  -> `CurlMultiCode`  
   `CURLcode`   -> `CurlCode`  
   `CURLSHCode` -> `CurlShareCode`  
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

[Unreleased]: https://github.com/JCMais/node-libcurl/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/JCMais/node-libcurl/compare/v2.3.4...v3.0.0
[2.3.4]: https://github.com/JCMais/node-libcurl/compare/v2.3.3...v2.3.4
[2.3.3]: https://github.com/JCMais/node-libcurl/compare/v2.3.2...v2.3.3
[2.3.2]: https://github.com/JCMais/node-libcurl/compare/v2.3.1...v2.3.2
[2.3.1]: https://github.com/JCMais/node-libcurl/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/JCMais/node-libcurl/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/JCMais/node-libcurl/compare/v2.1.3...v2.2.0
[2.1.3]: https://github.com/JCMais/node-libcurl/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/JCMais/node-libcurl/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/JCMais/node-libcurl/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/JCMais/node-libcurl/compare/v2.0.3...v2.1.0
[2.0.3]: https://github.com/JCMais/node-libcurl/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/JCMais/node-libcurl/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/JCMais/node-libcurl/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/JCMais/node-libcurl/compare/v1.3.3...v2.0.0
[1.3.3]: https://github.com/JCMais/node-libcurl/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/JCMais/node-libcurl/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/JCMais/node-libcurl/compare/v1.2.0...v1.3.1
[1.2.0]: https://github.com/JCMais/node-libcurl/compare/v1.1.0...v1.2.0
