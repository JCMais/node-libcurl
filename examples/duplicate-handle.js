/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example just showing how to use the dupHandle method
 * to keep requesting the same stuff again and again but using new
 * instances instead of the same.
 */
var Curl = require('../lib/Curl'),
  querystring = require('querystring'),
  url = 'http://localhost/',
  data = { 'Hi!': 'This was sent using node-libcurl <3!' },
  curl,
  count = 0,
  iterations = 1e4,
  handles = [],
  shouldCopyCallbacks = true,
  shouldCopyEventListeners = true;

curl = new Curl();
curl.handleNumber = 0; //just so we know which handle is running
handles.push(curl);

//you can use a string as option
curl.setOpt('URL', url);
curl.setOpt('CONNECTTIMEOUT', 5);
curl.setOpt('FOLLOWLOCATION', true);
curl.setOpt('HTTPHEADER', ['User-Agent: node-libcurl/1.0']);
curl.setOpt('POSTFIELDS', querystring.stringify(data));

curl.on('end', function(statusCode, body, headers) {
  ++count;

  console.log('Handle #' + this.handleNumber + ' finished');

  console.log('Headers: ', headers);
  console.log('Status Code: ', statusCode);
  console.log('Body: ', body);

  if (count < iterations) {
    console.log('Duplicating handle #' + this.handleNumber);

    var duplicatedHandle = this.dupHandle(shouldCopyCallbacks, shouldCopyEventListeners);
    duplicatedHandle.handleNumber = count;
    handles.push(duplicatedHandle);

    console.log('Running handle #' + count);
    handles[count].perform();
  }

  console.log('Closing handle #' + this.handleNumber);
  this.close();
  handles[count - 1] = null;
});

curl.on('error', function(err, curlErrCode) {
  console.error('Err: ', err);
  console.error('Code: ', curlErrCode);

  this.close();
});

console.log('Running handle #' + count);
curl.perform();
