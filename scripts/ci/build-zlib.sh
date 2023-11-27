#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libz.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of zlib because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  # zlib version may be in the format 1.2.13.1-motley
  # so we need to strip everything but major.minor.patch (removing the .1-motley part), and if we don't find it after that, we then need to try just major.minor
  git_version_full=$(echo $1 | sed -E 's/([0-9]+\.[0-9]+\.[0-9]+)\..*/\1/')
  git_version_major_minor=$(echo $git_version_full | sed -E 's/([0-9]+\.[0-9]+).*/\1/')

  $curr_dirname/download-and-unpack.sh https://github.com/madler/zlib/archive/v$1.tar.gz $2 || \
    $curr_dirname/download-and-unpack.sh https://github.com/madler/zlib/archive/v${git_version_full}.tar.gz $2 || \
    $curr_dirname/download-and-unpack.sh https://github.com/madler/zlib/archive/v${git_version_major_minor}.tar.gz $2 || 

  ls -al $2/

  if [ -d "$2/zlib-$git_version_full" ]; then
    mv $2/zlib-$git_version_full $2/source/$1
  elif [ -d "$2/zlib-$git_version_major_minor" ]; then
    mv $2/zlib-$git_version_major_minor $2/source/$1
  elif [ -d "$2/zlib-$1" ]; then
    mv $2/zlib-$1 $2/source/$1
  else
    echo "Could not find source folder for zlib"
    exit 1
  fi

  cd $2/source/$1
else
  cd $2/source/$1
  make distclean || true;
fi

CFLAGS=${CFLAGS:-}

# Debug
# CFLAGS="$CFLAGS -fPIC" ./configure --prefix=$build_folder --static --debug

# Release - Static
CFLAGS="$CFLAGS -fPIC" ./configure --prefix=$build_folder --static

# Release - Both
# CFLAGS="$CFLAGS -fPIC" ./configure --prefix=$build_folder

make && make install
