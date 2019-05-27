#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libkrb5.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of heimdal because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh \
    https://github.com/heimdal/heimdal/releases/download/heimdal-$1/heimdal-$1.tar.gz $2

  mv $2/heimdal-$1 $2/source/$1
  patch $2/source/$1/lib/hcrypto/camellia-ntt.h < $curr_dirname/patches/heimdal_hcrypto_camellia-ntt.h.patch
  
  cd $2/source/$1
else
  cd $2/source/$1
  make distclean || true;
fi

CPPFLAGS=${CPPFLAGS:-}
LDFLAGS=${LDFLAGS:-}

export CPPFLAGS="$CPPFLAGS -I$NCURSES_BUILD_FOLDER/include"
# rpath is probably not needed here, since we are building only static, but leaving it here for reference
export LDFLAGS="$LDFLAGS -L$NCURSES_BUILD_FOLDER/lib -Wl,-rpath,$NCURSES_BUILD_FOLDER/lib"

extra_params=()
if [[ -f /etc/alpine-release ]]; then
  extra_params+=(
    "--with-libedit=/usr"
  )
fi

# Debug

# Release - Static
./configure \
  --without-berkeley-db \
  --without-readline \
  --without-openldap \
  --without-hcrypto-fallback \
  --with-pic=yes \
  --with-openssl=$OPENSSL_BUILD_FOLDER \
  --disable-otp \
  --disable-shared \
  --disable-heimdal-documentation \
  --prefix=$build_folder \
  ${extra_params[@]+"${extra_params[@]}"}

# Release - Both 

make && make install
