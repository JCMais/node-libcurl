/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to use the Multi handle to make async requests.
 */
var Easy = require('../lib/Easy'),
  Multi = require('../lib/Multi'),
  urls = ['http://google.com', 'http://bing.com', 'http://msn.com', 'http://ask.com/'],
  multi = new Multi(),
  finished = 0,
  handles = [],
  handlesData = [],
  handle;

multi.onMessage(function(err, handle, errCode) {
  var responseCode = handle.getInfo('RESPONSE_CODE').data,
    handleData = handlesData[handles.indexOf(handle)],
    handleUrl = urls[handles.indexOf(handle)],
    responseData = '',
    i,
    len;

  console.log('# of handles active: ' + multi.getCount());

  if (err) {
    console.log(handleUrl + ' returned error: "' + err.message + '" with errcode: ' + errCode);
  } else {
    for (i = 0, len = handleData.length; i < len; i++) {
      responseData += handleData[i].toString();
    }

    console.log(handleUrl + ' returned response code: ' + responseCode);

    console.log(handleUrl + ' returned response body: ' + responseData);
  }

  multi.removeHandle(handle);
  handle.close();

  if (++finished === urls.length) {
    console.log('Finished all requests!');
    multi.close();
  }
});

/**
 * @param {Buffer} data
 * @param {Number} n
 * @param {Number} nmemb
 * @returns {number}
 */
function onData(data, n, nmemb) {
  //this === the handle
  var key = handles.indexOf(this);

  handlesData[key].push(data);

  return n * nmemb;
}

for (var i = 0, len = urls.length; i < len; i++) {
  handle = new Easy();
  handle.setOpt('URL', urls[i]);
  handle.setOpt('FOLLOWLOCATION', true);
  handle.setOpt('WRITEFUNCTION', onData);

  handlesData.push([]);
  handles.push(handle);

  multi.addHandle(handle);
}
