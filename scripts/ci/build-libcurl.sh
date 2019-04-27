#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

sort_cmd=sort

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libcurl.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of libcurl because lib file already exists"
  exit 0
fi

# On macOS we need gsort from coreutils, can be installed with: brew install coreutils
if [ "$(uname)" == "Darwin" ]; then
  if ! command -v gsort &>/dev/null; then
    (>&2 echo "Could not find a gnu sort compatible binary, we need it to compare libcurl version")
    exit 1
  fi

  sort_cmd=gsort
fi

version_with_dashes=$(echo $1 | sed 's/\./_/g')

echo "Preparing release for libcurl $1"

LIBS=${LIBS:-}
LDFLAGS=${LDFLAGS:-}

# libcurl only started having proper releases only with 7.54
# Up to 7.53.1 only source tarballs were available, so the url
#  needs to be changed to something like: https://github.com/curl/curl/archive/curl-7_53_1.tar.gz
# And as it is just a source tarball, we must also create the ./configure script
is_less_than_7_54_0=0
(printf '%s\n%s' "7.54.0" "$1" | $sort_cmd -CV) || is_less_than_7_54_0=$?

#   https://github.com/curl/curl/pull/1427#issuecomment-295783852
# The detection for ldl was broken for libcurl < 7.54.1
# pthread is only needed if using OpenSSL >= 1.1.0, however we are just addind it anyway as required
# no harm done
is_less_than_7_54_1=0
(printf '%s\n%s' "7.54.1" "$1" | $sort_cmd -CV) || is_less_than_7_54_1=$?

if [ "$is_less_than_7_54_1" == "0" ]; then
  LIBS="$LIBS -ldl -lpthread"
fi

# --with-libidn2 was added on 7.53.0
# So this script only adds libidn2 for versions >= that one.
is_less_than_7_53_0=0
(printf '%s\n%s' "7.53.0" "$1" | $sort_cmd -CV) || is_less_than_7_53_0=$?
# @TODO Will need to add libiconv here if we start building it too
if [ "$is_less_than_7_53_0" == "0" ]; then
  LIBS="$LIBS -lunistring"
  LDFLAGS="$LDFLAGS -L${LIBUNISTRING_BUILD_FOLDER}/lib"
fi

if [ ! -d $2/source/$1 ]; then
  if [ "$is_less_than_7_54_0" == "1" ]; then
    echo "Using source tarball instead of release because this libcurl version does not have releases"
    $curr_dirname/download-and-unpack.sh \
      https://github.com/curl/curl/archive/curl-$version_with_dashes.tar.gz \
      $2

    mv $2/curl-curl-$version_with_dashes $2/source/$1
    cd $2/source/$1


    ./buildconf
  else
    echo "Using release tarball"

    $curr_dirname/download-and-unpack.sh \
      https://github.com/curl/curl/releases/download/curl-$version_with_dashes/curl-$1.tar.gz \
      $2

    mv $2/curl-$1 $2/source/$1
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
# LDFLAGS=$LDFLAGS LIBS=$LIBS ./configure \
#     --with-libidn2=$LIBIDN2_BUILD_FOLDER \
#     --with-libssh2=$LIBSSH2_BUILD_FOLDER \
#     --with-nghttp2=$NGHTTP2_BUILD_FOLDER \
#     --with-ssl=$OPENSSL_BUILD_FOLDER \
#     --with-zlib=$ZLIB_BUILD_FOLDER \
#     --without-nss \
#     --without-libpsl \
#     --without-libmetalink \
#     --without-librtmp \
#     --without-libidn \
#     --disable-ldap \
#     --disable-ldaps \
#     --disable-shared \
#     --enable-debug \
#     --prefix=$build_folder "${@:3}"

# Release - Static
# It may be needed to pass PKG_CONFIG_PATH here, it should point to:
# openssl/build/$ver/lib/pkgconfig
LDFLAGS=$LDFLAGS LIBS=$LIBS ./configure \
    --with-libidn2=$LIBIDN2_BUILD_FOLDER \
    --with-libssh2=$LIBSSH2_BUILD_FOLDER \
    --with-nghttp2=$NGHTTP2_BUILD_FOLDER \
    --with-ssl=$OPENSSL_BUILD_FOLDER \
    --with-zlib=$ZLIB_BUILD_FOLDER \
    --without-nss \
    --without-libpsl \
    --without-libmetalink \
    --without-librtmp \
    --without-libidn \
    --disable-ldap \
    --disable-ldaps \
    --disable-shared \
    --prefix=$build_folder "${@:3}"
    
# Release - Both
# LDFLAGS=$LDFLAGS LIBS=$LIBS ./configure \
#   --with-libidn2=$LIBIDN2_BUILD_FOLDER \
#   --with-libssh2=$LIBSSH2_BUILD_FOLDER \
#   --with-nghttp2=$NGHTTP2_BUILD_FOLDER \
#   --with-ssl=$OPENSSL_BUILD_FOLDER \
#   --with-zlib=$ZLIB_BUILD_FOLDER \
#   --prefix=$build_folder "${@:3}"

make && make install
