//only run on win32
if (process.platform !== 'win32') {
  process.exit(0);
}

/*
 * Notes about this script:
 * It's a mess because of the callback hell, I could have used a promise library here,
 * but adding a dependency that is going to be used only in a single script, that is executed
 * only on Windows machines during install is not worth it.
 */

var exec = require('child_process').exec,
  path = require('path'),
  fs = require('fs');

var execConfig = {
    cwd: path.resolve(__dirname + '/..'),
  },
  depsGypTarget = 'curl-for-windows/curl.gyp:libcurl';

var fileWithDepsTag = 'LIBCURL_VERSION_WIN_DEPS';
var depsRepo = 'https://github.com/JCMais/curl-for-windows.git';
var envCurlForWindowsDepsVersionTag = process.env.NODE_LIBCURL_WINDEPS_TAG;

// Check if we are on the root git dir. That is, someone is running this
//  directly from the node-libcurl repo.
exec('git rev-parse --show-toplevel', execConfig, function(err, stdout) {
  // Make sure we are the root git repo
  //  path.relative will return an empty string if both paths are equal
  if (!err && path.relative(execConfig.cwd, stdout.trim()) === '') {
    replaceTokensOnGypFiles(path.resolve(__dirname, '..', 'deps', 'curl-for-windows'));
    process.stdout.write('deps/' + depsGypTarget);
  } else {
    retrieveWinDeps();
  }
});

function retrieveWinDeps() {
  var depsTag;
  var fileExists = fs.existsSync(fileWithDepsTag);

  if (!fileExists && !envCurlForWindowsDepsVersionTag) {
    console.error('File: ', fileWithDepsTag, ' not found, and no NODE_LIBCURL_WINDEPS_TAG environment variable found.');
    return process.exit(1);
  }

  depsTag = envCurlForWindowsDepsVersionTag
    ? envCurlForWindowsDepsVersionTag.trim()
    : fs
        .readFileSync(fileWithDepsTag)
        .toString()
        .replace(/\n|\s/g, '');

  exec('git clone --branch ' + depsTag + ' ' + depsRepo, execConfig, function(err) {
    if (err) {
      if (err.toString().indexOf('already exists and is not an empty directory') !== -1) {
        exec('rmdir curl-for-windows /S /Q', execConfig, function(err) {
          if (err) {
            console.error(err.toString());
            process.exit(1);
          }

          retrieveWinDeps();
        });
      } else {
        console.error(err.toString());
        process.exit(1);
      }
    } else {
      exec('cd curl-for-windows && git submodule update --init && python configure.py', execConfig, function(err) {
        if (err) {
          console.error(err.toString());
          process.exit(1);
        }

        // Grab gyp config files and replace <(library) with static_library
        replaceTokensOnGypFiles(path.resolve(__dirname, '..', 'curl-for-windows'));

        // remove git folder
        exec('rmdir curl-for-windows\\.git /S /Q', execConfig, function(err) {
          if (err) {
            console.error(err.toString());
            process.exit(1);
          }

          process.stdout.write(depsGypTarget);
        });
      });
    }
  });
}

function replaceTokensOnGypFiles(dir) {
  var filesToCheck = ['libssh2.gyp', 'openssl/openssl.gyp', 'zlib.gyp', 'curl.gyp'],
    search = /<\(library\)/g,
    replacement = 'static_library',
    i,
    len,
    file;

  for (i = 0, len = filesToCheck.length; i < len; i++) {
    file = path.resolve(dir, filesToCheck[i]);

    replaceOnFile(file, search, replacement);
  }
}

function replaceOnFile(file, search, replacement) {
  var fileContent;

  if (!fs.existsSync(file)) {
    console.error('File: ', file, ' not found.');
    process.exit(1);
  }

  fileContent = fs.readFileSync(file).toString();

  fileContent = fileContent.replace(search, replacement);

  fs.writeFileSync(file, fileContent);
}
