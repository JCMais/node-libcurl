#!/bin/bash
# libunistring is needed to build libidn2
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

MACOS_UNIVERSAL_BUILD=${MACOS_UNIVERSAL_BUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libunistring.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of libunistring because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh https://mirrors.kernel.org/gnu/libunistring/libunistring-$1.tar.gz $2

  mv $2/libunistring-$1 $2/source/$1
  cd $2/source/$1
else
  cd $2/source/$1
  make distclean || true;
fi

CFLAGS=${CFLAGS:-}

build() {
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
  #     https://mirrors.kernel.org/gnu/libiconv/
  #   + If it is installed in a nonstandard directory, pass the option
  #     --with-libiconv-prefix=DIR to 'configure'.

  # Debug
  # CFLAGS="$CFLAGS -fPIC" ./configure --prefix=$build_folder --disable-shared --debug $1

  # Release - Static
  # --with-libiconv-prefix=$LIBICONV_BUILD_FOLDER \
  CFLAGS="$CFLAGS -fPIC" ./configure \
    --prefix=$build_folder \
    --disable-shared "$@"

  # Release - Both
  # CFLAGS="$CFLAGS -fPIC" ./configure --prefix=$build_folder $1

  make && make install
}

if [ "$MACOS_UNIVERSAL_BUILD" == "true" ]; then
  # libunistring does not build universally, so we need to build two binaries
  # and merge them. This is a bit ugly...

  build_arch() {
    CFLAGS="$MACOS_TARGET_FLAGS -arch $1" \
    LDFLAGS="$MACOS_TARGET_FLAGS -arch $1" \
    build --host=$2-apple-macosx "${@:3}"
    mv $build_folder/lib/libunistring{,-$1}.a
  }

  build_arch x86_64 x86_64 "${@:3}"
  make distclean || true
  build_arch arm64 aarch64 "${@:3}"

  lipo -create -output $build_folder/lib/libunistring.a \
    $build_folder/lib/libunistring-{x86_64,arm64}.a
else
  build "${@:3}"
fi
