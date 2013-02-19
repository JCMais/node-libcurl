var Curl = require('../lib/Curl')

var p = console.log;
var url = process.argv[2];

var curl = new Curl();

if (!url)
url = 'www.yahoo.com';

curl.setopt('URL', url);
curl.setopt('CONNECTTIMEOUT', 2);

// on 'data' must be returns chunk.length, or means interrupt the transfer
curl.on('data', function(chunk) {
  return chunk.length;
});

curl.on('error', function(e) {
  curl.close();
});


curl.on('end', function() {
  curl.close();
});

curl.perform();
