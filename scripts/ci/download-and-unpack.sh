#!/bin/bash
# https://stackoverflow.com/a/13350100/710693
set -euo pipefail

# download tar gz file from source_url and unpack it to destination
# download_and_upack <source_url> <destination>
download_and_unpack() {
  mkdir -p $2
  # User agent for Edge on macOS 
  wget -U "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36 Edg/94.0.992.38" \
       -qO- $1 | tar xzf - -C $2
}

if [ "${1}" != "--source-only" ]; then
  download_and_unpack "${@}"
fi
