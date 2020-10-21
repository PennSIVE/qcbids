#!/bin/bash

if [ -e .env ]
then
    . .env # define GH_TOKEN
fi

# see https://www.electron.build/multi-platform-build#docker
docker run --rm -ti \
 --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS_TAG|TRAVIS|TRAVIS_REPO_|TRAVIS_BUILD_|TRAVIS_BRANCH|TRAVIS_PULL_REQUEST_|APPVEYOR_|CSC_|GH_|GITHUB_|BT_|AWS_|STRIP|BUILD_') \
 --env ELECTRON_CACHE="/root/.cache/electron" \
 --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
 --env GH_TOKEN=$GH_TOKEN \
 --env DEBUG=electron-download,electron-packager,extract-zip \
 -v ${PWD}:/project \
 -v /Users/tim:/Users/tim \
 -v ${PWD##*/}-node-modules:/project/node_modules \
 -v ~/.cache/electron:/root/.cache/electron \
 -v ~/.cache/electron-builder:/root/.cache/electron-builder \
 electronuserland/builder:wine-chrome /bin/bash -c "yarn && yarn release"

yarn && yarn release-mac