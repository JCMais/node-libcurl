curl = require('../index');
url = 'www.nodejs.org';
options = {CONNECTTIMEOUT: 2, VERBOSE: 1};
curl(url,  options, function(err, res) {
  console.info("\x1b[33meffetcive url: " + res.info('EFFECTIVE_URL') + "\x1b[0m");
  console.info("body length: " + res.body.length);
  res.close();
});

url = 'www.yahoo.com'
curl(url, options, function(err, res) {
  console.info("\x1b[33meffetcive url: " + res.info('EFFECTIVE_URL') + "\x1b[0m");
  console.info("body length: " + res.body.length);
  res.close();
});

curl('www.google.com', {VERBOSE: 1, RAW: 1}, function(err, res) {
  console.info(res);
  res.close();
});

/*
console.info('-----');
console.info("status: " + res.status);
console.info('-----');
console.info("size download: " + res.info('SIZE_DOWNLOAD'));
*/
