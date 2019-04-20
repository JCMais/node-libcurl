#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh https://github.com/nghttp2/nghttp2/releases/download/v$1/nghttp2-$1.tar.gz $2

  mv $2/nghttp2-$1 $2/source/$1
  cd $2/source/$1
else
  cd $2/source/$1
  make distclean || true;
fi


# Debug
# ./configure \
#   --prefix=$build_folder \
#   --enable-lib-only \
#   --disable-shared \
#   --enable-debug

# Release - Static
CFLAGS="-fPIC" ./configure \
  --prefix=$build_folder \
  --enable-lib-only \
  --disable-shared

# Release - Both
# ./configure \
#   --prefix=$build_folder \
#   --enable-lib-only

make && make install
