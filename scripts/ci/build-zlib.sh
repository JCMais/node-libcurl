#!/bin/bash
# <release> <dest_folder>
build_folder=$2/build
curr_dirname=$(dirname "$0")

$curr_dirname/download-and-unpack.sh https://github.com/madler/zlib/archive/v$1.tar.gz $2

cd $2/zlib-$1

# if rebuilding
# make distclean

# Debug
# CFLAGS="-fPIC" ./configure --prefix=$ZLIB_BUILD_FOLDER --static --debug

# Release - Static
# CFLAGS="-fPIC" ./configure --prefix=$ZLIB_BUILD_FOLDER --static

# Release - Both
CFLAGS="-fPIC" ./configure --prefix=$build_folder

make && make install
