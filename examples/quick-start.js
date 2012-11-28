Curl = require('../index');
options = {CONNECTTIMEOUT: 2};
keys = ["EFFECTIVE_URL", "CONTENT_TYPE", "PRIVATE", "FTP_ENTRY_PATH", "REDIRECT_URL", "PRIMARY_IP", "RTSP_SESSION_ID", "LOCAL_IP"]
curl = Curl.create(options)
url = 'www.nodejs.org';
curl(url,  function(err) {
  self = this
  keys.forEach(function(key) {
    console.info("\x1b[33m" + key + ": [" + self.info(key) + "]\x1b[0m");
  })
  console.info("body length: " + this.body.length);
  this.close()
});
curl = Curl.create(options)
url = 'www.yahoo.com'
curl(url, function(err) {
  self = this
  keys.forEach(function(key) {
    console.info("\x1b[33m" + key + ": [" + self.info(key) + "]\x1b[0m");
  })
  console.info("body length: " + this.body.length);
  this.close()
});
curl = Curl.create(options)
curl('https://www.google.com', {VERBOSE: 1, RAW: 1}, function(err) {
  self = this
  keys.forEach(function(key) {
    console.info("\x1b[33m" + key + ": [" + self.info(key) + "]\x1b[0m");
  })
  console.info("body length: " + this.body.length);
  this.close()
});
