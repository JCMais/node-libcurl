const { exec, execSync } = require('child_process')

const { argv } = process

if (!argv[2]) {
  console.error('Missing argument to curl-config')
  exit(1)
}

const arg = argv[2].trim()

exec('curl-config ' + arg, function(error, stdout, stderr) {
  console.error('That is what we got:')
  console.error({
    PATH: process.env.PATH,
    PATH_exec: execSync('echo $PATH').toString('utf-8'),
    which_curl_config: execSync('which curl-config').toString('utf-8'),
    curl_config_libs: execSync('curl-config --libs').toString('utf-8'),
    curl_config_static_libs: execSync('curl-config --static-libs').toString(
      'utf-8'
    ),
    curl_config_cflags: execSync('curl-config --cflags').toString('utf-8'),
  })
  console.error(stdout)
  process.exit(1)
  if (error != null) {
    console.error(
      'Could not run curl-config, please make sure libcurl dev package is installed.'
    )
    console.error('Output: ' + stderr)
    process.exit(1)
  }

  console.log(stdout)
  process.exit(0)
})
