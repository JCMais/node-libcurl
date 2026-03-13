#!/bin/bash
# If running this from a macOS, you will need pkgconfig
#  brew install pkgconfig
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

. $curr_dirname/utils/gsort.sh

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}
FORCE_REBUILD_LIBCURL=${FORCE_REBUILD_LIBCURL:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libcurl-impersonate-chrome.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]] && [[ -z $FORCE_REBUILD_LIBCURL || $FORCE_REBUILD_LIBCURL != "true" ]]; then
  echo "Skipping rebuild of libcurl-impersonate because lib file already exists"
  exit 0
fi

echo "Preparing release for libcurl-impersonate"

# This is way faster than using distclean
if [ -d $2/source/$1 ] && [ -f $2/source/$1/configure ]; then
  rm -rf $2/source/$1
fi

if [ ! -d $2/source/$1 ]; then
  echo "Using release tarball"

  $curr_dirname/download-and-unpack-zip.sh \
    https://github.com/rushour-io/curl-impersonate/archive/refs/heads/main.zip \
    $2

  mv $2/curl-impersonate-main $2/source/$1
  cd $2/source/$1
else
  cd $2/source/$1
fi

chmod +x $2/source/$1/configure

pwd

./configure \
    --prefix=$build_folder \
    "${@:3}"

if [ "$(uname)" == "Darwin" ]; then
  gmake chrome-build && gmake chrome-install
else
  make chrome-build && make chrome-install
fi

cp -r $2/source/$1/curl-7.84.0/include $build_folder/include