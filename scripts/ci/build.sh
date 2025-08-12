#!/usr/bin/env bash
# This must be run from the root of the repo, and the following variables must be available:
#  GIT_COMMIT
#  GIT_TAG
# In case it's needed to use the vars declared here, this should be sourced on the current shell
#  . ./scripts/ci/build.sh
set -euvo pipefail

echo "node-gyp version: $(npm ls node-gyp -g)"

curr_dirname=$(dirname "$0")

. $curr_dirname/utils/gsort.sh

FORCE_REBUILD=false
# if [[ ! -z "$GIT_TAG" ]]; then
#   FORCE_REBUILD=true
# fi

export FORCE_REBUILD=$FORCE_REBUILD

MACOS_UNIVERSAL_BUILD=${MACOS_UNIVERSAL_BUILD:-}

if [ "$(uname)" == "Darwin" ]; then
  # Default to universal build, if possible.
  if [ -z "$MACOS_UNIVERSAL_BUILD" ]; then
    export MACOS_UNIVERSAL_BUILD="$(node -e "console.log(process.versions.openssl >= '1.1.1i')")"
  fi

  if [ "$MACOS_UNIVERSAL_BUILD" == "true" ]; then
    export CMAKE_OSX_ARCHITECTURES="arm64;x86_64"
    export MACOS_ARCH_FLAGS="-arch arm64 -arch x86_64"
  else
    export MACOS_ARCH_FLAGS=""
  fi

  export MACOSX_DEPLOYMENT_TARGET=10.15
  export MACOS_TARGET_FLAGS="-mmacosx-version-min=$MACOSX_DEPLOYMENT_TARGET"

  export CFLAGS="$MACOS_TARGET_FLAGS $MACOS_ARCH_FLAGS"
  export CCFLAGS="$MACOS_TARGET_FLAGS"
  export CXXFLAGS="$MACOS_TARGET_FLAGS"
  export LDFLAGS="$MACOS_TARGET_FLAGS $MACOS_ARCH_FLAGS"
fi

PREFIX_DIR=${PREFIX_DIR:-$HOME}
STOP_ON_INSTALL=${STOP_ON_INSTALL:-false}
RUN_PREGYP_CLEAN=${RUN_PREGYP_CLEAN:-true}

# Disabled by default
# Reason for that can be found on the README.md
HAS_GSS_API=${HAS_GSS_API:-0}
# can be heimdal or kerberos
# heimdal is the default because the generated addon is smaller
# addon built with heimdal ~= 2,20 mb
# addon built with kerberos ~= 3,73 mb
GSS_LIBRARY=${GSS_LIBRARY:-kerberos}

LOGS_FOLDER=${BUILD_LOGS_FOLDER:-./logs}

mkdir -p $LOGS_FOLDER

# ia32, x64, armv7, etc
target_arch=${TARGET_ARCH:-"$(node -e 'console.log(process.arch)')"}
# the build system of some dependencies (e.g. zstd and openldap) seems to read
# and use this variable, so unset it here to avoid making them fail
unset TARGET_ARCH

# The following two, libunistring and libidn2, are only necessary if building libcurl >= 7.53
# However we are going to build then anyway, they are not that slow to build.

###################
# Build cares
###################
# c-ares is disabled at the moment due to this: https://github.com/JCMais/node-libcurl/issues/280
# CARES_RELEASE=${CARES_RELEASE:-$(node -e "console.log(process.versions.ares || '1.16.1')")}
# CARES_DEST_FOLDER=$PREFIX_DIR/deps/cares
# echo "Building cares v$CARES_RELEASE"
# ./scripts/ci/build-cares.sh $CARES_RELEASE $CARES_DEST_FOLDER >$LOGS_FOLDER/build-cares.log 2>&1
# export CARES_BUILD_FOLDER=$CARES_DEST_FOLDER/build/$CARES_RELEASE
# ls -al $CARES_BUILD_FOLDER/lib

###################
# Build libunistring
###################
LIBUNISTRING_RELEASE=${LIBUNISTRING_RELEASE:-0.9.10}
LIBUNISTRING_DEST_FOLDER=$PREFIX_DIR/deps/libunistring
echo "Building libunistring v$LIBUNISTRING_RELEASE"
./scripts/ci/build-libunistring.sh $LIBUNISTRING_RELEASE $LIBUNISTRING_DEST_FOLDER >$LOGS_FOLDER/build-libunistring.log 2>&1
export LIBUNISTRING_BUILD_FOLDER=$LIBUNISTRING_DEST_FOLDER/build/$LIBUNISTRING_RELEASE
ls -al $LIBUNISTRING_BUILD_FOLDER/lib

###################
# Build libidn2
###################
LIBIDN2_RELEASE=${LIBIDN2_RELEASE:-2.1.1}
LIBIDN2_DEST_FOLDER=$PREFIX_DIR/deps/libidn2
./scripts/ci/build-libidn2.sh $LIBIDN2_RELEASE $LIBIDN2_DEST_FOLDER >$LOGS_FOLDER/build-libidn2.log 2>&1
export LIBIDN2_BUILD_FOLDER=$LIBIDN2_DEST_FOLDER/build/$LIBIDN2_RELEASE
ls -al $LIBIDN2_BUILD_FOLDER/lib

###################
# Build OpenSSL
###################
# OpenSSL version must match Node.js one
OPENSSL_RELEASE=${OPENSSL_RELEASE:-$(node -e "console.log(process.versions.openssl.replace('+quic', ''))")}

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
echo "[DEBUG] ./scripts/ci/build-openssl.sh $OPENSSL_RELEASE $OPENSSL_DEST_FOLDER ${openssl_params+\"${openssl_params[@]}\"} >$LOGS_FOLDER/build-openssl.log 2>&1"
./scripts/ci/build-openssl.sh $OPENSSL_RELEASE $OPENSSL_DEST_FOLDER ${openssl_params+"${openssl_params[@]}"} >$LOGS_FOLDER/build-openssl.log 2>&1
export OPENSSL_BUILD_FOLDER=$OPENSSL_DEST_FOLDER/build/$OPENSSL_RELEASE
ls -al $OPENSSL_BUILD_FOLDER/lib*
unset KERNEL_BITS

###################
# Build nghttp2
###################
# nghttp2 version must match Node.js one
NGHTTP2_RELEASE=${NGHTTP2_RELEASE:-$(node -e "console.log(process.versions.nghttp2)")}
NGHTTP2_DEST_FOLDER=$PREFIX_DIR/deps/nghttp2
echo "Building nghttp2 v$NGHTTP2_RELEASE"
./scripts/ci/build-nghttp2.sh $NGHTTP2_RELEASE $NGHTTP2_DEST_FOLDER >$LOGS_FOLDER/build-nghttp2.log 2>&1
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
    ./scripts/ci/build-kerberos.sh $KERBEROS_RELEASE $KERBEROS_DEST_FOLDER >$LOGS_FOLDER/build-kerberos.log 2>&1
    export KERBEROS_BUILD_FOLDER=$KERBEROS_DEST_FOLDER/build/$KERBEROS_RELEASE
    ls -al $KERBEROS_BUILD_FOLDER/lib

  elif [ "$GSS_LIBRARY" == "heimdal" ]; then

    ###################
    # Build ncurses (dep of heimdal)
    ###################
    NCURSES_RELEASE=${NCURSES_RELEASE:-6.1}
    NCURSES_DEST_FOLDER=$PREFIX_DIR/deps/ncurses
    echo "Building ncurses v$NCURSES_RELEASE"
    ./scripts/ci/build-ncurses.sh $NCURSES_RELEASE $NCURSES_DEST_FOLDER >$LOGS_FOLDER/build-ncurses.log 2>&1
    export NCURSES_BUILD_FOLDER=$NCURSES_DEST_FOLDER/build/$NCURSES_RELEASE
    ls -al $NCURSES_BUILD_FOLDER/lib

    ###################
    # Build heimdal
    ###################
    HEIMDAL_RELEASE=${HEIMDAL_RELEASE:-7.5.0}
    HEIMDAL_DEST_FOLDER=$PREFIX_DIR/deps/heimdal
    echo "Building heimdal v$HEIMDAL_RELEASE"
    ./scripts/ci/build-heimdal.sh $HEIMDAL_RELEASE $HEIMDAL_DEST_FOLDER >$LOGS_FOLDER/build-heimdal.log 2>&1
    export HEIMDAL_BUILD_FOLDER=$HEIMDAL_DEST_FOLDER/build/$HEIMDAL_RELEASE
    ls -al $HEIMDAL_BUILD_FOLDER/lib
  fi
fi

###################
# Build brotli
###################
# Brotli version must match Node.js one
# But brotli only started being shipped with Node 12
# BROTLI_NODEJS=$(node -e "console.log(process.versions.brotli || '')")
BROTLI_DEFAULT_RELEASE=${BROTLI_NODEJS:-1.0.9}
BROTLI_RELEASE=${BROTLI_RELEASE:-$BROTLI_DEFAULT_RELEASE}
BROTLI_DEST_FOLDER=$PREFIX_DIR/deps/brotli
echo "Building brotli v$BROTLI_RELEASE"
./scripts/ci/build-brotli.sh $BROTLI_RELEASE $BROTLI_DEST_FOLDER >$LOGS_FOLDER/build-brotli.log 2>&1
export BROTLI_BUILD_FOLDER=$BROTLI_DEST_FOLDER/build/$BROTLI_RELEASE
ls -al $BROTLI_BUILD_FOLDER/lib

###################
# Build zlib
###################
# Zlib version must match Node.js one
#ZLIB_RELEASE=${ZLIB_RELEASE:-$(node -e "console.log(process.versions.zlib)")}
ZLIB_RELEASE=${ZLIB_RELEASE:-1.3.1}

ZLIB_DEST_FOLDER=$PREFIX_DIR/deps/zlib
echo "Building zlib v$ZLIB_RELEASE"
./scripts/ci/build-zlib.sh $ZLIB_RELEASE $ZLIB_DEST_FOLDER >$LOGS_FOLDER/build-zlib.log 2>&1
export ZLIB_BUILD_FOLDER=$ZLIB_DEST_FOLDER/build/$ZLIB_RELEASE
ls -al $ZLIB_BUILD_FOLDER/lib

###################
# Build zstd
###################
# We could build this only if libcurl version >= 7.72
ZSTD_RELEASE=${ZSTD_RELEASE:-1.4.9}
ZSTD_DEST_FOLDER=$PREFIX_DIR/deps/zstd
echo "Building zstd v$ZSTD_RELEASE"
./scripts/ci/build-zstd.sh $ZSTD_RELEASE $ZSTD_DEST_FOLDER >$LOGS_FOLDER/build-zstd.log 2>&1
export ZSTD_BUILD_FOLDER=$ZSTD_DEST_FOLDER/build/$ZSTD_RELEASE
ls -al $ZSTD_BUILD_FOLDER/lib

###################
# Build libssh2
###################
LIBSSH2_RELEASE=${LIBSSH2_RELEASE:-1.11.0}
LIBSSH2_DEST_FOLDER=$PREFIX_DIR/deps/libssh2
echo "Building libssh2 v$LIBSSH2_RELEASE"
./scripts/ci/build-libssh2.sh $LIBSSH2_RELEASE $LIBSSH2_DEST_FOLDER >$LOGS_FOLDER/build-libssh2.log 2>&1
export LIBSSH2_BUILD_FOLDER=$LIBSSH2_DEST_FOLDER/build/$LIBSSH2_RELEASE
ls -al $LIBSSH2_BUILD_FOLDER/lib

###################
# Build openldap
###################
OPENLDAP_RELEASE=${OPENLDAP_RELEASE:-2.6.8}
OPENLDAP_DEST_FOLDER=$PREFIX_DIR/deps/openldap
echo "Building openldap v$OPENLDAP_RELEASE"
./scripts/ci/build-openldap.sh $OPENLDAP_RELEASE $OPENLDAP_DEST_FOLDER >$LOGS_FOLDER/build-openldap.log 2>&1
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
./scripts/ci/build-libcurl.sh $LIBCURL_RELEASE $LIBCURL_DEST_FOLDER || (echo "libcurl failed build log:" && cat $LIBCURL_DEST_FOLDER/source/$LIBCURL_RELEASE/config.log && exit 1)
# echo "libcurl successful build log:"
# cat $LIBCURL_DEST_FOLDER/source/$LIBCURL_RELEASE/config.log

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
RUN_TESTS=${RUN_TESTS:-"true"}

if [ -z "$PUBLISH_BINARY" ]; then
  PUBLISH_BINARY=false
  COMMIT_MESSAGE=$(git show -s --format=%B $GIT_COMMIT | tr -d '\n')
  if [[ $GIT_TAG == `git describe --tags --always HEAD` || ${COMMIT_MESSAGE} =~ "[publish binary]" ]]; then
    PUBLISH_BINARY=true;
  fi
fi

echo "Publish binary is: $PUBLISH_BINARY"

# # Configure npm run cache
# mkdir -p ~/.cache/npm
# npm config set cache ~/.cache/npm

run_tests_electron=false
has_display=$(xdpyinfo -display $DISPLAY >/dev/null 2>&1 && echo "true" || echo "false")

if [ -n "$ELECTRON_VERSION" ]; then
  runtime='electron'
  dist_url='https://electronjs.org/headers'
  target="$ELECTRON_VERSION"
  echo "electron version: ${ELECTRON_VERSION}"

  # enabled always temporarily
  is_electron_lt_5=1
  # is_electron_lt_5=0
  # (printf '%s\n%s' "5.0.0" "$ELECTRON_VERSION" | $gsort -CV) || is_electron_lt_5=$?

  # if it's lower, we can run tests against it
  # we cannot run tests against version 5 because it has issues:
  # https://github.com/electron/electron/issues/17972
  if [[ "$(uname)" == "Darwin" || $is_electron_lt_5 -eq 1 && $has_display == "true" ]]; then
    run_tests_electron=true
    npm i -g electron@"${ELECTRON_VERSION}"
  fi
else
  echo "WARNING: electron version NOT SET this is the nodejs build"
  runtime=''
  dist_url=''
  target=''
fi

target=`echo $target | sed 's/^v//'`

NODE_LIBCURL_CPP_STD=${NODE_LIBCURL_CPP_STD:-$(node $curr_dirname/../cpp-std.js)}

# Build Addon
export npm_config_curl_config_bin="$LIBCURL_DEST_FOLDER/build/$LIBCURL_RELEASE/bin/curl-config"
export npm_config_curl_static_build="true"
export npm_config_node_libcurl_cpp_std="$NODE_LIBCURL_CPP_STD"
export npm_config_build_from_source="true"
export npm_config_macos_universal_build="${MACOS_UNIVERSAL_BUILD:-false}"
export npm_config_runtime="$runtime"
export npm_config_dist_url="$dist_url"
export npm_config_target="$target"
export npm_config_target_arch="$target_arch"

echo "npm_config_curl_config_bin=$npm_config_curl_config_bin"
echo "npm_config_curl_static_build=$npm_config_curl_static_build"
echo "npm_config_node_libcurl_cpp_std=$npm_config_node_libcurl_cpp_std"
echo "npm_config_build_from_source=$npm_config_build_from_source"
echo "npm_config_macos_universal_build=$npm_config_macos_universal_build"
echo "npm_config_runtime=$npm_config_runtime"
echo "npm_config_dist_url=$npm_config_dist_url"
echo "npm_config_target=$npm_config_target"
echo "npm_config_target_arch=$npm_config_target_arch"

echo "node version: $(node -v)"
echo "npm run version: $(npm run -v)"
echo "node-gyp version: $(npm ls node-gyp -g)"
# https://github.com/nodejs/node-gyp/blob/main/docs/Updating-npm-bundled-node-gyp.md
# npm explore npm/node_modules/@npmcli/run-script -g -- npm_config_global=false npm install node-gyp@10.2.0

npm ci

echo "node-gyp version: $(npm ls node-gyp -g)"


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

if [ "$RUN_TESTS" == "true" ]; then
  if [ -n "$ELECTRON_VERSION" ]; then
    [ $run_tests_electron == "true" ] && npm run test:electron || echo "Tests for this version of electron were disabled"
  else
    npx ts-node -e "console.log(require('./lib').Curl.getVersionInfoString())" || true
    npm run test
  fi
fi

echo "=== node version: $(node -v)"

# If we are here, it means the addon worked
# Check if we need to publish the binaries
if [[ $PUBLISH_BINARY == true && $LIBCURL_RELEASE == $LATEST_LIBCURL_RELEASE ]]; then
  echo "=== Publish binary is true - Testing and publishing package with pregyp"
  if [[ "$MACOS_UNIVERSAL_BUILD" == "true" ]]; then
    # Need to publish two binaries when doing a universal build.
    # --
    # Build x64 package
    npm_config_target_arch=x64 npm run pregyp package testpackage --verbose
    npm_config_target_arch=x64 npm run --silent pregyp reveal staged_tarball --silent>package_x64.txt
    # npm_config_target_arch=x64 node scripts/module-packaging.js --publish \
    #   "$(npm_config_target_arch=x64 npm run --silent pregyp reveal staged_tarball --silent)"
    # Build arm64 package.
    npm_config_target_arch=arm64 npm run pregyp package --verbose  # Can't testpackage for arm64 yet.
    npm_config_target_arch=arm64 npm run --silent pregyp reveal staged_tarball --silent>package_arm64.txt
    # npm_config_target_arch=arm64 node scripts/module-packaging.js --publish \
    #   "$(npm_config_target_arch=arm64 npm run --silent pregyp reveal staged_tarball --silent)"
  else
    npm run pregyp package testpackage --verbose
    npm run --silent pregyp reveal staged_tarball --silent>package.txt
    # node scripts/module-packaging.js --publish "$(npm run --silent pregyp reveal staged_tarball --silent)"
  fi
fi

## Move this to action or a different script later
# echo "=== node version: $(node -v)"
# # In case we published the binaries, verify if we can download them, and that they work
# # Otherwise, unpublish them
# INSTALL_RESULT=0
# if [[ $PUBLISH_BINARY == true ]]; then
#   echo "=== Publish binary is true - Testing if it was published correctly"

#   INSTALL_RESULT=$(npm_config_fallback_to_build=false npm ci > /dev/null)$? || true
# fi
# if [[ $INSTALL_RESULT != 0 ]]; then
#   echo "=== Failed to install package from npm after being published"
#   node scripts/module-packaging.js --unpublish "$(npm run --silent pregyp reveal hosted_tarball --silent)"
#   false
# fi

# # Clean everything
# if [[ $RUN_PREGYP_CLEAN == true ]]; then
#   echo "=== cleanup"
#   npm run pregyp clean
# fi

set +uv
