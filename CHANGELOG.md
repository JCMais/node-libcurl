Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Breaking Change
- Dropped support for Node.js 4
- Curl.reset now correctly resets their instance (#141)
### Added
- add missing CURLOPT_FTP_FILEMETHOD (#148)
- Errors thrown inside callbacks are correctly caught / passed forward (if using multi interface)
### Changed
- fix condition for custom handler for Curl.option.HEADERFUNCTION (#142)
- mac libs should be linked against @rpath (#145)
### Removed

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
