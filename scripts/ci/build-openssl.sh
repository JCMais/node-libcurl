#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

MACOS_UNIVERSAL_BUILD=${MACOS_UNIVERSAL_BUILD:-}

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

if [ "$MACOS_UNIVERSAL_BUILD" == "true" ]; then
  # OpenSSL depends on assembly snippets, so a proper universal build requires
  # two separate builds.

  build_arch() {
    CFLAGS="$MACOS_TARGET_FLAGS -arch $1" \
    LDFLAGS="$MACOS_TARGET_FLAGS -arch $1" \

    ./Configure \
      darwin64-$1-cc \
      -fPIC \
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
    --prefix=$build_folder \
    --openssldir=$build_folder \
    no-shared "${@:3}"

  # Release - Both
  # ./config \
  #    -Wl,-rpath=$build_folder/lib \
  #    -fPIC \
  #    --prefix=$build_folder \
  #    --openssldir=$build_folder \
  #    shared $1

  make && make install_sw
fi
