'use strict';
const { downloadMongoDb } = require('@mongodb-js/mongodb-downloader');
const { instances, start } = require('mongodb-runner');
const { rm, readdir, writeFile } = require('fs/promises');
const { tmpdir } = require('os');
const { join, resolve } = require('path');

async function getCryptShared() {
  const crypt_shared_dir = await downloadMongoDb('./data/crypt', '8.0', {
    enterprise: true,
    crypt_shared: true
  });

  for (const direntry of await readdir(crypt_shared_dir)) {
    if (/crypt/.test(direntry)) {
      return join(crypt_shared_dir, direntry);
    }
  }
}

const runnerDir = join(resolve(__dirname), '../data');
const id = 'my-cluster';

async function run() {
  await rm(runnerDir, { recursive: true }).catch(e => {});

  const cryptShared = await getCryptShared();
  const binDir = await downloadMongoDb('./data', '8.0', {
    enterprise: true
  });

  const tmpDir = tmpdir();

  await start({ id, binDir, topology: 'replset', runnerDir, tmpDir });

  for await (const instance of instances({ runnerDir })) {
    if (instance.id === id) return {
      cryptShared, uri: instance.connectionString
    };
  }

  throw new Error('unable to find new instance.');
}

async function stop() {
  await require('mongodb-runner').stop({
    runnerDir,
    id
  });
}

async function main() {
  const { uri, cryptShared } = await run();
  await writeFile('mo-expansion.yml',
    `
        CRYPT_SHARED_LIB_PATH: "${cryptShared}"
        MONGODB_URI: "${uri}"
        `
  );
}

if (require.main === module) {
  main();
}
else {
  module.exports = { start: run, stop };
}
