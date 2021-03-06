#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libzstd.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of zstd because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh https://github.com/facebook/zstd/releases/download/v$1/zstd-$1.tar.gz $2

  mv $2/zstd-$1 $2/source/$1
  cd $2/source/$1/lib
else
  cd $2/source/$1/lib
  rm -rf $build_folder/*
  make clean || true;
fi

CFLAGS=${CFLAGS:-}

CFLAGS="$CFLAGS -fPIC" make install-static install-includes PREFIX=$build_folder
