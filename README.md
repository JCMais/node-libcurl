node-curl [![Build Status](https://secure.travis-ci.org/jiangmiao/node-curl.png?branch=master)](http://travis-ci.org/jiangmiao/node-curl)
=========

node cURL wrapper, support all options and infos.

Quick Start
-----------

* quick start

        curl = require('node-curl');
        curl('www.google.com', function(err, res) {
          console.info(res.status);
          console.info('-----');
          console.info(res.body);
          console.info('-----');
          console.info(res.info('SIZE_DOWNLOAD'));
          res.close();
        });


* with options

        curl = require('node-curl')
        curl('www.google.com', {VERBOSE: 1, RAW: 1}, function(err, res) {
          console.info(res);
          res.close();
        });

Usage
-----

* curl

        curl(url, [options = {}], callback)
        callback includes 2 parameters (error, result)

* result in callback

        members:
          status     - Http Response code
          body       - Http body

        methods:
          info(name) - Get information of result, see 'info' section

Options
-------
* Any Curl Easy Options

        eg: CURLOPT_VERBOSE will be VERBOSE, CURLOPT_HEADER will be HEADER

        Full list at http://curl.haxx.se/libcurl/c/curl_easy_setopt.html 

* node-curl Extra Options

        RAW - Returns Buffer instead of String in result.body

* About slist parameters

        node-curl support slist which map to Javascript Array

        eg: 
            HTTP_HEADER: ['FOO', 'BAR']
            HTTP_HEADER: 'FOO'

            any non-array parameter will convert to [ parameter.toString() ]

Infos
-----
* Any Curl Info options

        eg: CURLINFO_EFFECTIVE_URL will be EFFETCTIVE_URL

        full list at http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html


* About slist

          slist will be returns in Array
          eg: CURLINFO_COOKIELIST


Hints
-----
close the result to release resource of curl immediately.

or the resource will not release until gc performed.
