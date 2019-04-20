#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

sort_cmd=sort

mkdir -p $build_folder
mkdir -p $2/source

# On macOS we need gsort from coreutils, can be installed with: brew install coreutils
if [ "$(uname)" == "Darwin" ]; then
  if ! command -v gsort &>/dev/null; then
    (>&2 echo "Could not find a gnu sort compatible binary, we need it to compare libcurl version")
    exit 1
  fi

  sort_cmd=gsort
fi

version_with_dots=$(echo $1 | sed 's/\_/./g')

echo "Preparing release for libcurl $1"

# libcurl only started having proper releases only with 7.54
# Up to 7.53.1 only source tarballs were available, so the url
#  needs to be changed to something like: https://github.com/curl/curl/archive/curl-7_53_1.tar.gz
# And as it is just a source tarball, we must also create the ./configure script
is_less_than_7_54_1=0
(printf '%s\n%s' "$version_with_dots" "7.53.1" | $sort_cmd -CV) || is_less_than_7_54_1=$?

LIBS=""
if [ "$is_less_than_7_54_1" == "0" ]; then
  # https://github.com/curl/curl/pull/1427#issuecomment-295783852
  # The detection was broken for libcurl < 7.54.1, which in fact matches this condition here!
  # pthread is needed if using OpenSSL >= 1.1.0, however we are just addind it anyway as required
  # no harm done
  LIBS="-ldl -lpthread"
fi

if [ ! -d $2/source/$1 ]; then
  if [ "$is_less_than_7_54_1" == "0" ]; then
    echo "Using source tarball instead of release"
    $curr_dirname/download-and-unpack.sh \
      https://github.com/curl/curl/archive/curl-$1.tar.gz \
      $2

    mv $2/curl-curl-$1 $2/source/$1
    cd $2/source/$1


    ./buildconf
  else
    echo "Using release tarball"

    $curr_dirname/download-and-unpack.sh \
      https://github.com/curl/curl/releases/download/curl-$1/curl-$version_with_dots.tar.gz \
      $2

    mv $2/curl-$version_with_dots $2/source/$1
    cd $2/source/$1
  fi
else
  cd $2/source/$1
  if [ -f ./configure ]; then
    make distclean || true;
  else
    ./buildconf
  fi
fi

# Debug
# ./configure \
#     --with-nghttp2=$NGHTTP2_BUILD_FOLDER \
#     --with-ssl=$OPENSSL_BUILD_FOLDER \
#     --with-libssh2=$LIBSSH2_BUILD_FOLDER \
#     --with-zlib=$ZLIB_BUILD_FOLDER \
#     --disable-shared \
#     --enable-debug \
#     --prefix=$build_folder

# Release - Static
# It may be needed to pass PKG_CONFIG_PATH here, it should point to:
# openssl/build/$ver/lib/pkgconfig
LIBS=$LIBS ./configure \
    --with-ssl=$OPENSSL_BUILD_FOLDER \
    --with-nghttp2=$NGHTTP2_BUILD_FOLDER \
    --with-libssh2=$LIBSSH2_BUILD_FOLDER \
    --with-zlib=$ZLIB_BUILD_FOLDER \
    --without-nss \
    --without-libpsl \
    --without-libmetalink \
    --without-librtmp \
    --without-libidn \
    --without-libidn2 \
    --disable-ldap \
    --disable-ldaps \
    --disable-shared \
    --prefix=$build_folder
    
# Release - Both
# ./configure \
#   --with-nghttp2=$NGHTTP2_BUILD_FOLDER \
#   --with-ssl=$OPENSSL_BUILD_FOLDER \
#   --with-libssh2=$LIBSSH2_BUILD_FOLDER \
#   --with-zlib=$ZLIB_BUILD_FOLDER \
#   --prefix=$build_folder

make && make install
