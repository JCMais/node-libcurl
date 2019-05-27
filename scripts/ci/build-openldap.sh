#!/bin/bash
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libldap.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]]; then
  echo "Skipping rebuild of openldap because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh \
    http://gpl.savoirfairelinux.net/pub/mirrors/openldap/openldap-release/openldap-$1.tgz $2

  mv $2/openldap-$1 $2/source/$1
  cd $2/source/$1
else
  cd $2/source/$1
  make distclean || true;
fi

CPPFLAGS=${CPPFLAGS:-}
LDFLAGS=${LDFLAGS:-}
LIBS=${LIBS:-}

# if we ever add --with-tls=openssl again
# export CPPFLAGS="$CPPFLAGS -I$OPENSSL_BUILD_FOLDER/include"
# # rpath is probably not needed here, since we are building only static, but leaving it here for reference
# export LDFLAGS="$LDFLAGS -L$OPENSSL_BUILD_FOLDER/lib -Wl,-rpath,$OPENSSL_BUILD_FOLDER/lib"
# # pthread below is only necessary for openssl 1.1.x from what I can tell
# #  however I see no harm on keeping in there for other versions
# export LIBS="$LIBS -ldl -lpthread"

# Release - Static
./configure \
  --without-cyrus-sasl \
  --without-fetch \
  --without-tls \
  --with-pic=yes \
  --with-threads \
  --disable-slapd \
  --disable-shared \
  --prefix=$build_folder

make depend && make && make install
