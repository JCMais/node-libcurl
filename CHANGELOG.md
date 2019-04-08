Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Breaking Change
- Prebuilt binary is now built statically with libssh2, nghttp2, OpenSSL and zlib. OpenSSL, nghttp2 and zlib versions match their respective versions used by Node.js.
- Dropped support for Node.js 4 and 6
- The minimum libcurl version being tested is now 7.50.0, which itself is almost 3 years old.
   The addon will still try to be compilable with old versions up to 7_32_0, but there are no guarantees.
- `Curl.reset` now correctly resets their instance (#141)
### Fixed
- Fix SigAbort caused by calling v8 AsFunction on null value at Easy::SetOpt
- Fix SegFault during gargage collection after process.exit (#165)
### Added
- Add missing CURLOPT_FTP_FILEMETHOD (#148)
- Errors thrown inside callbacks are correctly caught / passed forward (if using multi interface)
- Added **experimental** `curl.<http-verb>()` async api
### Changed
- Bumped libcurl version used on Windows to 7.64.1, with nghttp2 support
- Added the curl handle that emitted the event as the last param passed to the evt, can be useful if using general anonymous functions as callback.
- Fix condition for custom handler for Curl.option.HEADERFUNCTION (#142)
- macOS libs should be linked against @rpath (#145)
- Internally the code has been refactored and put back into the future, it was stuck in 2015

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
