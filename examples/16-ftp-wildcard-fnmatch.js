/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to download files from a FTP server
 *   using custom wildcard pattern matching
 */
const path = require('path')
const util = require('util')
const fs = require('fs')

const {
  Curl,
  CurlChunk,
  CurlFileType,
  CurlFnMatchFunc,
  Easy,
} = require('../dist')

// Using the Easy interface because currently there is an issue
//  when using libcurl with wildcard matching on the multi interface
//  https://github.com/curl/curl/issues/800
// It can safely by used with `Curl` or directly with a `Multi` instance
//  if your libcurl version is greater than 7.49.0
const handle = new Easy()
const url = 'ftp://speedtest.tele2.net/*.zip'

// object to be used to share data between callbacks
const data = {
  output: null,
}

handle.setOpt(Curl.option.URL, url)
handle.setOpt(Curl.option.VERBOSE, 1)
handle.setOpt(Curl.option.WILDCARDMATCH, true)
handle.setOpt(Curl.option.FNMATCH_FUNCTION, fnMatch)
handle.setOpt(Curl.option.CHUNK_BGN_FUNCTION, fileIsComing)
handle.setOpt(Curl.option.CHUNK_END_FUNCTION, filesIsDownloaded)

handle.setOpt(Curl.option.WRITEFUNCTION, (buff, nmemb, size) => {
  let written = 0

  if (data.output) {
    written = fs.writeSync(data.output, buff, 0, nmemb * size)
  } else {
    /* listing output */
    console.log(buff.toString())
    written = size * nmemb
  }

  return written
})

// Functions globStringToRegex and pregQuote from: http://stackoverflow.com/a/13818704/710693

function globStringToRegex(str) {
  return new RegExp(
    pregQuote(str).replace(/\\\*/g, '.*').replace(/\\\?/g, '.'),
    'g',
  )
}

function pregQuote(str, delimiter) {
  // http://kevin.vanzonneveld.net
  // +   original by: booeyOH
  // +   improved by: Ates Goral (http://magnetiq.com)
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Onno Marsman
  // +   improved by: Brett Zamir (http://brett-zamir.me)
  // *     example 1: preg_quote("$40");
  // *     returns 1: '\$40'
  // *     example 2: preg_quote("*RRRING* Hello?");
  // *     returns 2: '\*RRRING\* Hello\?'
  // *     example 3: preg_quote("\\.+*?[^]$(){}=!<>|:");
  // *     returns 3: '\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:'
  return (str + '').replace(
    new RegExp(
      '[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]',
      'g',
    ),
    '\\$&',
  )
}

/**
 * Use our own logic to make the wildcard matching.
 *
 * Here we are just changing from the default libcurl logic
 *  to use one equivalent using javascript RegExp.
 *
 * @param {String} pattern
 * @param {String} string
 * @returns {number}
 */
function fnMatch(pattern, string) {
  const regex = new RegExp(globStringToRegex(pattern), 'g')

  return string.match(regex) ? CurlFnMatchFunc.Match : CurlFnMatchFunc.NoMatch
}

function fileIsComing(fileInfo, remains) {
  console.log(
    util.format(
      'Remaining entries: %d / Current: %s / Size: %d - ',
      remains,
      fileInfo.fileName,
      fileInfo.size,
    ),
  )

  console.log('fileInfo object:', { fileInfo })

  switch (fileInfo.fileType) {
    case CurlFileType.Directory:
      console.log(' DIR')
      break
    case CurlFileType.File:
      console.log(' FILE')
      break
    default:
      console.log(' OTHER')
      break
  }

  if (fileInfo.fileType === CurlFileType.File) {
    /* do not transfer files > 1MB */
    if (fileInfo.size > 1024 * 1024) {
      console.log('SKIPPED')
      return CurlChunk.BgnFuncSkip
    }

    data.output = fs.openSync(path.join(process.cwd(), fileInfo.fileName), 'w+')

    if (!data.output) {
      return CurlChunk.BgnFuncFail
    }
  } else {
    console.log('SKIPPED')
    return CurlChunk.BgnFuncSkip
  }

  return CurlChunk.BgnFuncOk
}

function filesIsDownloaded() {
  if (data.output) {
    console.log('DOWNLOADED')
    fs.closeSync(data.output)
    data.output = null
  }

  return CurlChunk.EndFuncOk
}

handle.perform()
