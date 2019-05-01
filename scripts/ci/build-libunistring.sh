#!/bin/bash
# libunistring is needed to build libidn2
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libunistring.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of libunistring because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh https://ftp.gnu.org/gnu/libunistring/libunistring-$1.tar.gz $2

  mv $2/libunistring-$1 $2/source/$1
  cd $2/source/$1
else
  cd $2/source/$1
  make distclean || true;
fi

CFLAGS=${CFLAGS:-}

# @TODO Verify if iconv is required on musl
# 
# 
# * GNU libiconv
#   + Not needed on systems with
#       - glibc 2.2 or newer, or
#       - MacOS X 10.3 or newer, or
#       - NetBSD 3.0 or newer.
#     But highly recommended on all other systems.
#     Needed for character set conversion of strings from/to Unicode.
#   + Homepage:
#     https://www.gnu.org/software/libiconv/
#   + Download:
#     https://ftp.gnu.org/gnu/libiconv/
#   + If it is installed in a nonstandard directory, pass the option
#     --with-libiconv-prefix=DIR to 'configure'.

# Debug
# CFLAGS="$CFLAGS -fPIC" ./configure --prefix=$build_folder --disable-shared --debug "${@:3}"

# Release - Static
# --with-libiconv-prefix=$LIBICONV_BUILD_FOLDER \
CFLAGS="$CFLAGS -fPIC" ./configure \
  --prefix=$build_folder \
  --disable-shared "${@:3}"

# Release - Both
# CFLAGS="$CFLAGS -fPIC" ./configure --prefix=$build_folder "${@:3}"

make && make install
