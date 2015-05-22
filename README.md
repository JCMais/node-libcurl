# node-libcurl

[![NPM version](https://badge.fury.io/js/node-libcurl.svg)](http://badge.fury.io/js/node-libcurl)
[![Dependencies](https://gemnasium.com/JCMais/node-libcurl.png)](https://gemnasium.com/JCMais/node-libcurl)

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

### Curl

* events:
  * end - Called when the request is finished without errors
    * int statusCode Last received response code.
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
  * enable - Enable a feature.
    * Int features                 Bitmask representing the features that should be enabled.
  * disable - Disable a feature.
    * Int features                 Bitmask representing the features that should be disabled.
  * perform - Process this handler.
  * reset - Reset the current curl handler.
  * close - Close the current curl instance, after calling this method, this handler is not usable anymore. You **MUST** call this on `error` and `end` events if you are not planning to use this handler anymore, it's **NOT** called by default.

* members:
  * onData - Callback, acts the same way than the data event, however here the return value is taken into consideration.
    * Buffer chunk
  * onHeader - Callback, acts the same way than the header event, however here the return value is taken into consideration.
    * Buffer header

* static methods:
  * getCount - Get amount of Curl instances active
    * returns int
  * getVersion - Get libcurl version as string
    * returns string

* static members:
  * option - Object with all options available.
  * info - Object with all infos available.
  * protocol - Object with the protocols supported by libcurl as bitmasks, should be used when setting PROTOCOLS and REDIR_PROTOCOLS options.
  * auth - Object with bitmasks that should be used with the HTTPAUTH option.
  * http - Object with constants to be used with the HTTP_VERSION option.
  * pause - Object with constants to be used with the pause method.
  * netrc - Object with constants to be used with NETRC option.
  * feature - Object with the features currently supported as bitmasks.
    * NO_DATA_PARSING - Data received is passed as a Buffer to the end event.
    * NO_HEADER_PARSING - Header received is not parsed, it's passed as a Buffer to the end event.
    * NO_DATA_STORAGE - Data received is not stored inside this handler, implies NO_DATA_PARSING.
    * NO_HEADER_STORAGE - Header received is not stored inside this handler, implies NO_HEADER_PARSING.
    * RAW - Same than NO_DATA_PARSING | NO_HEADER_PARSING
    * NO_STORAGE - Same than NO_DATA_STORAGE | NO_HEADER_STORAGE, implies RAW.


## Installing on Windows

#### What you need to have installed:

* [Python 2.7](https://www.python.org/download/releases/2.7)
* [Visual Studio 2010/2012](http://www.visualstudio.com/downloads/download-visual-studio-vs) (Express version works!)
* Just that, really.
