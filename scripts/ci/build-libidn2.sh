#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libidn2.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of libidn2 because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh https://ftp.gnu.org/gnu/libidn/libidn2-$1.tar.gz $2

  mv $2/libidn2-$1 $2/source/$1
  cd $2/source/$1
else
  cd $2/source/$1
  make distclean || true;
fi

CFLAGS=${CFLAGS:-}

# @TODO Verify if iconv is required on musl

# Debug
# CFLAGS="$CFLAGS -fPIC" ./configure --prefix=$build_folder --disable-shared --enable-debug "${@:3}"

# Release - Static
CFLAGS="$CFLAGS -fPIC" ./configure \
  --with-libunistring-prefix=$LIBUNISTRING_BUILD_FOLDER \
  --prefix=$build_folder \
  --disable-shared "${@:3}"

# Release - Both
# CFLAGS="$CFLAGS -fPIC" ./configure --prefix=$build_folder "${@:3}"

make && make install
