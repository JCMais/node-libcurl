#!/bin/bash
# <release> <dest_folder>
set -e

build_folder=$2/build
curr_dirname=$(dirname "$0")

sort_cmd=sort

# On macOS we need gsort from coreutils, can be installed with: brew install coreutils
if [ "$(uname)" == "Darwin" ]; then
  if ! command -v gsort &>/dev/null; then
    (>&2 echo "Could not find a gnu sort compatible binary, we need it to compare libcurl version")
    exit 1
  fi

  sort_cmd=gsort
fi

version_with_dots=$(echo $1 | sed 's/\_/./g')

# libcurl only started having proper releases only with 7.54
# Up to 7.53.1 only source tarballs were available, so the url
#  needs to be changed to something like: https://github.com/curl/curl/archive/curl-7_53_1.tar.gz
# And as it is just a source tarball, we must also create the ./configure script
if printf '%s\n%s' "$version_with_dots" "7.53.1" | $sort_cmd -CV; then

  echo "Using source tarball instead of release"
  $curr_dirname/download-and-unpack.sh \
    https://github.com/curl/curl/archive/curl-$1.tar.gz \
    $2

  cd $2/curl-curl-$1

  ./buildconf
else
  echo "Using release tarball"

  $curr_dirname/download-and-unpack.sh \
    https://github.com/curl/curl/releases/download/curl-$1/curl-$version_with_dots.tar.gz \
    $2

  cd $2/curl-$version_with_dots
fi

# if rebuilding
# make distclean

# Debug
# ./configure \
#     --with-nghttp2=$NGHTTP2_BUILD_FOLDER \
#     --with-ssl=$OPENSSL_BUILD_FOLDER \
#     --with-libssh2=$LIBSSH2_BUILD_FOLDER \
#     --with-zlib=$ZLIB_BUILD_FOLDER \
#     --disable-shared \
#     --enable-debug \
#     --prefix=$build_folder

# Release - Static
# ./configure \
#     --with-nghttp2=$NGHTTP2_BUILD_FOLDER \
#     --with-ssl=$OPENSSL_BUILD_FOLDER \
#     --with-libssh2=$LIBSSH2_BUILD_FOLDER \
#     --with-zlib=$ZLIB_BUILD_FOLDER \
#     --disable-shared \
#     --prefix=$build_folder
    
# Release - Both
./configure \
  --with-nghttp2=$NGHTTP2_BUILD_FOLDER \
  --with-ssl=$OPENSSL_BUILD_FOLDER \
  --with-libssh2=$LIBSSH2_BUILD_FOLDER \
  --with-zlib=$ZLIB_BUILD_FOLDER \
  --prefix=$build_folder

make && make install
