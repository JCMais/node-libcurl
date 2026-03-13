#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libngtcp2.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of ngtcp2 because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh https://github.com/ngtcp2/ngtcp2/releases/download/v$1/ngtcp2-$1.tar.gz $2

  mv $2/ngtcp2-$1 $2/source/$1
  cd $2/source/$1
else
  cd $2/source/$1
  make distclean || true;
fi

CFLAGS=${CFLAGS:-}
export CFLAGS="$CFLAGS -fPIC"

# Build PKG_CONFIG_PATH for dependencies
PKG_CONFIG_PATH_PARTS=()

if [ -n "${OPENSSL_BUILD_FOLDER:-}" ]; then
  PKG_CONFIG_PATH_PARTS+=("$OPENSSL_BUILD_FOLDER/lib/pkgconfig")
fi

if [ -n "${NGHTTP3_BUILD_FOLDER:-}" ]; then
  PKG_CONFIG_PATH_PARTS+=("$NGHTTP3_BUILD_FOLDER/lib/pkgconfig")
fi

# Join array with colons
PKG_CONFIG_PATH_VALUE=$(IFS=:; echo "${PKG_CONFIG_PATH_PARTS[*]}")

# Set LDFLAGS for rpath if OpenSSL is provided
LDFLAGS_VALUE=""
if [ -n "${OPENSSL_BUILD_FOLDER:-}" ]; then
  LDFLAGS_VALUE="-Wl,-rpath,$OPENSSL_BUILD_FOLDER/lib"
fi

# Release - Static
PKG_CONFIG_PATH="$PKG_CONFIG_PATH_VALUE" \
LDFLAGS="$LDFLAGS_VALUE" \
./configure \
  --prefix=$build_folder \
  --enable-lib-only \
  --enable-static \
  --disable-shared \
  --with-openssl \
  --with-libnghttp3

make && make install
