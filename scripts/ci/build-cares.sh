#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

version_with_dashes=$(echo $1 | sed 's/\./_/g')

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libcares.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of cares because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  echo "https://github.com/c-ares/c-ares/releases/download/cares-$version_with_dashes/c-ares-$1.tar.gz"
  $curr_dirname/download-and-unpack.sh https://github.com/c-ares/c-ares/releases/download/cares-$version_with_dashes/c-ares-$1.tar.gz $2

  mv $2/c-ares-$1 $2/source/$1
  cd $2/source/$1

  ./buildconf
else
  cd $2/source/$1
  ls -al
  if [ -f ./configure ]; then
    make distclean || true;
  else
    ./buildconf
  fi
fi

# Release - Static
./configure \
  --prefix=$build_folder \
  --disable-shared \
  --disable-dependency-tracking

make && make install
