#!/bin/bash
# https://stackoverflow.com/a/13350100/710693
set -euo pipefail

# download tar gz file from source_url and unpack it to destination
# download_and_upack <source_url> <destination>
download_and_unpack() {
  mkdir -p "$2"
  # Download to a temp file first instead of streaming straight into tar.
  # The previous `wget -qO- | tar xzf -` pipe couldn't recover from a
  # truncated response (e.g. curl.se/GitHub-release occasional hiccups) —
  # tar consumes the partial bytes immediately and fails with
  # "gzip: stdin: unexpected end of file" before wget's own retry can fire.
  # With a temp file, wget can retry until the file is whole, and we only
  # touch tar once.
  local tmpfile
  tmpfile=$(mktemp)
  trap "rm -f \"$tmpfile\"" RETURN
  # User agent for Edge on macOS
  wget --tries=5 --waitretry=3 --timeout=30 --retry-connrefused \
       -U "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36 Edg/94.0.992.38" \
       -qO "$tmpfile" "$1"
  tar xzf "$tmpfile" -C "$2"
}

if [ "${1}" != "--source-only" ]; then
  download_and_unpack "${@}"
fi
