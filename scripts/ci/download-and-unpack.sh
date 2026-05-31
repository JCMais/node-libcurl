#!/bin/bash
# https://stackoverflow.com/a/13350100/710693
set -euo pipefail

# download tar gz file from source_url and unpack it to destination
# download_and_upack <source_url> <destination>
download_and_unpack() {
  mkdir -p "$2"
  # Download to a temp file first instead of streaming straight into tar.
  # The previous `wget -qO- | tar xzf -` pipe couldn't recover from a
  # truncated response (e.g. curl.se / GitHub-release occasional hiccups) —
  # tar consumes the partial bytes immediately and fails with
  # "gzip: stdin: unexpected end of file" before any retry can fire.
  # With a temp file, we can retry until the file is whole, and we only
  # touch tar once.
  #
  # The retry loop is done in bash rather than via wget's own retry flags
  # because Alpine ships BusyBox wget, which only supports -c/-q/-O/-U/-T —
  # no --tries, --waitretry, --retry-connrefused. Hand-rolling the loop
  # keeps us portable across GNU wget (Ubuntu/macOS) and BusyBox wget
  # (Alpine container) without conditional code.
  local tmpfile
  tmpfile=$(mktemp)
  trap "rm -f \"$tmpfile\"" RETURN

  local attempts=5
  local i=1
  local sleep_sec=3
  # User agent for Edge on macOS
  local user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36 Edg/94.0.992.38"

  while [ "$i" -le "$attempts" ]; do
    # -T sets the read timeout in seconds and is available in both GNU
    # and BusyBox wget.
    if wget -q -T 60 -U "$user_agent" -O "$tmpfile" "$1"; then
      tar xzf "$tmpfile" -C "$2"
      return 0
    fi
    echo "download attempt $i/$attempts for $1 failed; retrying in ${sleep_sec}s..." >&2
    i=$((i + 1))
    sleep "$sleep_sec"
  done

  echo "download failed after $attempts attempts: $1" >&2
  return 1
}

if [ "${1}" != "--source-only" ]; then
  download_and_unpack "${@}"
fi
