# node-libcurl

[![NPM version](https://badge.fury.io/js/node-libcurl.svg)](http://badge.fury.io/js/node-libcurl)
[![Dependencies](https://gemnasium.com/JCMais/node-libcurl.png)](https://gemnasium.com/JCMais/node-libcurl)

Libcurl bindings for Node.js.
_Based on the work from [jiangmiao/node-curl](https://github.com/jiangmiao/node-curl)._

Work in progress.

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

### Curl

* events:
  * end - Request finished without errors
    * int statusCode
    * string|[if raw => Buffer] body
    * Array\<Object>|[if raw => Buffer] headers
  * data - Received a chunk of data
    * Buffer chunk
  * header - Received a chunk of headers
    * Buffer header
  * error - Libcurl found an error
    * Error err
    * int cURLErrorCode

* methods:
  * getInfo - Get information from the current header handler
    * String|Int infoIdOrName      Info id or the info name as string, you can use the constants from Curl.info
    * returns Array|String|Number  Return value is based on the requested info.
  * setOpt - Set an option to the curl instance
    * String|Int optionIdOrName    Option id or the option name as string, constants on Curl.option
    * Mixed optionValue            Value is based on the given option, check libcurl documentation for more info.
  * close - Close the current curl instance, after calling this method, this handler is not usable anymore. You **MUST** call this on `error` and `end` events, it's **NOT** called by default.

* members:
  * raw - bool - Get raw data on `data` and `header` events.
  * debug - bool - Enable debug messages, currently there are none.

* static methods:
  * getCount - Get amount of Curl instances active
    * returns int

* static members:
  * option - Object with all options available.
  * info - Object with all infos available.


## Installing on Windows

#### What you need to have installed:

* [Python 2.7](https://www.python.org/download/releases/2.7)
* [Visual Studio 2010/2012](http://www.visualstudio.com/downloads/download-visual-studio-vs) (Express version works!)
* Just that, really.
