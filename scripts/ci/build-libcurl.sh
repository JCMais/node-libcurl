#!/bin/bash
# If running this from a macOS, you will need pkgconfig
#  brew install pkgconfig
# <release> <dest_folder>
set -euo pipefail

build_folder=$2/build/$1
curr_dirname=$(dirname "$0")

. $curr_dirname/utils/gsort.sh

mkdir -p $build_folder
mkdir -p $2/source

FORCE_REBUILD=${FORCE_REBUILD:-}
FORCE_REBUILD_LIBCURL=${FORCE_REBUILD_LIBCURL:-}

# @TODO We are explicitly checking the static lib
if [[ -f $build_folder/lib/libcurl.a ]] && [[ -z $FORCE_REBUILD || $FORCE_REBUILD != "true" ]] && [[ -z $FORCE_REBUILD_LIBCURL || $FORCE_REBUILD_LIBCURL != "true" ]]; then
  echo "Skipping rebuild of libcurl because lib file already exists"
  exit 0
fi

version_with_dashes=$(echo $1 | sed 's/\./_/g')

echo "Preparing release for libcurl $1"

# Libs build folders
LIBIDN2_BUILD_FOLDER=${LIBIDN2_BUILD_FOLDER:-}
LIBUNISTRING_BUILD_FOLDER=${LIBUNISTRING_BUILD_FOLDER:-}
KERBEROS_BUILD_FOLDER=${KERBEROS_BUILD_FOLDER:-}
HEIMDAL_BUILD_FOLDER=${HEIMDAL_BUILD_FOLDER:-}
OPENLDAP_BUILD_FOLDER=${OPENLDAP_BUILD_FOLDER:-}
LIBSSH2_BUILD_FOLDER=${LIBSSH2_BUILD_FOLDER:-}
NGHTTP2_BUILD_FOLDER=${NGHTTP2_BUILD_FOLDER:-}
OPENSSL_BUILD_FOLDER=${OPENSSL_BUILD_FOLDER:-}
CARES_BUILD_FOLDER=${CARES_BUILD_FOLDER:-}
BROTLI_BUILD_FOLDER=${BROTLI_BUILD_FOLDER:-}
ZLIB_BUILD_FOLDER=${ZLIB_BUILD_FOLDER:-}

LIBS=${LIBS:-}
CPPFLAGS=${CPPFLAGS:-}
LDFLAGS=${LDFLAGS:-}
libcurl_args=()

# libcurl only started having proper releases only with 7.54
# Up to 7.53.1 only source tarballs were available, so the url
#  needs to be changed to something like: https://github.com/curl/curl/archive/curl-7_53_1.tar.gz
# And as it is just a source tarball, we must also create the ./configure script
is_less_than_7_54_0=0
(printf '%s\n%s' "7.54.0" "$1" | $gsort -CV) || is_less_than_7_54_0=$?

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

#   https://github.com/curl/curl/pull/1427#issuecomment-295783852
# The detection for ldl was broken for libcurl < 7.54.1
# pthread is only needed if using OpenSSL >= 1.1.0, however we are just addind it anyway as required
# no harm done
is_less_than_7_54_1=0
(printf '%s\n%s' "7.54.1" "$1" | $gsort -CV) || is_less_than_7_54_1=$?

if [ "$is_less_than_7_54_1" == "1" ]; then
  LIBS="$LIBS -ldl -lpthread"
fi

# --with-libidn2 was added on 7.53.0
# So this script only adds libidn2 for versions >= that one.
is_less_than_7_53_0=0
(printf '%s\n%s' "7.53.0" "$1" | $gsort -CV) || is_less_than_7_53_0=$?
# @TODO Will need to add libiconv here if we start building it too
if [ "$is_less_than_7_53_0" == "0" ]; then
  if [[ ! -z $LIBIDN2_BUILD_FOLDER && ! -z $LIBUNISTRING_BUILD_FOLDER ]]; then
    LIBS="$LIBS -lunistring"
    LDFLAGS="$LDFLAGS -L$LIBUNISTRING_BUILD_FOLDER/lib"
    libcurl_args+=("--with-libidn2=$LIBIDN2_BUILD_FOLDER")

    # on mac we also need to link to iconv, since it's not available on std lib
    if [ "$(uname)" == "Darwin" ]; then
      LIBS="$LIBS -liconv"
    fi
  else
    libcurl_args+=("--without-libidn2")
  fi
fi

# --with-zstd was added on 7.72.0
# So this script only adds libidn2 for versions >= that one.
is_less_than_7_72_0=0
(printf '%s\n%s' "7.72.0" "$1" | $gsort -CV) || is_less_than_7_72_0=$?
if [ "$is_less_than_7_72_0" == "0" ]; then
  if [[ ! -z $ZSTD_BUILD_FOLDER ]]; then
    libcurl_args+=("--with-zstd=$ZSTD_BUILD_FOLDER")
  else
    libcurl_args+=("--without-zstd")
  fi
fi

# metalink options were removed from libcurl on 7.78.0
is_less_than_7_78_0=0
(printf '%s\n%s' "7.78.0" "$1" | $gsort -CV) || is_less_than_7_78_0=$?
if [ "$is_less_than_7_78_0" == "1" ]; then
  libcurl_args+=("--without-libmetalink")
fi

#####
# ssl
####
if [ ! -z "$OPENSSL_BUILD_FOLDER" ]; then
  CPPFLAGS="$CPPFLAGS -I$OPENSSL_BUILD_FOLDER/include"
  LDFLAGS="$LDFLAGS -L$OPENSSL_BUILD_FOLDER/lib -Wl,-rpath,$OPENSSL_BUILD_FOLDER/lib"

  libcurl_args+=("--with-ssl=$OPENSSL_BUILD_FOLDER")
else
  libcurl_args+=("--without-ssl")
fi

######
# gss-api
#####
if [ ! -z "$KERBEROS_BUILD_FOLDER" ]; then

  libcurl_args+=("--with-gssapi=$KERBEROS_BUILD_FOLDER")

  LDFLAGS="$LDFLAGS -L$KERBEROS_BUILD_FOLDER/lib -Wl,-rpath,$KERBEROS_BUILD_FOLDER/lib"

  if [ "$(uname)" == "Darwin" ]; then
    # libcurl does not uses krb5-config on macOS
    #  and even if it did, it would return more flags than needed
    #  because the bin there is built with shared libraries:
    # -L/Users/jcm/deps/kerberos/build/1.17/lib -dynamic \
    #  -mmacosx-version-min=x.y -L/Users/jcm/deps/openssl/build/1.1.0j/lib \
    #  -Wl,-rpath,/Users/jcm/deps/openssl/build/1.1.0j/lib -Wl,-search_paths_first \
    #  -lgssapi_krb5 -lkrb5 -lk5crypto -lcom_err
    # Currently it only links against -lgssapi_krb5 -lresolv
    LIBS="-lkrb5 -lk5crypto -lcom_err -lkrb5support $LIBS"
  else
    # On other *nix systems, those are needed for static build of kerberos
    # libcurl only links against -lgssapi_krb5 -lkrb5 -lk5crypto -lcom_err
    LIBS="-lkrb5support -lresolv $LIBS"
  fi
  
  
elif [ ! -z "$HEIMDAL_BUILD_FOLDER" ]; then

  libcurl_args+=("--with-gssapi=$HEIMDAL_BUILD_FOLDER")
  # On mac its bugged, see:
  # https://github.com/curl/curl/issues/3841
  if [ "$(uname)" == "Darwin" ]; then
    libcurl_args+=("--with-gssapi-libs=$HEIMDAL_BUILD_FOLDER/lib")
    libcurl_args+=("--with-gssapi-includes=$HEIMDAL_BUILD_FOLDER/include")
  fi

  # missing link against those
  # `krb5-config --libs gssapi` (the tool libcurl uses to retrieve the deps) does not add them
  CPPFLAGS="$CPPFLAGS -I$HEIMDAL_BUILD_FOLDER/include"
  LDFLAGS="$LDFLAGS -L$HEIMDAL_BUILD_FOLDER/lib -Wl,-rpath,$HEIMDAL_BUILD_FOLDER/lib"
  LIBS="-lkrb5 -lhx509 -lasn1 -lhcrypto -lheimsqlite -lheimntlm -lheimbase -lroken -lwind -lcom_err $LIBS"
else
  libcurl_args+=("--without-gssapi")
fi

######
# ldap
#####
if [ ! -z "$OPENLDAP_BUILD_FOLDER" ]; then
  # Only libcurl >= 7.64.1 has the check for ldap built with OpenSSL, so if we ever start building openldap with SSL
  # We will also need to add ldl and lcrypto here as lib
  # https://github.com/curl/curl/commit/66637b4d8fbc52aa1b57845cf45c7ccc7a95880f
  CPPFLAGS="$CPPFLAGS -I$OPENLDAP_BUILD_FOLDER/include"
  LDFLAGS="$LDFLAGS -L$OPENLDAP_BUILD_FOLDER/lib -Wl,-rpath,$OPENLDAP_BUILD_FOLDER/lib"

  libcurl_args+=("--enable-ldap")
  libcurl_args+=("--enable-ldaps")
else
  libcurl_args+=("--disable-ldap")
  libcurl_args+=("--disable-ldaps")
fi

#####
# libssh2
####
if [ ! -z "$LIBSSH2_BUILD_FOLDER" ]; then
  libcurl_args+=("--with-libssh2=$LIBSSH2_BUILD_FOLDER")
else
  libcurl_args+=("--without-libssh2")
fi

#####
# nghttp2
####
if [ ! -z "$NGHTTP2_BUILD_FOLDER" ]; then
  # CPPFLAGS="$CPPFLAGS -I$NGHTTP2_BUILD_FOLDER/include"
  # LDFLAGS="$LDFLAGS -L$NGHTTP2_BUILD_FOLDER/lib -Wl,-rpath,$NGHTTP2_BUILD_FOLDER/lib"
  libcurl_args+=("--with-nghttp2=$NGHTTP2_BUILD_FOLDER")
else
  libcurl_args+=("--without-nghttp2")
fi

#####
# c-ares
####
if [ ! -z "$CARES_BUILD_FOLDER" ]; then
  libcurl_args+=("--enable-ares=$CARES_BUILD_FOLDER")

  if [ "$(uname)" == "Darwin" ]; then
    # libcurl does not add this c-ares dependency automatically on macOS
    LIBS="-lresolv $LIBS"
  fi
fi

#####
# Brotli
####
if [ ! -z "$BROTLI_BUILD_FOLDER" ]; then
  CPPFLAGS="$CPPFLAGS -I$BROTLI_BUILD_FOLDER/include"
  LDFLAGS="$LDFLAGS -L$BROTLI_BUILD_FOLDER/lib -Wl,-rpath,$BROTLI_BUILD_FOLDER/lib"
  LIBS="-lbrotlicommon $LIBS"

  libcurl_args+=("--with-brotli=$BROTLI_BUILD_FOLDER")
else
  libcurl_args+=("--without-brotli")
fi

#####
# zlib
####
if [ ! -z "$ZLIB_BUILD_FOLDER" ]; then
  libcurl_args+=("--with-zlib=$ZLIB_BUILD_FOLDER")
else
  libcurl_args+=("--without-zlib")
fi

export LIBS=$LIBS
export CPPFLAGS=$CPPFLAGS
export LDFLAGS=$LDFLAGS

# Debug
    # --enable-debug \

# Release - Static
./configure \
    --enable-debug \
    --without-nss \
    --without-libpsl \
    --without-librtmp \
    --without-libidn \
    --disable-manual \
    --disable-shared \
    --prefix=$build_folder \
    "${libcurl_args[@]}" \
    "${@:3}"
    
# Release - Both


make && make install
