Curl = require('../index');

defaultOptions = {CONNECTTIMEOUT: 2};
keys = ["EFFECTIVE_URL", "CONTENT_TYPE", "PRIVATE", "FTP_ENTRY_PATH", "REDIRECT_URL", "PRIMARY_IP", "RTSP_SESSION_ID", "LOCAL_IP"];

function print(text, color) {
  if (!/^\d+$/.test(color)) {
    color = {red: 31, green: 32, yellow: 33}[color];
  }

  if (!color)
    return console.info(text);

  console.info("\x1b[" + color + "m" + text + "\x1b[0m");
}

requests = [
  ['www.nodejs.org'],
  ['www.yahoo.com'],
  ['https://www.google.com', {VERBOSE: 1, RAW: 1}]
];

requests.forEach(function(request) {
  url = request[0];
  options = request[1];
  if (!options)
    options = {};

  curl = Curl.create(defaultOptions);
  print('GET ' + url, 'green')
  curl(url, options, function(err) {
    print('GET ' + this.url + ' ' + JSON.stringify(this.effectiveOptions) + " finished.",  'green');

    if (err)
      return print(err, 'red');

    self = this;
    keys.forEach(function(key) {
      print("\t" + key + ": [" + self.info(key) + "]", 'yellow');
    })

    print("\tbody length: " + this.body.length);
    this.close();
  });
});
