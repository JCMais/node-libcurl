Curl = require('../index');
options = {CONNECTTIMEOUT: 2};
curl = Curl.create(options)
url = 'www.nodejs.org';
curl(url,  function(err) {
  console.info("\x1b[33meffetcive url: " + this.info('EFFECTIVE_URL') + "\x1b[0m");
  console.info("body length: " + this.body.length);
  this.close()
});

curl = Curl.create(options)
url = 'www.yahoo.com'
curl(url, function(err) {
  console.info("\x1b[33meffetcive url: " + this.info('EFFECTIVE_URL') + "\x1b[0m");
  console.info("body length: " + this.body.length);
  this.close()
});

curl = Curl.create(options)
curl('https://www.google.com', {VERBOSE: 1, RAW: 1}, function(err) {
  console.info("\x1b[33meffetcive url: " + this.info('EFFECTIVE_URL') + "\x1b[0m");
  this.close()
});
