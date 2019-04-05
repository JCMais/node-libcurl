#!/bin/bash
# <release> <dest_folder>
set -e

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh \
    https://github.com/libssh2/libssh2/releases/download/libssh2-$1/libssh2-$1.tar.gz $2

  mv $2/libssh2-$1 $2/source/$1
  cd $2/source/$1
  
  ./buildconf
else
  cd $2/source/$1
  if [ -f ./configure ]; then
    make distclean || true;
  else
    ./buildconf
  fi
fi

# pthread below is only necessary for openssl 1.1.x from what I can tell
#  however I see no harm on keeping in there for other versions

# Debug
# CFLAGS="-fPIC" LDFLAGS="-ldl -lpthread" ./configure \
#   --with-openssl \
#   --with-libssl-prefix=$OPENSSL_BUILD_FOLDER \
#   --with-libz \
#   --with-libz-prefix=$ZLIB_BUILD_FOLDER \
#   --disable-shared \
#   --enable-debug \
#   --prefix=$build_folder

# Release - Static
CFLAGS="-fPIC" LDFLAGS="-ldl -lpthread" ./configure \
  --with-openssl \
  --with-libssl-prefix=$OPENSSL_BUILD_FOLDER \
  --with-libz \
  --with-libz-prefix=$ZLIB_BUILD_FOLDER \
  --disable-shared \
  --prefix=$build_folder

# Release - Both 
# CFLAGS="-fPIC" LDFLAGS="-ldl -lpthread" ./configure \
#   --with-openssl \
#   --with-libssl-prefix=$OPENSSL_BUILD_FOLDER \
#   --with-libz \
#   --with-libz-prefix=$ZLIB_BUILD_FOLDER \
#   --prefix=$build_folder

make && make install
