#!/bin/bash

if [ -f `curl-config --prefix`/lib/libcurl.dylib ]; then
    install_name_tool -change $(otool -D `curl-config --prefix`/lib/libcurl.dylib | sed -n 2p) @rpath/libcurl.dylib $1
else
    echo "File does not exist. Skipping postbuild steps. This means libcurl binaries were not found"
fi
