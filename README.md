# node-libcurl

[![NPM version](https://badge.fury.io/js/node-libcurl.svg)](http://badge.fury.io/js/node-libcurl)
[![Dependencies](https://gemnasium.com/JCMais/node-libcurl.png)](https://gemnasium.com/JCMais/node-libcurl)

Libcurl bindings for Node.js.
_Based on the work from [jiangmiao/node-curl](https://github.com/jiangmiao/node-curl)._

Not recommended for production use yet!
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
  * end - Called when the request is finished without errors
    * int statusCode HTTP status code.
    * string|Buffer body If raw is set to true, a Buffer is passed instead of a string.
    * Array\<Object>|Buffer headers Buffer if raw is true.
  * data - Called when a chunk of data was received.
    * Buffer chunk
  * header - Called when a chunk of headers was received.
    * Buffer header
  * error - Called when there was an error with the handler.
    * Error err
    * int errorCode libcurl error code.

* methods:
  * getInfo - Get information from the handler
    * String|Int infoId            Info id or the info name as string, you can use the constants from Curl.info
    * returns Array|String|Number  Return value is based on the requested info.
  * setOpt - Set an option to the handler
    * String|Int optionId          Option id or the option name as string, constants on Curl.option
    * Mixed optionValue            Value is based on the given option, check libcurl documentation for more info.
  * perform - Process this handler.
  * reset - Reset the current curl handler.
  * close - Close the current curl instance, after calling this method, this handler is not usable anymore. You **MUST** call this on `error` and `end` events if you are not planning to use this handler anymore, it's **NOT** called by default.

* members:
  * raw - bool - Get raw data on `data` and `header` events.
  * debug - bool - Enable debug messages, currently there are none.

* static methods:
  * getCount - Get amount of Curl instances active
    * returns int
  * getVersion - Get libcurl version as string
    * returns string

* static members:
  * option - Object with all options available.
  * info - Object with all infos available.
  * protocols - Object with the protocols supported by libcurl as bitmasks, should be used when setting PROTOCOLS and REDIR_PROTOCOLS options.


## Installing on Windows

#### What you need to have installed:

* [Python 2.7](https://www.python.org/download/releases/2.7)
* [Visual Studio 2010/2012](http://www.visualstudio.com/downloads/download-visual-studio-vs) (Express version works!)
* Just that, really.
