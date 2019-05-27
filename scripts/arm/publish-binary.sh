#!/bin/bash

cd ~/node-libcurl

user=$(whoami)

# fix permissions for directories created when mounting volumes from Windows
sudo chown $user:$user -R ./ && sudo chown $user:$user -R ~/.cache

./scripts/ci/build.sh
