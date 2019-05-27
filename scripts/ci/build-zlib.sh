#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libz.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of zlib because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh https://github.com/madler/zlib/archive/v$1.tar.gz $2

  mv $2/zlib-$1 $2/source/$1
  cd $2/source/$1
else
  cd $2/source/$1
  make distclean || true;
fi

CFLAGS=${CFLAGS:-}

# Debug
# CFLAGS="$CFLAGS -fPIC" ./configure --prefix=$build_folder --static --debug

# Release - Static
CFLAGS="$CFLAGS -fPIC" ./configure --prefix=$build_folder --static

# Release - Both
# CFLAGS="$CFLAGS -fPIC" ./configure --prefix=$build_folder

make && make install
