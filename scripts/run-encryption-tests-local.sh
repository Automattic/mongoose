#!/usr/bin/env bash

# sets up an encrypted mongodb cluster

export CWD=$(pwd);

if [ -d "encrypted-cluster" ]; then
  cd encrypted-cluster
else
  source $CWD/scripts/start-encrypted-cluster.sh
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
