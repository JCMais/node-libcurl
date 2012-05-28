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
          status     - Http Response code
          body       - Http body

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

Hints
-----

