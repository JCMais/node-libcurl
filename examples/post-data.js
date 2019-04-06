/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Example showing how to send post data using the POSTFIELDS option.
 */
var Curl = require('../lib/Curl'),
  querystring = require('querystring');

var curl = new Curl(),
  url = 'http://posttestserver.com/post.php',
  data = {
    //Data to send, inputName : value
    'input-arr[0]': 'input-arr-val0',
    'input-arr[1]': 'input-arr-val1',
    'input-arr[2]': 'input-arr-val2',
    'input-name': 'input-val',
  };

//You need to build the query string,
// node has this helper function, but it's limited for real use cases (no support for array values for example)
data = querystring.stringify(data);

curl.setOpt(Curl.option.URL, url);
curl.setOpt(Curl.option.POSTFIELDS, data);
curl.setOpt(Curl.option.HTTPHEADER, ['User-Agent: node-libcurl/1.0']);
curl.setOpt(Curl.option.VERBOSE, true);

console.log(querystring.stringify(data));

curl.perform();

curl.on('end', function(statusCode, body) {
  console.log(body);

  this.close();
});

curl.on('error', curl.close.bind(curl));
