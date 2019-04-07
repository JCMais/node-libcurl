# node-libcurl

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
[codeclimate-image]:https://img.shields.io/codeclimate/github/JCMais/node-libcurl.svg?style=flat-square
[codeclimate-url]:https://codeclimate.com/github/JCMais/node-libcurl
[node-image]:https://img.shields.io/badge/node.js-%3E=_4-green.svg?style=flat-square
[node-url]:https://nodejs.org/download/
[license-image]:https://img.shields.io/github/license/JCMais/node-libcurl.svg?style=flat-square
[license-url]:https://raw.githubusercontent.com/JCMais/node-libcurl/develop/LICENSE-MIT
[deps-image]:https://img.shields.io/david/JCMais/node-libcurl.svg?style=flat-square
[deps-url]:https://david-dm.org/jcmais/node-libcurl

[Libcurl](https://github.com/bagder/curl) bindings for Node.js.
_Based on the work from [jiangmiao/node-curl](https://github.com/jiangmiao/node-curl)._

## Quick Start

### Install
```sh
npm i node-libcurl --save
```
or
```sh
yarn add node-libcurl
```
### Simple Request - Async / Await
```javascript
const { curl } = require('node-libcurl');

const { statusCode, data, headers } = await curl.get('http://www.google.com')
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

### MultiPart Upload / HttpPost libcurl Option

```javascript
const { Curl } = require('node-libcurl');

const curl = new Curl();
const close = curl.close.bind(curl);

curl.setOpt(curl.option.URL, '127.0.0.1/upload.php');
curl.setOpt(curl.option.HTTPPOST, [
    { name: 'input-name', file: '/file/path', type: 'text/html' },
    { name: 'input-name2', contents: 'field-contents' }
]);

curl.on('end', close);
curl.on('error', close);
```

For more examples check the [examples folder](examples).

## API

Check the [API Docs](api.md)

Almost all [CURL options](https://curl.haxx.se/libcurl/c/curl_easy_setopt.html) are supported, if you pass one that is not, an error will be thrown.

## Detailed Installation

The latest version of this package has prebuilt binaries (thanks to [node-pre-gyp](https://github.com/mapbox/node-pre-gyp/)) 
 available for the latest two (2) versions of Node.js on Active LTS (or Maintenance LTS, see https://github.com/nodejs/Release) 
 and for the following platforms:
* Linux 64 bits
* Mac OS X 64 bits
* Windows 32 and 64 bits

Just running ``npm install node-libcurl`` should install a prebuilt binary and no compilation will be needed.

If there is no prebuilt binary available that matches your system, or if the installation fails, then you will need an environment capable of compilling Node.js addons, which means [python 2.7](https://www.python.org/download/releases/2.7) installed and an updated C++ compiler able to compile C++11.

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

The prebuilt binaries are statically linked with `libssh2`, `nghttp2`, `OpenSSL` and `zlib`.

The `nghttp2`, `OpenSSL` and `zlib` versions **must** match the version Node.js uses, this is necessary to avoid any possible issues by mixing library symbols of different versions, since Node.js also exports some of the symbols of their deps.

In case you are building the addon yourself with the libraries mentioned above, you must make sure their version is ABI compatible with the one Node.js uses, otherwise you are probably going to hit a Segmentation Fault.

If you want to build a statically linked version of the addon yourself, you need to pass the `curl_static_build=true` flag when calling install.

> If using `npm`:
```sh
npm install node-libcurl --curl_static_build=true
```
> If using `yarn`:
```sh
npm_config_curl_static_build=true yarn add node-libcurl
```

The build process will use `curl-config` available on path, if you want to overwrite it to your own libcurl installation one, you can set the `curl_config_bin` variable, like mentioned above for `curl_static_build`.

And if you don't want to use `curl-config`, you can pass two extra variables to control the build process:
- `curl_include_dirs`
    Space separated list of directories to search for header files
- `curl_libraries`
    Space separated list of flags to pass to the linker

#### Missing Packages

The statically linked version currently does not have support for IDN, LDAP or RTMP.

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

In case you want some examples check the CI [`.travis.yml`](./.travis.yml) file and the [`scripts/ci/`](./scripts/ci) folder.

### Building on macOS

On macOS you must have:
- macOS >= 10.12 (Sierra)
- xcode >= 7

###Building on Windows

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

### nw.js (aka node-webkit)

From nw.js documentation:

> Starting from 0.13.0, native modules built by node-gyp or npm in upstream can be supported.
>
>  In Linux and OSX you can just load the native module directly. In windows you’ll need to replace the file
>  ``%APPDATA%\npm\node_modules\node-gyp\src\win_delay_load_hook.c`` with the one at [https://github.com/nwjs/nw.js/blob/nw13/tools/win_delay_load_hook.c](https://github.com/nwjs/nw.js/blob/nw13/tools/win_delay_load_hook.c)

http://docs.nwjs.io/en/latest/For%20Users/Advanced/Use%20Native%20Node%20Modules/

Since we require ``node-gyp`` as direct dependency, you probably will need to change that
file directly in the ``node-gyp`` inside the ``node_modules`` folder of your project.

### electron (aka atom-shell)

Currently there are no prebuilt binaries for electron, to install node-libcurl, do the following:

 ```sh
 npm install node-libcurl --runtime=electron --target=1.0.2 --disturl=https://atom.io/download/atom-shell --arch=x64 --save
 ```
 ``--target`` says you want to build for the electron version 0.34.1.

 ``--arch`` says the module should be built for 64bit.

---

You can put those args in a .npmrc file, like so:
```
runtime = electron
target = 1.0.2
target_arch = x64
dist_url = https://atom.io/download/atom-shell
```

## Contributing

We are using [`yarn`](https://yarnpkg.com/) on this project.

If on Windows, run:
```sh
$ node tools/update-deps.js
```
Install the node modules:
```sh
$ yarn install
```
Build node-libcurl:
```sh
$ yarn pregyp rebuild
```
