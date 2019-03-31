#!/bin/bash
# <release> <dest_folder>
set -e

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

$curr_dirname/download-and-unpack.sh https://github.com/nghttp2/nghttp2/releases/download/v$1/nghttp2-$1.tar.gz $2

mv $2/nghttp2-$1 $2/source/$1
cd $2/source/$1

# if rebuilding
# make distclean

# Debug
# ./configure \
#   --prefix=$build_folder \
#   --enable-lib-only \
#   --disable-shared \
#   --enable-debug

# Release - Static
./configure \
  --prefix=$build_folder \
  --enable-lib-only \
  --disable-shared

# Release - Both
# ./configure \
#   --prefix=$build_folder \
#   --enable-lib-only

make && make install
