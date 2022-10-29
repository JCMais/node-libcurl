#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

. $curr_dirname/utils/gsort.sh

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

MACOS_UNIVERSAL_BUILD=${MACOS_UNIVERSAL_BUILD:-}

version_with_dashes=$(echo $1 | sed 's/\./_/g')

# starting with v3 the tags have a different format
is_less_than_3_0_0=0
(printf '%s\n%s' "3.0.0" "$1" | $gsort -CV) || is_less_than_3_0_0=$?

if [[ $is_less_than_3_0_0 -eq 0 ]]; then
  openssl_tarball_name="openssl-$1"
else
  openssl_tarball_name="OpenSSL_$version_with_dashes"
fi

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libcrypto.a && -f $build_folder/lib/libssl.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of openssl because lib files already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh https://github.com/openssl/openssl/archive/${openssl_tarball_name}.tar.gz $2

  mv $2/openssl-${openssl_tarball_name} $2/source/$1
  cd $2/source/$1
else
  cd $2/source/$1
  make distclean || true;
fi

if [ "$MACOS_UNIVERSAL_BUILD" == "true" ]; then
  # OpenSSL depends on assembly snippets, so a proper universal build requires
  # two separate builds.

  build_arch() {
    # the no-error is due to https://github.com/openssl/openssl/issues/18720 
    CFLAGS="-Wno-error=implicit-function-declaration $MACOS_TARGET_FLAGS -arch $1" \
    LDFLAGS="$MACOS_TARGET_FLAGS -arch $1" \

    ./Configure \
      darwin64-$1-cc \
      -fPIC \
      --libdir=lib \
      --prefix=$build_folder \
      --openssldir=$build_folder \
      no-shared "${@:2}"

    make && make install_sw

    mv $build_folder/lib/libcrypto{,-$1}.a
    mv $build_folder/lib/libssl{,-$1}.a
  }

  build_arch x86_64 "${@:3}"
  make distclean || true;
  build_arch arm64 "${@:3}"

  lipo -create -output $build_folder/lib/libcrypto.a \
    $build_folder/lib/libcrypto-{x86_64,arm64}.a

  lipo -create -output $build_folder/lib/libssl.a \
    $build_folder/lib/libssl-{x86_64,arm64}.a
else
  # Debug:
  #./config -fPIC --prefix=$build_folder --openssldir=$build_folder no-shared \
  #  no-asm -g3 -O0 -fno-omit-frame-pointer -fno-inline-functions $1

  # Release - Static
  ./config \
    -fPIC \
    --libdir=lib \
    --prefix=$build_folder \
    --openssldir=$build_folder \
    no-shared "${@:3}"

  # Release - Both
  # ./config \
  #    -Wl,-rpath=$build_folder/lib \
  #    -fPIC \
  #    --libdir=lib \
  #    --prefix=$build_folder \
  #    --openssldir=$build_folder \
  #    shared $1

  make && make install_sw
fi

# this will make our life a lot easier
if [[ -d $build_folder/lib64 ]]; then
  rm -rf $build_folder/lib
  mkdir -p $build_folder/lib/
  cp -R $build_folder/lib64/* $build_folder/lib/
fi
