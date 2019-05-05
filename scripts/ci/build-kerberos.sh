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
  echo "Skipping rebuild of kerberos because lib file already exists"
  exit 0
fi

if [ ! -d $2/source/$1 ]; then
  $curr_dirname/download-and-unpack.sh \
    https://kerberos.org/dist/krb5/$1/krb5-$1.tar.gz $2

  mv $2/krb5-$1 $2/source/$1
  cd $2/source/$1/src
else
  cd $2/source/$1/src
  make distclean || true;
fi

CFLAGS=${CFLAGS:-}
CPPFLAGS=${CPPFLAGS:-}
LDFLAGS=${LDFLAGS:-}
LIBS=${LIBS:-}

export CFLAGS="$CFLAGS -fPIC"
export CPPFLAGS="$CPPFLAGS -I$OPENSSL_BUILD_FOLDER/include"
# rpath is probably not needed here, since we are building only static, but leaving it here for reference
export LDFLAGS="$LDFLAGS -L$OPENSSL_BUILD_FOLDER/lib -Wl,-rpath,$OPENSSL_BUILD_FOLDER/lib"
# pthread below is only necessary for openssl 1.1.x from what I can tell
#  however I see no harm on keeping in there for other versions
export LIBS="$LIBS -ldl -lpthread"

# We cannot build Kerberos on macOS directly because of duplicated symbols in dbutil:
# duplicate symbol _master_keyblock in:
#     kdb5_util.o
#     ../../lib/libkadm5srv_mit.a(server_kdb.o)
# ld: 1 duplicate symbol for architecture x86_64
# So we are going to first build dynamically and then after statically
if [ "$(uname)" == "Darwin" ]; then
  echo "on macOS: building shared version of Kerberos first"
  ./configure \
    --without-krb5-config \
    --without-ldap \
    --without-libedit \
    --without-lmdb \
    --without-system-verto \
    --without-tcl \
    --with-crypto-impl=openssl \
    --with-pkinit-crypto-impl=openssl \
    --with-tls-impl=openssl \
    --enable-pkinit \
    --prefix=$build_folder
  make && make install
fi

# Release - Static
./configure \
  --without-krb5-config \
  --without-ldap \
  --without-libedit \
  --without-lmdb \
  --without-system-verto \
  --without-tcl \
  --with-crypto-impl=openssl \
  --with-pkinit-crypto-impl=openssl \
  --with-tls-impl=openssl \
  --disable-shared \
  --enable-static \
  --enable-pkinit \
  --prefix=$build_folder

make && make install

# Remove created shared libs on macOS
if [ "$(uname)" == "Darwin" ]; then
  echo "removing shared libraries created solely to build the static one"
  rm -rf $build_folder/lib/*.dylib
fi
