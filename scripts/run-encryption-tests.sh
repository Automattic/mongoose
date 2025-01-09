#!/usr/bin/env bash

# sets up mongodb cluster and encryption configuration, adds relevant variables to the environment, and runs encryption tests

export CWD=$(pwd);

# install encryption dependency
npm install mongodb-client-encryption > /dev/null

# set up mongodb cluster and encryption configuration if the data/ folder does not exist
# note: for tooling, cluster set-up and configuration look into the 'scripts/configure-cluster-with-encryption.sh' script
if [ -d "data" ]; then
  cd data
else
  source $CWD/scripts/configure-cluster-with-encryption.sh
fi

# run encryption tests
cd ..
npx mocha --exit ./test/encryption/*.test.js

# uninstall encryption dependency
npm uninstall mongodb-client-encryption > /dev/null