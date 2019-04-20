#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

$curr_dirname/download-and-unpack.sh https://github.com/madler/zlib/archive/v$1.tar.gz $2

mv $2/zlib-$1 $2/source/$1
cd $2/source/$1

# if rebuilding
# make distclean

# Debug
# CFLAGS="-fPIC" ./configure --prefix=$build_folder --static --debug

# Release - Static
CFLAGS="-fPIC" ./configure --prefix=$build_folder --static

# Release - Both
# CFLAGS="-fPIC" ./configure --prefix=$build_folder

make && make install
