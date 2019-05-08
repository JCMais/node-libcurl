
#!/bin/bash
# <release> <dest_folder>
gsort=sort
if [ "$(uname)" == "Darwin" ]; then
  if ! command -v gsort &>/dev/null; then
    (>&2 echo "Could not find a gnu sort compatible binary, we need it to compare libcurl version")
    (>&2 echo "You can get them by installing the coreutils package:")
    (>&2 echo "brew install coreutils")
    exit 1
  fi

  gsort=gsort
fi
