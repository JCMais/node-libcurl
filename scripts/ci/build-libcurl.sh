#!/bin/bash
# <release> <dest_folder>
set -e

build_folder=$2/build
curr_dirname=$(dirname "$0")

version_with_dots=$(echo $1 | sed 's/\_/./g')

$curr_dirname/download-and-unpack.sh \
  https://github.com/curl/curl/releases/download/curl-$1/curl-$version_with_dots.tar.gz \
  $2

cd $2/curl-$version_with_dots

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
