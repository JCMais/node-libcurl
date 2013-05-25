var Curl = require('../lib/Curl');

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
	p("receive " + chunk.length);
	return chunk.length;
});

curl.on('header', function(chunk) {
	p("receive header " + chunk.length);
	return chunk.length;
})

// curl.close() should be called in event 'error' and 'end' if the curl won't use any more.
// or the resource will not release until V8 garbage mark sweep.
curl.on('error', function(e) {
	p("error: " + e.message);
	curl.close();
});


curl.on('end', function() {
	p('code: ' + curl.getinfo('RESPONSE_CODE'));
	p('done.');
	curl.close();
});

curl.perform();
