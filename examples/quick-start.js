curl = require('../index');

// second argument 'options' is omitted.
url = 'www.google.com';
console.info("GET " + url);
curl('www.google.com', function(err) {
  console.info("\x1b[32mGet " + this.url + " finished.\x1b[0m");
  console.info("\tstatus: " + this.status);
  console.info("\tbody length: " + this.body.length);
  console.info("\tinfo SIZE_DOWNLOAD: " + this.info('SIZE_DOWNLOAD'));
  console.info("\tinfo EFFECTIVE_URL " + this.info('EFFECTIVE_URL'));
  this.close();
});

// because we uses curl in parallel. and each curl is only for one session.
// so use curl.create(defaultOptions = {}) to create new curl/session.
curl2 = curl.create({RAW: 1});
url2 = 'www.google.com';
options2 = {FOLLOWLOCATION: 1};
console.info("GET " + url + " with default options " + JSON.stringify(curl2.defaultOptions) + ' and options ' + JSON.stringify(options2));
curl2(url2, options2, function(err) {
  console.info("\x1b[32mGet " + this.url + " with " + JSON.stringify(this.effectiveOptions) + " finished.\x1b[0m");
  console.info("\tstatus: " + this.status);
  console.info("\tbody length: " + this.body.length);
  console.info("\tinfo SIZE_DOWNLOAD: " + this.info('SIZE_DOWNLOAD'));
  console.info("\tinfo EFFECTIVE_URL " + this.info('EFFECTIVE_URL'));
  this.close();
});
