#!/bin/bash
# This must be run from the root of the repo, and the following variables must be available:
#  GIT_COMMIT
#  GIT_TAG
# In case it's needed to use the vars declared here, this should be sourced on the current shell
#  . ./scripts/ci/build.sh
set -euvo pipefail

curr_dirname=$(dirname "$0")

. $curr_dirname/utils/gsort.sh

FORCE_REBUILD=false
# if [[ ! -z "$GIT_TAG" ]]; then
#   FORCE_REBUILD=true
# fi

export FORCE_REBUILD=$FORCE_REBUILD

if [ "$(uname)" == "Darwin" ]; then
  export MACOSX_DEPLOYMENT_TARGET=10.12
  export CFLAGS="-mmacosx-version-min=10.12"
  export CCFLAGS="-mmacosx-version-min=10.12"
  export CXXFLAGS="-mmacosx-version-min=10.12"
  export LDFLAGS="-mmacosx-version-min=10.12"
fi

function cat_slower() {
  echo "cat_slower called"
  # Disabled, only really interesting if we need to debug something
  # # hacky way to slow down the output of cat
  # CI=${CI:-}
  # # the grep is to ignore lines starting with |
  # # which for config.log files are the source used to test something
  # [ "$CI" == "true" ] && (cat $1 | grep "^[^|]" | perl -pe 'select undef,undef,undef,0.0033333333') || true
}

PREFIX_DIR=${PREFIX_DIR:-$HOME}
STOP_ON_INSTALL=${STOP_ON_INSTALL:-false}

# Disabled by default
# Reason for that can be found on the README.md
HAS_GSS_API=${HAS_GSS_API:-0}
# can be heimdal or kerberos
# heimdal is the default because the generated addon is smaller
# addon built with heimdal ~= 2,20 mb
# addon built with kerberos ~= 3,73 mb
GSS_LIBRARY=${GSS_LIBRARY:-kerberos}

# The following two, libunistring and libidn2, are only necessary if building libcurl >= 7.53
# However we are going to build then anyway, they are not that slow to build.

###################
# Build libunistring
###################
LIBUNISTRING_RELEASE=${LIBUNISTRING_RELEASE:-0.9.10}
LIBUNISTRING_DEST_FOLDER=$PREFIX_DIR/deps/libunistring
echo "Building libunistring v$LIBUNISTRING_RELEASE"
./scripts/ci/build-libunistring.sh $LIBUNISTRING_RELEASE $LIBUNISTRING_DEST_FOLDER >/dev/null 2>&1
export LIBUNISTRING_BUILD_FOLDER=$LIBUNISTRING_DEST_FOLDER/build/$LIBUNISTRING_RELEASE
ls -al $LIBUNISTRING_BUILD_FOLDER/lib

###################
# Build libidn2
###################
LIBIDN2_RELEASE=${LIBIDN2_RELEASE:-2.1.1}
LIBIDN2_DEST_FOLDER=$PREFIX_DIR/deps/libidn2
./scripts/ci/build-libidn2.sh $LIBIDN2_RELEASE $LIBIDN2_DEST_FOLDER >/dev/null 2>&1
export LIBIDN2_BUILD_FOLDER=$LIBIDN2_DEST_FOLDER/build/$LIBIDN2_RELEASE
ls -al $LIBIDN2_BUILD_FOLDER/lib

###################
# Build OpenSSL
###################
# OpenSSL version must match Node.js one
OPENSSL_RELEASE=${OPENSSL_RELEASE:-$(node -e "console.log(process.versions.openssl)")}
OPENSSL_DEST_FOLDER=$PREFIX_DIR/deps/openssl

# We must pass KERNEL_BITS=64 on macOS to make sure a x86_64 lib is built, the default is to build an i386 one
if [ "$(uname)" == "Darwin" ]; then
  export KERNEL_BITS=64
fi
# no-async is required on alpine
openssl_params=()
if [[ -f /etc/alpine-release ]]; then
    openssl_params+=(no-async)
fi
echo "Building openssl v$OPENSSL_RELEASE"
# Weird concatenation of the array with itself is needed
#  because on bash <= 4, using [@] to access an array with 0 elements
#  gives an error with set -o pipefail
./scripts/ci/build-openssl.sh $OPENSSL_RELEASE $OPENSSL_DEST_FOLDER ${openssl_params+"${openssl_params[@]}"} >/dev/null 2>&1
export OPENSSL_BUILD_FOLDER=$OPENSSL_DEST_FOLDER/build/$OPENSSL_RELEASE
ls -al $OPENSSL_BUILD_FOLDER/lib
unset KERNEL_BITS

###################
# Build nghttp2
###################
# nghttp2 version must match Node.js one
NGHTTP2_RELEASE=${NGHTTP2_RELEASE:-$(node -e "console.log(process.versions.nghttp2)")}
NGHTTP2_DEST_FOLDER=$PREFIX_DIR/deps/nghttp2
echo "Building nghttp2 v$NGHTTP2_RELEASE"
./scripts/ci/build-nghttp2.sh $NGHTTP2_RELEASE $NGHTTP2_DEST_FOLDER
export NGHTTP2_BUILD_FOLDER=$NGHTTP2_DEST_FOLDER/build/$NGHTTP2_RELEASE
ls -al $NGHTTP2_BUILD_FOLDER/lib

###################
# Build GSS API Lib
###################

if [ "$HAS_GSS_API" == "1" ]; then

  if [ "$GSS_LIBRARY" == "kerberos" ]; then

    ###################
    # Build MIT Kerberos
    ###################
    KERBEROS_RELEASE=${KERBEROS_RELEASE:-1.17}
    KERBEROS_DEST_FOLDER=$PREFIX_DIR/deps/kerberos
    echo "Building kerberos v$KERBEROS_RELEASE"
    ./scripts/ci/build-kerberos.sh $KERBEROS_RELEASE $KERBEROS_DEST_FOLDER
    export KERBEROS_BUILD_FOLDER=$KERBEROS_DEST_FOLDER/build/$KERBEROS_RELEASE
    ls -al $KERBEROS_BUILD_FOLDER/lib

  elif [ "$GSS_LIBRARY" == "heimdal" ]; then

    ###################
    # Build ncurses (dep of heimdal)
    ###################
    NCURSES_RELEASE=${NCURSES_RELEASE:-6.1}
    NCURSES_DEST_FOLDER=$PREFIX_DIR/deps/ncurses
    echo "Building ncurses v$NCURSES_RELEASE"
    ./scripts/ci/build-ncurses.sh $NCURSES_RELEASE $NCURSES_DEST_FOLDER
    export NCURSES_BUILD_FOLDER=$NCURSES_DEST_FOLDER/build/$NCURSES_RELEASE
    ls -al $NCURSES_BUILD_FOLDER/lib

    ###################
    # Build heimdal
    ###################
    HEIMDAL_RELEASE=${HEIMDAL_RELEASE:-7.5.0}
    HEIMDAL_DEST_FOLDER=$PREFIX_DIR/deps/heimdal
    echo "Building heimdal v$HEIMDAL_RELEASE"
    ./scripts/ci/build-heimdal.sh $HEIMDAL_RELEASE $HEIMDAL_DEST_FOLDER
    export HEIMDAL_BUILD_FOLDER=$HEIMDAL_DEST_FOLDER/build/$HEIMDAL_RELEASE
    ls -al $HEIMDAL_BUILD_FOLDER/lib
  fi
fi

###################
# Build brotli
###################
# Brotli version must match Node.js one
# But brotli only started being shipped with Node 12
BROTLI_NODEJS=$(node -e "console.log(process.versions.brotli || '')")
BROTLI_DEFAULT_RELEASE=${BROTLI_NODEJS:-1.0.7}
BROTLI_RELEASE=${BROTLI_RELEASE:-$BROTLI_DEFAULT_RELEASE}
BROTLI_DEST_FOLDER=$PREFIX_DIR/deps/brotli
echo "Building brotli v$BROTLI_RELEASE"
./scripts/ci/build-brotli.sh $BROTLI_RELEASE $BROTLI_DEST_FOLDER
export BROTLI_BUILD_FOLDER=$BROTLI_DEST_FOLDER/build/$BROTLI_RELEASE
ls -al $BROTLI_BUILD_FOLDER/lib

###################
# Build zlib
###################
# Zlib version must match Node.js one
ZLIB_RELEASE=${ZLIB_RELEASE:-$(node -e "console.log(process.versions.zlib)")}
ZLIB_DEST_FOLDER=$PREFIX_DIR/deps/zlib
echo "Building zlib v$ZLIB_RELEASE"
./scripts/ci/build-zlib.sh $ZLIB_RELEASE $ZLIB_DEST_FOLDER
export ZLIB_BUILD_FOLDER=$ZLIB_DEST_FOLDER/build/$ZLIB_RELEASE
ls -al $ZLIB_BUILD_FOLDER/lib

###################
# Build libssh2
###################
LIBSSH2_RELEASE=${LIBSSH2_RELEASE:-1.9.0}
LIBSSH2_DEST_FOLDER=$PREFIX_DIR/deps/libssh2
echo "Building libssh2 v$LIBSSH2_RELEASE"
./scripts/ci/build-libssh2.sh $LIBSSH2_RELEASE $LIBSSH2_DEST_FOLDER
export LIBSSH2_BUILD_FOLDER=$LIBSSH2_DEST_FOLDER/build/$LIBSSH2_RELEASE
ls -al $LIBSSH2_BUILD_FOLDER/lib

###################
# Build openldap
###################
OPENLDAP_RELEASE=${OPENLDAP_RELEASE:-2.4.47}
OPENLDAP_DEST_FOLDER=$PREFIX_DIR/deps/openldap
echo "Building openldap v$OPENLDAP_RELEASE"
./scripts/ci/build-openldap.sh $OPENLDAP_RELEASE $OPENLDAP_DEST_FOLDER
export OPENLDAP_BUILD_FOLDER=$OPENLDAP_DEST_FOLDER/build/$OPENLDAP_RELEASE
ls -al $OPENLDAP_BUILD_FOLDER/lib

###################
# Build libcurl
###################
LIBCURL_ORIGINAL_RELEASE=${LIBCURL_RELEASE:-LATEST}
LATEST_LIBCURL_RELEASE=${LATEST_LIBCURL_RELEASE:-$(./scripts/ci/get-latest-libcurl-version.sh)}
LIBCURL_RELEASE=$LIBCURL_ORIGINAL_RELEASE
if [[ $LIBCURL_RELEASE == "LATEST" ]]; then
  LIBCURL_RELEASE=$LATEST_LIBCURL_RELEASE
fi
LIBCURL_DEST_FOLDER=$PREFIX_DIR/deps/libcurl
echo "Building libcurl v$LIBCURL_RELEASE - Latest is v$LATEST_LIBCURL_RELEASE"
./scripts/ci/build-libcurl.sh $LIBCURL_RELEASE $LIBCURL_DEST_FOLDER || (echo "libcurl failed build log:" && cat_slower $LIBCURL_DEST_FOLDER/source/$LIBCURL_RELEASE/config.log && exit 1)
echo "libcurl successful build log:"
cat_slower $LIBCURL_DEST_FOLDER/source/$LIBCURL_RELEASE/config.log

export LIBCURL_BUILD_FOLDER=$LIBCURL_DEST_FOLDER/build/$LIBCURL_RELEASE
ls -al $LIBCURL_BUILD_FOLDER/lib
export PATH=$LIBCURL_DEST_FOLDER/build/$LIBCURL_RELEASE/bin:$PATH
export LIBCURL_RELEASE=$LIBCURL_RELEASE

curl --version
curl-config --version
curl-config --libs
curl-config --static-libs
curl-config --prefix
curl-config --cflags

# Some vars we will need below
DISPLAY=${DISPLAY:-}
PUBLISH_BINARY=${PUBLISH_BINARY:-}
ELECTRON_VERSION=${ELECTRON_VERSION:-}
NWJS_VERSION=${NWJS_VERSION:-}

if [ -z "$PUBLISH_BINARY" ]; then
  PUBLISH_BINARY=false
  COMMIT_MESSAGE=$(git show -s --format=%B $GIT_COMMIT | tr -d '\n')
  if [[ $GIT_TAG == `git describe --tags --always HEAD` || ${COMMIT_MESSAGE} =~ "[publish binary]" ]]; then
    PUBLISH_BINARY=true;
  fi
fi

echo "Publish binary is: $PUBLISH_BINARY"

# Configure Yarn cache
mkdir -p ~/.cache/yarn
yarn config set cache-folder ~/.cache/yarn

run_tests_electron=false
has_display=$(xdpyinfo -display $DISPLAY >/dev/null 2>&1 && echo "true" || echo "false")

if [ -n "$ELECTRON_VERSION" ]; then
  runtime='electron'
  dist_url='https://atom.io/download/electron'
  target="$ELECTRON_VERSION"
  
  # enabled always temporarily
  is_electron_lt_5=1
  # is_electron_lt_5=0
  # (printf '%s\n%s' "5.0.0" "$ELECTRON_VERSION" | $gsort -CV) || is_electron_lt_5=$?

  # if it's lower, we can run tests against it
  # we cannot run tests against version 5 because it has issues:
  # https://github.com/electron/electron/issues/17972
  if [[ $is_electron_lt_5 -eq 1 && $has_display == "true" ]]; then
    run_tests_electron=true

    yarn global add electron@${ELECTRON_VERSION}
  fi

  # A possible solution to the above issue is the following,
  #  but it kinda does not work because it requires running docker with --privileged flag
  # yarn_global_dir=$(yarn global dir)

  # # Below is to fix the following error:
  # # [19233:0507/005247.965078:FATAL:setuid_sandbox_host.cc(157)] The SUID sandbox helper binary was found, but is not 
  # #  configured correctly. Rather than run without sandboxing I'm aborting now. You need to make sure that 
  # # /home/circleci/node-libcurl/node_modules/electron/dist/chrome-sandbox is owned by root and has mode 4755.
  # if [[ -x "$(command -v sudo)" && "$EUID" -ne 0 && -f $yarn_global_dir/node_modules/electron/dist/chrome-sandbox ]]; then
  #   echo "Changing owner of chrome-sandbox"
  #   sudo chown root $yarn_global_dir/node_modules/electron/dist/chrome-sandbox
  #   sudo chmod 4755 $yarn_global_dir/node_modules/electron/dist/chrome-sandbox
  # fi
elif [ -n "$NWJS_VERSION" ]; then
  runtime='node-webkit'
  dist_url=''
  target="$NWJS_VERSION"

  yarn global add nw-gyp nw@$target

  # On macOS node-pre-gyp uses node-webkit instead of nw, see:
  # https://github.com/mapbox/node-pre-gyp/blob/d60bc992d20500e8ceb6fe3242df585a28c56413/lib/testbinary.js#L43
  if [ "$(uname)" == "Darwin" ]; then
    ln -s $(yarn global bin)/nw $(yarn global bin)/node-webkit
  fi

else
  runtime=''
  dist_url=''
  target=''
fi

target=`echo $target | sed 's/^v//'`
# ia32, x64, armv7, etc
target_arch=${TARGET_ARCH:-"x64"}

# Build Addon
export npm_config_curl_config_bin="$LIBCURL_DEST_FOLDER/build/$LIBCURL_RELEASE/bin/curl-config"
export npm_config_curl_static_build="true"
export npm_config_build_from_source="true"
export npm_config_runtime="$runtime"
export npm_config_dist_url="$dist_url"
export npm_config_target="$target"
export npm_config_target_arch="$target_arch"

yarn install --frozen-lockfile

if [ "$STOP_ON_INSTALL" == "true" ]; then
  set +uv
  exit 0
fi

# Print addon deps for debugging
# if [[ $TRAVIS_OS_NAME == "osx" ]]; then
ls -alh ./lib/binding/
if [ "$(uname)" == "Darwin" ]; then
  otool -L ./lib/binding/node_libcurl.node || true
else
  cat ./build/node_libcurl.target.mk || true
  readelf -d ./lib/binding/node_libcurl.node || true
  ldd ./lib/binding/node_libcurl.node || true
fi

if [ -n "$ELECTRON_VERSION" ]; then
  [ $run_tests_electron == "true" ] && yarn test:electron || echo "Tests for this version of electron were disabled"
elif [ -n "$NWJS_VERSION" ]; then
  echo "No tests available for node-webkit (nw.js)"
else
  yarn ts-node -e "console.log(require('./lib').Curl.getVersionInfoString())" || true
  yarn test
fi

# If we are here, it means the addon worked
# Check if we need to publish the binaries
if [[ $PUBLISH_BINARY == true && $LIBCURL_RELEASE == $LATEST_LIBCURL_RELEASE ]]; then
  echo "Publish binary is true - Testing and publishing package with pregyp"
  yarn pregyp package testpackage --verbose
  node scripts/module-packaging.js --publish "$(yarn --silent pregyp reveal staged_tarball --silent)"
fi

# In case we published the binaries, verify if we can download them, and that they work
# Otherwise, unpublish them
INSTALL_RESULT=0
if [[ $PUBLISH_BINARY == true ]]; then
  echo "Publish binary is true - Testing if it was published correctly"
  INSTALL_RESULT=$(npm_config_fallback_to_build=false yarn install --frozen-lockfile > /dev/null)$? || true
fi
if [[ $INSTALL_RESULT != 0 ]]; then
  echo "Failed to install package from npm after being published"
  node scripts/module-packaging.js --unpublish "$(yarn --silent pregyp reveal hosted_tarball --silent)"
  false
fi

# Clean everything
yarn pregyp clean

set +uv
