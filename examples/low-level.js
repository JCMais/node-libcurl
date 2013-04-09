var Curl = require('../lib/Curl')

var p = console.log;
var url = process.argv[2];

var curl = new Curl();

if (!url)
	url = 'www.yahoo.com';

curl.setopt('URL', url);
curl.setopt('CONNECTTIMEOUT', 2);
curl.setopt('VERBOSE', 1);

// on 'data' must be returns chunk.length, or means interrupt the transfer
curl.on('data', function(chunk) {
	p("receive " + chunk.length)
	return chunk.length;
});

curl.on('error', function(e) {
	p("error: " + e.message);
	curl.close();
});


curl.on('end', function() {
	p("code: " + curl.getinfo('RESPONSE_CODE'));
	curl.close();
	p('done.');
});

curl.perform();
