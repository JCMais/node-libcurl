# node-libcurl<!-- omit in toc -->

<a href="https://www.patreon.com/bePatron?u=19985213" data-patreon-widget-type="become-patron-button">
  <img src="https://c5.patreon.com/external/logo/become_a_patron_button@2x.png" width="160">
</a>
<br>

[![NPM version][npm-image]][npm-url]
[![node][node-image]][node-url]
[![license][license-image]][license-url]

[![Travis CI Status][travis-image]][travis-url]
[![AppVeyor CI Status][appveyor-image]][appveyor-url]
[![Code Quality][codeclimate-image]][codeclimate-url]
[![Dependencies][deps-image]][deps-url]

[npm-image]:https://img.shields.io/npm/v/node-libcurl.svg?style=flat-square
[npm-url]:https://www.npmjs.org/package/node-libcurl
[travis-image]:https://img.shields.io/travis/JCMais/node-libcurl/master.svg?style=flat-square
[travis-url]:https://travis-ci.com/JCMais/node-libcurl
[appveyor-image]:https://ci.appveyor.com/api/projects/status/u7ox641jyb6hxrkt/branch/master?svg=true
[appveyor-url]:https://ci.appveyor.com/project/JCMais/node-libcurl
[codeclimate-image]:https://img.shields.io/codeclimate/maintainability/JCMais/node-libcurl?style=flat-square
[codeclimate-url]:https://codeclimate.com/github/JCMais/node-libcurl
[node-image]:https://img.shields.io/badge/node.js-%3E=_4-green.svg?style=flat-square
[node-url]:https://nodejs.org/download/
[license-image]:https://img.shields.io/npm/l/node-libcurl?style=flat-square
[license-url]:https://raw.githubusercontent.com/JCMais/node-libcurl/develop/LICENSE
[deps-image]:https://img.shields.io/david/JCMais/node-libcurl.svg?style=flat-square
[deps-url]:https://david-dm.org/jcmais/node-libcurl

[Libcurl](https://github.com/bagder/curl) bindings for Node.js.
_Based on the work from [jiangmiao/node-curl](https://github.com/jiangmiao/node-curl)._

- [Quick Start](#quick-start)
  - [Install](#install)
  - [Simple Request - Async / Await](#simple-request---async--await)
  - [Simple Request](#simple-request)
    - [Setting HTTP headers](#setting-http-headers)
  - [MultiPart Upload / HttpPost libcurl Option](#multipart-upload--httppost-libcurl-option)
- [API](#api)
- [Supported Libcurl Versions](#supported-libcurl-versions)
- [Detailed Installation](#detailed-installation)
  - [Important Notes on Prebuilt Binaries / Direct Installation](#important-notes-on-prebuilt-binaries--direct-installation)
    - [Missing Packages](#missing-packages)
  - [Building on Linux](#building-on-linux)
  - [Building on macOS](#building-on-macos)
    - [Xcode &gt;= 10 | macOS Mojave](#xcode-gt-10--macos-mojave)
  - [Building on Windows](#building-on-windows)
  - [Electron / NW.js](#electron--nwjs)
    - [NW.js (aka node-webkit)](#nwjs-aka-node-webkit)
    - [electron (aka atom-shell)](#electron-aka-atom-shell)
- [Getting Help](#getting-help)
- [Contributing](#contributing)
- [Donations / Patreon](#donations--patreon)

## Quick Start

### Install
```shell
npm i node-libcurl --save
```
or
```shell
yarn add node-libcurl
```
### Simple Request - Async / Await
> this API is experimental and is subject to changes without a major version bump

```javascript
const { curly } = require('node-libcurl');

const { statusCode, data, headers } = await curly.get('http://www.google.com')
```

### Simple Request
```javascript
const { Curl } = require('node-libcurl');

const curl = new Curl();

curl.setOpt('URL', 'www.google.com');
curl.setOpt('FOLLOWLOCATION', true);

curl.on('end', function (statusCode, data, headers) {
  console.info(statusCode);
  console.info('---');
  console.info(data.length);
  console.info('---');
  console.info(this.getInfo( 'TOTAL_TIME'));
  
  this.close();
});

curl.on('error', curl.close.bind(curl));
curl.perform();
```

#### Setting HTTP headers

Pass an array of strings specifying headers
```javascript
curl.setOpt(Curl.option.HTTPHEADER,
  ['Content-Type: application/x-amz-json-1.1'])
```

### MultiPart Upload / HttpPost libcurl Option

```javascript
const { Curl } = require('node-libcurl');

const curl = new Curl();
const close = curl.close.bind(curl);

curl.setOpt(Curl.option.URL, '127.0.0.1/upload.php');
curl.setOpt(Curl.option.HTTPPOST, [
    { name: 'input-name', file: '/file/path', type: 'text/html' },
    { name: 'input-name2', contents: 'field-contents' }
]);

curl.on('end', close);
curl.on('error', close);
```

For more examples check the [examples folder](./examples).

## API

The code provides Typescript type definitions, which should document most of the API.

Almost all [CURL options](https://curl.haxx.se/libcurl/c/curl_easy_setopt.html) are supported, if you pass one that is not, an error will be thrown.

For more usage examples check the [examples folder](./examples).

## Supported Libcurl Versions

The addon is only tested against libcurl version `7.50.0` and the latest one available.

The code itself is made to compile with any version greater than `7.32.0`, any libcurl version lower than that is **not** supported.

## Detailed Installation

The latest version of this package has prebuilt binaries (thanks to [node-pre-gyp](https://github.com/mapbox/node-pre-gyp/)) 
 available for:
* node.js: Latest two versions on active LTS (see https://github.com/nodejs/Release)
* electron v5, v4 and v3
* nw.js (node-webkit): Latest two versions
and on the following platforms:
* Linux 64 bits
* Mac OS X 64 bits
* Windows 32 and 64 bits

Installing via `yarn add node-libcurl` or `npm install node-libcurl` should download a prebuilt binary and no compilation will be needed. However if you trying to install on `nw.js` or `electron` additional steps will be required, check their corresponding section on building from source.

The prebuilt binary is statically built with the following library versions, features and protocols:
```
Version: libcurl/7.64.1 OpenSSL/1.1.0j zlib/1.2.11 brotli/1.0.7 libidn2/2.1.1 libssh2/1.8.2 nghttp2/1.34.0
Features: AsynchDNS, IDN, IPv6, Largefile, NTLM, NTLM_WB, SSL, libz, brotli, TLS-SRP, HTTP2, UnixSockets, HTTPS-proxy
Protocols: dict, file, ftp, ftps, gopher, http, https, imap, imaps, ldap, ldaps, pop3, pop3s, rtsp, scp, sftp, smb, smbs, smtp, smtps, telnet, tftp
```

If there is no prebuilt binary available that matches your system, or if the installation fails, then you will need an environment capable of compiling Node.js addons, which means [python 2.7](https://www.python.org/download/releases/2.7) installed and an updated C++ compiler able to compile C++11.

If you don't want to use the prebuilt binary even if it works on your system, you can pass a flag when installing:
> With `npm`
```sh
npm install node-libcurl --build-from-source
```
> With `yarn`
```sh
npm_config_build_from_source=true yarn add node-libcurl
```

### Important Notes on Prebuilt Binaries / Direct Installation

> Those notes are not important when building on Windows

The prebuilt binaries are statically linked with `brotli`, `libidn2`, `libssh2`, `openLDAP`, `OpenSSL` `nghttp2` and `zlib`.

The `brotli`, `nghttp2`, `OpenSSL` and `zlib` versions **must** match the version Node.js uses, this is necessary to avoid any possible issues by mixing library symbols of different versions, since Node.js also exports some of the symbols of their deps.

In case you are building the addon yourself with the libraries mentioned above, you must make sure their version is ABI compatible with the one Node.js uses, otherwise you are probably going to hit a Segmentation Fault.

If you want to build a statically linked version of the addon yourself, you need to pass the `curl_static_build=true` flag when calling install.

> If using `npm`:
```sh
npm install node-libcurl --build-from-source --curl_static_build=true
```
> If using `yarn`:
```sh
npm_config_build_from_source=true npm_config_curl_static_build=true yarn add node-libcurl
```

The build process will use `curl-config` available on path, if you want to overwrite it to your own libcurl installation one, you can set the `curl_config_bin` variable, like mentioned above for `curl_static_build`.

And if you don't want to use `curl-config`, you can pass two extra variables to control the build process:
- `curl_include_dirs`
    Space separated list of directories to search for header files
- `curl_libraries`
    Space separated list of flags to pass to the linker

#### Missing Packages

The statically linked version currently does not have support for `GSS-API`, `SPNEGO`, `KERBEROS`, `RTMP`, `Metalink`, `PSL` and `Alt-svc`.

The scripts to build Kerberos exists on the `./scripts/ci` folder, but it was removed for two reasons:
- If built with Heimdal, the addon becomes too big
- If built with MIT Kerberos, the addon would be bound to their licensing terms.

### Building on Linux

To build the addon on linux based systems you must have:
- gcc >= 4.8
- libcurl dev files
- python 2.7

If you are on a debian based system, you can get those by running:
```bash
sudo apt-get install python libcurl4-openssl-dev build-essential
```

If you don't want to use the libcurl version shipped with your system, since it's probably very old, you can install libcurl from source, for the addon to use that libcurl version you can use the variable mentioned above, `curl_config_bin`.

In case you want some examples check the CI configuration files ([`.travis.yml`](./.travis.yml), [`.circleci/config.yml`](./.circleci/config.yml)) and the [`scripts/ci/`](./scripts/ci) folder.

### Building on macOS

On macOS you must have:
- macOS >= 10.12 (Sierra)
- Xcode Command Line Tools

You can check if you have Xcode Command Line Tools be running:
```sh
xcode-select -p
```

It should return their path, in case it returns nothing, you must install it by running:
```sh
xcode-select --install
```

#### Xcode >= 10 | macOS Mojave
In case you have errors installing the addon from source, and you are using macOS Mojave, check if the error you are receiving is the following one:
```
  CXX(target) Release/obj.target/node_libcurl/src/node_libcurl.o
  clang: error: no such file or directory: '/usr/include'
```

If that is the case, it's because newer versions of the Command Line Tools does not add the `/usr/include` folder by default. Check [Xcode 10 release notes](https://developer.apple.com/documentation/xcode_release_notes/xcode_10_release_notes#3035624) for details.

To fix this you need to install the separated package for the headers file:
```
open /Library/Developer/CommandLineTools/Packages/macOS_SDK_headers_for_macOS_10.14.pkg
```

To ignore the UI and install directly from the command line, use:
```
sudo installer -pkg /Library/Developer/CommandLineTools/Packages/macOS_SDK_headers_for_macOS_10.14.pkg -target /
```

After that you can try to install `node-libcurl` again.

### Building on Windows

If installing using a prebuilt binary you only need to have the [visual c++ 2017 runtime library](https://visualstudio.microsoft.com/downloads/#microsoft-visual-c-redistributable-for-visual-studio-2017).

If building from source, you must have:
- Python 2.7
- [Visual Studio >= 2017](https://visualstudio.microsoft.com/downloads/)
- [nasm](https://www.nasm.us/)

Python 2.7 and the Visual Studio compiler can be installed by running:
```sh
npm install --global --production windows-build-tools
```

`nasm` can be obtained from their website, which is linked above, or using chocolatey:
```
cinst nasm
```

Currently there is no support to use other libcurl version than the one provided by the [curl-for-windows](https://github.com/JCMais/curl-for-windows) submodule (help is appreciated on adding this feature).

An important note about building the addon on Windows is that we have to do some "hacks" with the header files included by `node-gyp`/`nw-gyp`. The reason for that is because as we are using a standalone version of OpenSSL, we don't want to use the OpenSSL headers provided by Node.js, which are by default added to `<nw-gyp-or-node-gyp-folder>/include/node/openssl`, so what we do is that before compilation that folder is renamed to `openssl.disabled`. After a successful installation the folder is renamed back to their original name, **however** if any error happens during compilation the folder will stay renamed until the addon is compiled successfully. More info on why that was needed and some context can be found on issue [#164](https://github.com/JCMais/node-libcurl/issues/164).

### Electron / NW.js

If building for a `Electron` or `NW.js` you need to pass additional parameters to the install command.

If you are trying to use the prebuilt binary (if available), do not pass the `npm_config_build_from_source=true` / `--build-from-source` below.

#### NW.js (aka node-webkit)
For building from source on NW.js you first need to make sure you have nw-gyp installed globally:
`yarn global add nw-gyp` or `npm i -g nw-gyp`

> If on Windows, you also need addition steps, currently the available win_delay_load_hook.cc on `nw-gyp` is not working with this addon, so it's necessary to apply a patch to it. The patch can be found on `./scripts/ci/patches/win_delay_load_hook.cc.patch`, and should be applied to the file on `<nw-gyp-folder>/src/win_delay_load_hook.cc`.

Then:
> yarn
```
npm_config_build_from_source=true npm_config_runtime=node-webkit npm_config_target=0.38.2 yarn add node-libcurl
```
> npm
```bash
npm install node-libcurl --build-from-source --runtime=node-webkit --target=0.38.2 --save
```

where `target` is the current version of NW.js you are using

#### electron (aka atom-shell)

> yarn
```bash
npm_config_build_from_source=true npm_config_runtime=electron npm_config_target=$(yarn --silent electron --version) npm_config_disturl=https://atom.io/download/atom-shell yarn add node-libcurl
```

> npm
```bash
npm install node-libcurl --build-from-source --runtime=electron --target=$(yarn --silent electron --version) --disturl=https://atom.io/download/atom-shell --save
```

Where `target` is the version of electron you are using, in our case, we are just using the version returned by the locally installed `electron` binary.

You can also put those args in a .npmrc file, like so:

```bash
runtime = electron
target = 5.0.1
target_arch = x64
dist_url = https://atom.io/download/atom-shell
```

## Getting Help

If your question is directly related to the addon or their usage, post a question on `stack-overflow` and use the `node-libcurl` tag.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md)

## Donations / Patreon

Some people have been asking if there are any means to support my work, I've created a patreon page for that: https://www.patreon.com/jonathancardoso

If you want to donate via PayPal, use the same e-mail that is available on my GitHub profile: https://github.com/JCMais

And thanks for reading till here! 😄
