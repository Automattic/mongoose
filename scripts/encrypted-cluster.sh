#!/usr/bin/env bash

# sets up an encrypted mongodb cluster

if [ -d "encrypted-cluster" ]; then
  cd encrypted-cluster
else
  mkdir encrypted-cluster
  cd encrypted-cluster

  if [-d drivers-evergreen-tools]; then 
    git clone --depth=1 "https://github.com/mongodb-labs/drivers-evergreen-tools.git"
  fi

  export DRIVERS_TOOLS=$(pwd)/drivers-evergreen-tools
  export MONGODB_VERSION=8.0
  export AUTH=true
  export MONGODB_BINARIES=$DRIVERS_TOOLS/mongodb/bin
  export NODE_DRIVER=~/dev/node-mongodb-native
  export MONGO_ORCHESTRATION_HOME=$DRIVERS_TOOLS/mo
  export PROJECT_ORCHESTRATION_HOME=$DRIVERS_TOOLS/.evergreen/orchestration
  export TOPOLOGY=sharded_cluster
  export SSL=nossl

  cd $DRIVERS_TOOLS
  rm -rf mongosh mongodb mo
  mkdir mo
  cd -

  rm expansions.sh 2> /dev/null

  bash $DRIVERS_TOOLS/.evergreen/run-orchestration.sh
fi

# IMPORTANT: extracts mongodb-uri, and starts the cluster of servers, store the uri for GitHub output

read -r -d '' SOURCE_SCRIPT << EOM
const fs = require('fs');
const file = fs.readFileSync('mo-expansion.yml', { encoding: 'utf-8' })
	.trim().split('\\n');
const regex = /^(?<key>.*): "(?<value>.*)"$/;
const variables = file.map(
	(line) => regex.exec(line.trim()).groups
).map(
	({key, value}) => \`export \${key}='\${value}'\`
).join('\n');

process.stdout.write(variables);
process.stdout.write('\n');
EOM

node --eval "$SOURCE_SCRIPT" | tee expansions.sh
source expansions.sh

export MONGOOSE_TEST_URI=$MONGODB_URI

npm run test-encryption
