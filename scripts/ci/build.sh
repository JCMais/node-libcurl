#!/bin/bash
# This must be run from the root of the repo, and the following variables must be available:
#  GIT_COMMIT
#  GIT_TAG
# In case it's needed to use the vars declared here, this should be sourced on the current shell
#  . ./scripts/ci/build.sh
set -euvo pipefail

FORCE_REBUILD=false
if [[ ! -z "$GIT_TAG" ]]; then
  FORCE_REBUILD=true
fi

export FORCE_REBUILD=$FORCE_REBUILD

if [ "$(uname)" == "Darwin" ]; then
  export MACOSX_DEPLOYMENT_TARGET=10.12
  export CFLAGS="-mmacosx-version-min=10.12"
  export CCFLAGS="-mmacosx-version-min=10.12"
  export CXXFLAGS="-mmacosx-version-min=10.12"
  export LDFLAGS="-mmacosx-version-min=10.12"
fi

HAS_GSS_API=${HAS_GSS_API:-1}
# can be heimdal or kerberos
# heimdal is the default because the generated addon is smaller
# addon built with heimdal ~= 2,20 mb
# addon built with kerberos ~= 3,73 mb
GSS_LIBRARY=${GSS_LIBRARY:-heimdal}

# The following two, libunistring and libidn2, are only necessary if building libcurl >= 7.53
# However we are going to build then anyway, they are not that slow to build.

###################
# Build libunistring
###################
LIBUNISTRING_RELEASE=${LIBUNISTRING_RELEASE:-0.9.10}
LIBUNISTRING_DEST_FOLDER=$HOME/deps/libunistring
echo "Building libunistring v$LIBUNISTRING_RELEASE"
./scripts/ci/build-libunistring.sh $LIBUNISTRING_RELEASE $LIBUNISTRING_DEST_FOLDER
export LIBUNISTRING_BUILD_FOLDER=$LIBUNISTRING_DEST_FOLDER/build/$LIBUNISTRING_RELEASE
ls -al $LIBUNISTRING_BUILD_FOLDER/lib

###################
# Build libidn2
###################
LIBIDN2_RELEASE=${LIBIDN2_RELEASE:-2.1.1}
LIBIDN2_DEST_FOLDER=$HOME/deps/libidn2
./scripts/ci/build-libidn2.sh $LIBIDN2_RELEASE $LIBIDN2_DEST_FOLDER
export LIBIDN2_BUILD_FOLDER=$LIBIDN2_DEST_FOLDER/build/$LIBIDN2_RELEASE
ls -al $LIBIDN2_BUILD_FOLDER/lib

###################
# Build nghttp2
###################
# nghttp2 version must match Node.js one
NGHTTP2_RELEASE=${NGHTTP2_RELEASE:-$(node -e "console.log(process.versions.nghttp2)")}
NGHTTP2_DEST_FOLDER=$HOME/deps/nghttp2
echo "Building nghttp2 v$NGHTTP2_RELEASE"
./scripts/ci/build-nghttp2.sh $NGHTTP2_RELEASE $NGHTTP2_DEST_FOLDER
export NGHTTP2_BUILD_FOLDER=$NGHTTP2_DEST_FOLDER/build/$NGHTTP2_RELEASE
ls -al $NGHTTP2_BUILD_FOLDER/lib

###################
# Build OpenSSL
###################
# OpenSSL version must match Node.js one
OPENSSL_RELEASE=${OPENSSL_RELEASE:-$(node -e "console.log(process.versions.openssl)")}
OPENSSL_DEST_FOLDER=$HOME/deps/openssl

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
./scripts/ci/build-openssl.sh $OPENSSL_RELEASE $OPENSSL_DEST_FOLDER ${openssl_params+"${openssl_params[@]}"}
export OPENSSL_BUILD_FOLDER=$OPENSSL_DEST_FOLDER/build/$OPENSSL_RELEASE
ls -al $OPENSSL_BUILD_FOLDER/lib
unset KERNEL_BITS

###################
# Build GSS API Lib
###################

if [ "$HAS_GSS_API" == "1" ]; then

  if [ "$GSS_LIBRARY" == "kerberos" ]; then

    ###################
    # Build MIT Kerberos
    ###################
    KERBEROS_RELEASE=${KERBEROS_RELEASE:-1.17}
    KERBEROS_DEST_FOLDER=$HOME/deps/kerberos
    echo "Building kerberos v$KERBEROS_RELEASE"
    ./scripts/ci/build-kerberos.sh $KERBEROS_RELEASE $KERBEROS_DEST_FOLDER
    export KERBEROS_BUILD_FOLDER=$KERBEROS_DEST_FOLDER/build/$KERBEROS_RELEASE
    ls -al $KERBEROS_BUILD_FOLDER/lib

  elif [ "$GSS_LIBRARY" == "heimdal" ]; then

    ###################
    # Build ncurses (dep of heimdal)
    ###################
    NCURSES_RELEASE=${NCURSES_RELEASE:-6.1}
    NCURSES_DEST_FOLDER=$HOME/deps/ncurses
    echo "Building ncurses v$NCURSES_RELEASE"
    ./scripts/ci/build-ncurses.sh $NCURSES_RELEASE $NCURSES_DEST_FOLDER
    export NCURSES_BUILD_FOLDER=$NCURSES_DEST_FOLDER/build/$NCURSES_RELEASE
    ls -al $NCURSES_BUILD_FOLDER/lib

    ###################
    # Build heimdal
    ###################
    HEIMDAL_RELEASE=${HEIMDAL_RELEASE:-7.5.0}
    HEIMDAL_DEST_FOLDER=$HOME/deps/heimdal
    echo "Building heimdal v$HEIMDAL_RELEASE"
    ./scripts/ci/build-heimdal.sh $HEIMDAL_RELEASE $HEIMDAL_DEST_FOLDER
    export HEIMDAL_BUILD_FOLDER=$HEIMDAL_DEST_FOLDER/build/$HEIMDAL_RELEASE
    ls -al $HEIMDAL_BUILD_FOLDER/lib
  fi
fi

###################
# Build zlib
###################
# Zlib version must match Node.js one
ZLIB_RELEASE=${ZLIB_RELEASE:-$(node -e "console.log(process.versions.zlib)")}
ZLIB_DEST_FOLDER=$HOME/deps/zlib
echo "Building zlib v$ZLIB_RELEASE"
./scripts/ci/build-zlib.sh $ZLIB_RELEASE $ZLIB_DEST_FOLDER
export ZLIB_BUILD_FOLDER=$ZLIB_DEST_FOLDER/build/$ZLIB_RELEASE
ls -al $ZLIB_BUILD_FOLDER/lib

###################
# Build libssh2
###################
LIBSSH2_RELEASE=${LIBSSH2_RELEASE:-1.8.2}
LIBSSH2_DEST_FOLDER=$HOME/deps/libssh2
echo "Building libssh2 v$LIBSSH2_RELEASE"
./scripts/ci/build-libssh2.sh $LIBSSH2_RELEASE $LIBSSH2_DEST_FOLDER
export LIBSSH2_BUILD_FOLDER=$LIBSSH2_DEST_FOLDER/build/$LIBSSH2_RELEASE
ls -al $LIBSSH2_BUILD_FOLDER/lib

###################
# Build openldap
###################
OPENLDAP_RELEASE=${OPENLDAP_RELEASE:-2.4.47}
OPENLDAP_DEST_FOLDER=$HOME/deps/openldap
echo "Building openldap v$OPENLDAP_RELEASE"
./scripts/ci/build-openldap.sh $OPENLDAP_RELEASE $OPENLDAP_DEST_FOLDER
export OPENLDAP_BUILD_FOLDER=$OPENLDAP_DEST_FOLDER/build/$OPENLDAP_RELEASE
ls -al $OPENLDAP_BUILD_FOLDER/lib

###################
# Build libcurl
###################
LIBCURL_ORIGINAL_RELEASE=${LIBCURL_RELEASE:-LATEST}
LATEST_LIBCURL_RELEASE=$(./scripts/ci/get-latest-libcurl-version.sh)
LIBCURL_RELEASE=$LIBCURL_ORIGINAL_RELEASE
if [[ $LIBCURL_RELEASE == "LATEST" ]]; then
  LIBCURL_RELEASE=$LATEST_LIBCURL_RELEASE
fi
LIBCURL_DEST_FOLDER=$HOME/deps/libcurl
echo "Building libcurl v$LIBCURL_RELEASE"
./scripts/ci/build-libcurl.sh $LIBCURL_RELEASE $LIBCURL_DEST_FOLDER
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

PUBLISH_BINARY=false
COMMIT_MESSAGE=$(git show -s --format=%B $GIT_COMMIT | tr -d '\n')
if [[ $GIT_TAG == `git describe --tags --always HEAD` || ${COMMIT_MESSAGE} =~ "[publish binary]" ]]; then
  PUBLISH_BINARY=true;
fi

# Build Addon
npm_config_build_from_source="true" npm_config_curl_config_bin="$LIBCURL_DEST_FOLDER/build/$LIBCURL_RELEASE/bin/curl-config" npm_config_curl_static_build="true" yarn install --frozen-lockfile

# Print addon deps for debugging
# if [[ $TRAVIS_OS_NAME == "osx" ]]; then
if [ "$(uname)" == "Darwin" ]; then
  otool -D ./lib/binding/node_libcurl.node || true
else
  cat ./build/node_libcurl.target.mk || true
  readelf -d ./lib/binding/node_libcurl.node || true
  ldd ./lib/binding/node_libcurl.node || true
fi

yarn test

# If we are here, it means the addon worked
# Check if we need to publish the binaries
if [[ $PUBLISH_BINARY == true && $LIBCURL_RELEASE == $LATEST_LIBCURL_RELEASE ]]; then
  yarn pregyp package testpackage --verbose
  node scripts/module-packaging.js --publish "$(yarn --silent pregyp reveal staged_tarball --silent)"
fi

# In case we published the binaries, verify if we can download them, and that they work
# Otherwise, unpublish them
INSTALL_RESULT=0
if [[ $PUBLISH_BINARY == true ]]; then
  INSTALL_RESULT=$(npm_config_fallback_to_build=false yarn install --frozen-lockfile > /dev/null)$? || true
fi
if [[ $INSTALL_RESULT != 0 ]]; then
  node scripts/module-packaging.js --unpublish "$(yarn --silent pregyp reveal hosted_tarball --silent)"
  false
fi

# Clean everything
yarn pregyp clean

set +uv
