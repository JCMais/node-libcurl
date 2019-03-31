#!/bin/bash
# <release> <dest_folder>
set -e

build_folder=$2/build
curr_dirname=$(dirname "$0")

$curr_dirname/download-and-unpack.sh \
  https://github.com/libssh2/libssh2/releases/download/libssh2-$1/libssh2-$1.tar.gz $2

cd $2/libssh2-$1

./buildconf

# if rebuilding
# make distclean

# Debug
# CFLAGS="-fPIC" LDFLAGS="-ldl" ./configure \
#   --with-openssl \
#   --with-libssl-prefix=$OPENSSL_BUILD_FOLDER \
#   --with-libz \
#   --with-libz-prefix=$ZLIB_BUILD_FOLDER \
#   --disable-shared \
#   --enable-debug \
#   --prefix=$build_folder

# Release - Static
# CFLAGS="-fPIC" LDFLAGS="-ldl" ./configure \
#   --with-openssl \
#   --with-libssl-prefix=$OPENSSL_BUILD_FOLDER \
#   --with-libz \
#   --with-libz-prefix=$ZLIB_BUILD_FOLDER \
#   --disable-shared \
#   --prefix=$build_folder

# Release - Both 
CFLAGS="-fPIC" LDFLAGS="-ldl" ./configure \
  --with-openssl \
  --with-libssl-prefix=$OPENSSL_BUILD_FOLDER \
  --with-libz \
  --with-libz-prefix=$ZLIB_BUILD_FOLDER \
  --prefix=$build_folder

make && make install
