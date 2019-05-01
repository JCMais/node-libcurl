#!/bin/bash
# ncurses is needed to build heimdal
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libncurses.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of ncurses because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh \
    ftp://ftp.gnu.org/gnu/ncurses/ncurses-$1.tar.gz $2

  mv $2/ncurses-$1 $2/source/$1
  cd $2/source/$1
else
  cd $2/source/$1
  make distclean || true;
fi

CFLAGS=${CFLAGS:-}

export CFLAGS="$CFLAGS -fPIC"

# Debug

# Release - Static
# By default it does not generate shared libs, must use --with-shared
./configure \
  --without-develop \
  --without-debug \
  --without-trace \
  --without-progs \
  --without-tack \
  --without-manpages \
  --without-tests \
  --without-ada \
  --without-cxx \
  --without-cxx-bindings \
  --with-shared \
  --prefix=$build_folder

# Release - Both 

make && make install
