node-curl [![Build Status](https://secure.travis-ci.org/jiangmiao/node-curl.png?branch=master)](http://travis-ci.org/jiangmiao/node-curl)
=========

node cURL wrapper, support all options and infos.

Quick Start
-----------

* quick start

        curl = require('node-curl');
        curl('www.google.com', function(err) {
          console.info(this.status);
          console.info('-----');
          console.info(this.body);
          console.info('-----');
          console.info(this.info('SIZE_DOWNLOAD'));
        });


* with options

        curl = require('node-curl')
        curl('www.google.com', {VERBOSE: 1, RAW: 1}, function(err) {
          console.info(this);
        });

* run the example/test.js

        node examples/test.js

Usage
-----

* curl

        curl(url, [options = {}], callback)
        callback includes 1 parameters (error)
        result is stored in curl

* Retrieve Data from curl

        members:
          status           - Http Response code
          body             - Http body

          url              - the url set by curl(...)
          options          - the options set by curl(...)
          defaultOptions   - the defaultOptions
          effectiveOptions - the options curl used

        methods:
          info(name) - Get information of result, see 'info' section

* Curl Control

        members
            debug (default: false)
                - logging node-curl debug info

        methods:
            void reset()
                - reset curl and set options to default options

            void setDefaultOptions(options, reset = true)
                - set default options

            curl create(defaultOptions)
                - create a new curl with default options

Options
-------
* Any cURL Easy Options

        eg: CURLOPT_VERBOSE will be VERBOSE, CURLOPT_HEADER will be HEADER

        Full list at http://curl.haxx.se/libcurl/c/curl_easy_setopt.html

* node-curl Extra Options

        RAW   - Returns Buffer instead of String in result.body
        DEBUG - Replace curl.debug

* About slist parameters

        node-curl support slist which map to Javascript Array

        eg:
            HTTP_HEADER: ['FOO', 'BAR']
            HTTP_HEADER: 'FOO'

            any non-array parameter will convert to [ parameter.toString() ]

Infos
-----
* Any cURL Info options

        eg: CURLINFO_EFFECTIVE_URL will be EFFETCTIVE_URL

        full list at http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html


* About slist

          slist will be returns in Array
          eg: CURLINFO_COOKIELIST

MultiPart Upload
----------------
Use MULTIPART option

There are 4 options in MULTIPART, `name`, `file`, `type`, `contents`

```javascript
curl('127.0.0.1/upload.php', {
    MULTIPART: [
        {name: 'file', file: '/file/path', type: 'text/html'},
        {name: 'sumbit', contents: 'send'}
    ]
}, function(e) {
    console.log(e);
    console.log(this.body);
    this.close()
});
```

Low Level Curl Usage
--------------------

require 'node-curl/lib/Curl'

Methods:

    Curl setopt(optionName, optionValue)
    Curl perform()
    Curl on(eventType, callback)
    Mixed getinfo(infoName)

Events:

    'data', function(Buffer chunk) {}
    'error', function(Error error) {}
    'end', function() {}

Example: examples/low-level.js

    var Curl = require('node-curl/lib/Curl')

    var p = console.log;
    var url = process.argv[2];

    var curl = new Curl();

    if (!url)
        url = 'www.yahoo.com';

    curl.setopt('URL', url);
    curl.setopt('CONNECTTIMEOUT', 2);

    // on 'data' must be returns chunk.length, or means interrupt the transfer
    curl.on('data', function(chunk) {
        p("receive " + chunk.length)
        return chunk.length;
    });

    // curl.close() should be called in event 'error' and 'end' if the curl won't use any more.
    // or the resource will not release until V8 garbage mark sweep.
    curl.on('error', function(e) {
        p("error: " + e.message)
        curl.close();
    });


    curl.on('end', function() {
        p('code: ' + curl.getinfo('RESPONSE_CODE'));
        p('done.')
        curl.close();
    });

    curl.perform();
