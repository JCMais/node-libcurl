Node Curl Wrap
Use select curl multi

Quick Start
===========

curl = require('node-curl')
curl('www.google.com', {VERBOSE: 1}, function(err, res) {
  console.info(res.status)
  console.info('-----')
  console.info(res.body)
  console.info('-----')
  console.info(res.info('SIZE_DOWNLOAD'))
});

Usage
=====

Function: curl
curl(url, [options = {}], callback)
callback includes 2 parameters (error, result)

Curl Options:
options is on the list at http://curl.haxx.se/libcurl/c/curl_easy_setopt.html without CURLOPT_
eg: CURLOPT_VERBOSE will be VERBOSE, CURLOPT_HEADER will be HEADER

Object: result
body
status
info

Curl Infos:
infos is on the list at http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html without CURLINFO_
eg: CURLINFO_EFFECTIVE_URL will be EFFETCTIVE_URL


