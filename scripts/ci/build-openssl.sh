#!/bin/bash
# <release> <dest_folder>
set -e

build_folder=$2/build
curr_dirname=$(dirname "$0")

$curr_dirname/download-and-unpack.sh https://github.com/openssl/openssl/archive/OpenSSL_$1.tar.gz $2

cd $2/openssl-OpenSSL_$1

# if rebuilding
# make distclean

# Debug:
#./config -fPIC --prefix=$build_folder --openssldir=$build_folder no-shared \
#  no-asm -g3 -O0 -fno-omit-frame-pointer -fno-inline-functions

# Release - Static
# ./config -fPIC --prefix=$build_folder --openssldir=$build_folder no-shared

# Release - Both
./config -fPIC --prefix=$build_folder --openssldir=$build_folder shared

make && make install_sw
