curl = require('../index');
url = 'www.yahoo.com';
curl(url,  function(err, res) {
  console.info("body length: " + res.body.length);
  console.info('-----');
  console.info("status: " + res.status);
  console.info('-----');
  console.info("size download: " + res.info('SIZE_DOWNLOAD'));
  console.info("\033[33meffetcive url: " + res.info('EFFECTIVE_URL') + "\033[0m");
});

curl(url,  function(err, res) {
  console.info("body length: " + res.body.length);
  console.info('-----');
  console.info("status: " + res.status);
  console.info('-----');
  console.info("size download: " + res.info('SIZE_DOWNLOAD'));
  console.info("\033[33meffetcive url: " + res.info('EFFECTIVE_URL') + "\033[0m");
});
