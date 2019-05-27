#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libcrypto.a && -f $build_folder/lib/libssl.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of openssl because lib files already exists"
  exit 0
fi

version_with_dashes=$(echo $1 | sed 's/\./_/g')

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh https://github.com/openssl/openssl/archive/OpenSSL_$version_with_dashes.tar.gz $2

  mv $2/openssl-OpenSSL_$version_with_dashes $2/source/$1
  cd $2/source/$1
else
  cd $2/source/$1
  make distclean || true;
fi

# Debug:
#./config -fPIC --prefix=$build_folder --openssldir=$build_folder no-shared \
#  no-asm -g3 -O0 -fno-omit-frame-pointer -fno-inline-functions "${@:3}"

# Release - Static
./config \
   -fPIC \
   --prefix=$build_folder \
   --openssldir=$build_folder \
   no-shared "${@:3}"

# Release - Both
# ./config \
#    -Wl,-rpath=$build_folder/lib \
#    -fPIC \
#    --prefix=$build_folder \
#    --openssldir=$build_folder \
#    shared "${@:3}"

make && make install_sw
