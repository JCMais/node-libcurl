# node-libcurl

[![Join the chat at https://gitter.im/JCMais/node-libcurl](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/JCMais/node-libcurl?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![NPM version][npm-image]][npm-url]
[![node][node-image]][node-url]
[![io.js][iojs-image]][iojs-url]
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
[iojs-image]:https://img.shields.io/badge/io.js-%3E=_1.0-brightgreen.svg?style=flat-square
[iojs-url]:https://iojs.org/en/index.html
[license-image]:https://img.shields.io/github/license/JCMais/node-libcurl.svg?style=flat-square
[license-url]:https://raw.githubusercontent.com/JCMais/node-libcurl/develop/LICENSE-MIT
[deps-image]:https://img.shields.io/david/JCMais/node-libcurl.svg?style=flat-square
[deps-url]:https://david-dm.org/jcmais/node-libcurl

[Libcurl](https://github.com/bagder/curl) bindings for Node.js.
_Based on the work from [jiangmiao/node-curl](https://github.com/jiangmiao/node-curl)._

## Quick Start

### Install
```npm install node-libcurl```

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

## Installing on Windows

#### What you need to have installed:

* [Python 2.7](https://www.python.org/download/releases/2.7)
* [Visual Studio >= 2013](http://www.visualstudio.com/downloads/download-visual-studio-vs)
* [git](https://desktop.github.com/)
