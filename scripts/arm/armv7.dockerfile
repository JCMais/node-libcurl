FROM jonathancardoso/ci-arm32v7

# docker run --rm --name node-libcurl-arm32v7 -it -v E:\\jc\\node-libcurl:/home/circleci/node-libcurl -v /home/circleci/node-libcurl/node_modules/ -v E:\\jc\\.cache\\electron:/home/circleci/.cache/electron -v E:\\jc\\node-libcurl\\debug\\image-deps-arm32v7:/home/circleci/deps/ node-libcurl-arm32v7
# cd ~/node-libcurl && sudo chown circleci:circleci -R ./ && sudo chown circleci:circleci -R ~/.cache
# PUBLISH_BINARY=false GIT_TAG="" GIT_COMMIT="" TARGET_ARCH="armv7" ./scripts/ci/build.sh
ENTRYPOINT [ "/bin/bash" ]
