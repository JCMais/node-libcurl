#!/bin/sh
# https://stackoverflow.com/a/13350100/710693
set -e

# download tar gz file from source_url and unpack it to destination
# download_and_upack <source_url> <destination>
download_and_unpack() {
  mkdir -p $2
  wget -qO- $1 | tar xzf - -C $2
}

main() {
  download_and_unpack "${@}"
}

if [ "${1}" != "--source-only" ]; then
  main "${@}"
fi
