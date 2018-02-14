var exec = require('child_process').exec;

var argv = process.argv;

if (!argv[2]) {
  console.error('Missing argument to curl-config');
  process.exit(1);
}

var arg = argv[2].trim();

exec('curl-config ' + arg, function(error, stdout, stderr) {
  if (error != null) {
    console.error('Could not run curl-config, please make sure libcurl dev package is installed.');
    console.error('Output: ' + stderr);
    process.exit(1);
  }

  console.log(stdout);
  process.exit(0);
});
