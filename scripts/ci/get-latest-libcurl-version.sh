#!/bin/bash
set -eu

git ls-remote --tags https://github.com/curl/curl.git \
  | awk '{print $2}' \
  | grep 'curl-' \
  | grep -v '[0-9][_-][abp]' \
  | grep -v '{' \
  | sort -t_ -k 1.16,1n -k 2,2n -k 3,3n -k 4,4n \
  | sed -n 's@.*curl-\([0-9_]\)@\1@p' \
  | tail -n1 \
  | sed 's/\_/./g'
