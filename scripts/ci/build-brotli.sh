#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

. $curr_dirname/utils/gsort.sh

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libbrotlidec.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of brotli because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh https://github.com/google/brotli/archive/v$1.tar.gz $2

  mv $2/brotli-$1 $2/source/$1
  cd $2/source/$1
else
  cd $2/source/$1
  rm -rf $2/source/$1/out
fi

mkdir -p out && cd out

# CFLAGS=${CFLAGS:-}

# Release - Static

# We set those to -mmacosx-version-min=x.y by default on macOS
# But cmake does not like it
if [ "$(uname)" == "Darwin" ]; then
  export CFLAGS=""
  export CCFLAGS=""
  export CXXFLAGS=""
  export LDFLAGS=""
fi

is_less_than_1_1_0=0
(printf '%s\n%s' "1.1.0" "$1" | $gsort -CV) || is_less_than_1_1_0=$?

if [ "$is_less_than_1_1_0" == "1" ]; then
  ../configure-cmake \
    --prefix=$build_folder \
    --disable-debug \
    --pass-thru \
    -DCMAKE_INSTALL_PREFIX:PATH=$build_folder \
    -DCMAKE_ARCHIVE_OUTPUT_DIRECTORY:PATH=$build_folder/lib \
    -DCMAKE_LIBRARY_OUTPUT_DIRECTORY:PATH=$build_folder/lib

  make

  # static libraries are built with -static suffix, remove it
  for filename in $build_folder/lib/*.a; do
    mv $filename $(echo "$filename" | sed "s/-static//g")
  done
else
  cmake \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX=$build_folder \
    -DCMAKE_ARCHIVE_OUTPUT_DIRECTORY:PATH=$build_folder/lib \
    -DCMAKE_LIBRARY_OUTPUT_DIRECTORY:PATH=$build_folder/lib \
    -DBUILD_SHARED_LIBS=OFF \
    ..
  cmake --build . --config Release --target install
fi

cp -r $2/source/$1/c/include $build_folder/include

#  remove the dynamic ones, so they are not used
find $build_folder/lib/ -not -type d -not -name '*.a' -delete
