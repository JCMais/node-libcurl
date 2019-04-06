/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to upload a file using PUT.
 */
var Curl = require('../lib/Curl'),
  path = require('path'),
  fs = require('fs'),
  crypto = require('crypto');

var curl = new Curl(),
  url = 'httpbin.org/put',
  fileSize = 10 * 1024, //1KB
  fileName = path.resolve(__dirname, 'upload.test');

//write random bytes to a file, this will be our upload file.
fs.writeFileSync(fileName, crypto.randomBytes(fileSize));

console.log('File: ', fs.readFileSync(fileName, 'base64'));

fs.open(fileName, 'r+', function(err, fd) {
  //enabling VERBOSE mode so we can get more details on what is going on.
  curl.setOpt(Curl.option.VERBOSE, 1);
  //set UPLOAD to a truthy value to enable PUT upload.
  curl.setOpt(Curl.option.UPLOAD, 1);
  //pass the file descriptor to the READDATA option
  // passing one invalid value here will cause an aborted by callback error.
  curl.setOpt(Curl.option.READDATA, fd);

  curl.setOpt(Curl.option.URL, url);

  curl.on('end', function(statusCode, body) {
    console.log(body);

    //remember to always close the file descriptor!
    fs.closeSync(fd);

    fs.unlinkSync(fileName);

    //the same for the curl instance, always close it when you don't need it anymore.
    this.close();
  });

  curl.on('error', function(err) {
    console.log(err);

    fs.closeSync(fd);
    fs.unlinkSync(fileName);
    this.close();
  });

  curl.perform();
});
