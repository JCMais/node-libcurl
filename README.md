# node-libcurl

[![Join the chat at https://gitter.im/JCMais/node-libcurl](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/JCMais/node-libcurl?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

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
[travis-url]:https://travis-ci.org/JCMais/node-libcurl
[appveyor-image]:https://ci.appveyor.com/api/projects/status/u7ox641jyb6hxrkt/branch/master?svg=true
[appveyor-url]:https://ci.appveyor.com/project/JCMais/node-libcurl
[codeclimate-image]:https://img.shields.io/codeclimate/github/JCMais/node-libcurl.svg?style=flat-square
[codeclimate-url]:https://codeclimate.com/github/JCMais/node-libcurl
[node-image]:https://img.shields.io/badge/node.js-%3E=_0.10-green.svg?style=flat-square
[node-url]:https://nodejs.org/download/
[license-image]:https://img.shields.io/github/license/JCMais/node-libcurl.svg?style=flat-square
[license-url]:https://raw.githubusercontent.com/JCMais/node-libcurl/develop/LICENSE-MIT
[deps-image]:https://img.shields.io/david/JCMais/node-libcurl.svg?style=flat-square
[deps-url]:https://david-dm.org/jcmais/node-libcurl

[Libcurl](https://github.com/bagder/curl) bindings for Node.js.
_Based on the work from [jiangmiao/node-curl](https://github.com/jiangmiao/node-curl)._

## Quick Start

### Install
```npm install node-libcurl --save```

### Simple Request
```javascript
var Curl = require( 'node-libcurl' ).Curl;

var curl = new Curl();

curl.setOpt( 'URL', 'www.google.com' );
curl.setOpt( 'FOLLOWLOCATION', true );

curl.on( 'end', function( statusCode, body, headers ) {

    console.info( statusCode );
    console.info( '---' );
    console.info( body.length );
    console.info( '---' );
    console.info( this.getInfo( 'TOTAL_TIME' ) );

    this.close();
});

curl.on( 'error', curl.close.bind( curl ) );
curl.perform();
```

### MultiPart Upload / HttpPost libcurl Option

```javascript
var Curl = require( 'node-libcurl' ).Curl;

var curl = new Curl(),
    close = curl.close.bind( curl );

curl.setOpt( curl.option.URL, '127.0.0.1/upload.php' );
curl.setOpt( curl.option.HTTPPOST, [
    { name: 'input-name', file: '/file/path', type: 'text/html' },
    { name: 'input-name2', contents: 'field-contents' }
]);

curl.on( 'end', close );
curl.on( 'error', close );
```

For more examples check the [examples folder](examples).

## API

Check the [API Docs](api.md)

## Detailed Installation

This package has prebuilt binaries (thanks to [node-pre-gyp](https://github.com/mapbox/node-pre-gyp/)) available for the following platforms:
* Linux 64 bits
* Mac OS X 64 bits
* Windows 32 and 64 bits

Just running ``npm install node-libcurl`` should install a prebuilt binary and no compilation will be needed.

If there is no prebuilt binary available that matches your system, or if the installation fails, then you will
need an environment capable of compilling nodejs addons, which means [python 2.7](https://www.python.org/download/releases/2.7)
installed and an updated C++ compiler able to compile C++11.

If you don't want to use a prebuilt binary you can pass ``--build-from-source`` to the arguments list.

### Linux

The only compiler supported on linux is gcc >=4.8, also you need to have the libcurl development files available,
if you are running debian for example, you must install the ``libcurl4-openssl-dev`` package.

If you don't want to use the libcurl version shipped with your system, since it's probably very old
(debian 7 uses libcurl 7.26 which is more than 3 years old, and had more than 1000 bugfixes already),
you can install libcurl from source, the addon will pick the libcurl info using the ``curl-config`` tool,
that way you only need to make sure that the libcurl you installed is in the path and in higher priority
than the system one.

### OS X

You need to have installed OS X >=10.8 and xcode >=4.5

If you want to install using a different version of libcurl, the same instructions for linux applies.

### Windows

If installing using a prebuilt binary you only need to have the [visual c++ 2013 runtime library](https://www.microsoft.com/en-us/download/details.aspx?id=40784).
If building from source, you need to have Python 2.7, [Visual Studio >=2013](http://www.visualstudio.com/downloads/download-visual-studio-vs) and [git](https://desktop.github.com/)

Currently there is no support to use other libcurl version than the one provided by the [curl-for-windows](https://github.com/JCMais/curl-for-windows) submodule.

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

 ```bash
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
