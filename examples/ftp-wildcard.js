/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to download files from a FTP server using wildcard pattern matching
 * Mostly based on https://curl.haxx.se/libcurl/c/ftp-wildcard.html
 */
var Curl = require('../lib/Curl'),
  Easy = require('../lib/Easy'),
  path = require('path'),
  util = require('util'),
  fs = require('fs');

// Using the Easy interface because currently there is an issue
//  when using libcurl with wildcard matching on the multi interface
//  https://github.com/curl/curl/issues/800
var handle = new Easy(),
  url = 'ftp://speedtest.tele2.net/*.zip',
  data = {
    output: null,
  }; //object to be used to share data between callbacks

handle.setOpt(Curl.option.URL, url);
handle.setOpt(Curl.option.WILDCARDMATCH, true);
handle.setOpt(Curl.option.CHUNK_BGN_FUNCTION, fileIsComing);
handle.setOpt(Curl.option.CHUNK_END_FUNCTION, filesIsDownloaded);

handle.setOpt(Curl.option.WRITEFUNCTION, function(buff, nmemb, size) {
  var written = 0;

  if (data.output) {
    written = fs.writeSync(data.output, buff, 0, nmemb * size);
  } else {
    /* listing output */
    process.stdout.write(buff.toString());
    written = size * nmemb;
  }

  return written;
});

/**
 * @param {module:node-libcurl~CurlFileInfo} fileInfo
 * @param {Number} remains Number of entries remaining
 * @returns {Number}
 */
function fileIsComing(fileInfo, remains) {
  process.stdout.write(
    util.format('Remaining entries: %d / Current: %s / Size: %d - ', remains, fileInfo.fileName, fileInfo.size)
  );

  switch (fileInfo.fileType) {
    case Curl.filetype.DIRECTORY:
      console.log(' DIR');
      break;
    case Curl.filetype.FILE:
      console.log(' FILE');
      break;
    default:
      console.log(' OTHER');
      break;
  }

  if (fileInfo.fileType === Curl.filetype.FILE) {
    /* do not transfer files > 1MB */
    if (fileInfo.size > 1024 * 1024) {
      console.log('SKIPPED');
      return Curl.chunk.BGN_FUNC_SKIP;
    }

    data.output = fs.openSync(path.join(process.cwd(), fileInfo.fileName), 'w+');

    if (!data.output) {
      return Curl.chunk.BGN_FUNC_FAIL;
    }
  } else {
    console.log('SKIPPED');
    return Curl.chunk.BGN_FUNC_SKIP;
  }

  return Curl.chunk.BGN_FUNC_OK;
}

function filesIsDownloaded() {
  if (data.output) {
    console.log('DOWNLOADED');
    fs.closeSync(data.output);
    data.output = null;
  }

  return Curl.chunk.END_FUNC_OK;
}

handle.perform();
