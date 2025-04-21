'use strict';
const { downloadMongoDb } = require('@mongodb-js/mongodb-downloader');
const { instances, start } = require('mongodb-runner');
const { rm, readdir, writeFile } = require('fs/promises');
const { tmpdir } = require('os');
const { join, resolve } = require('path');


async function main() {
  const runnerDir = join(resolve(__dirname), '../data');
  const serverVersion = '8.0';

  const { uri, cryptShared } = await run();
  await writeFile('mo-expansion.yml',
    `CRYPT_SHARED_LIB_PATH: "${cryptShared}"
MONGODB_URI: "${uri}"`
  );

  async function downloadCryptShared() {
    const crypt_shared_dir = await downloadMongoDb(join(runnerDir, 'crypt'), serverVersion, {
      enterprise: true,
      crypt_shared: true
    });

    for (const dirEntry of await readdir(crypt_shared_dir)) {
      if (/crypt/.test(dirEntry)) {
        return join(crypt_shared_dir, dirEntry);
      }
    }
  }

  async function run() {
    await rm(runnerDir, { recursive: true }).catch(() => {});

    const cryptShared = await downloadCryptShared();
    const binDir = await downloadMongoDb(runnerDir, serverVersion, {
      enterprise: true
    });

    await start({ id: 'encryption-test-cluster', binDir, topology: 'replset', runnerDir, tmpDir: tmpdir() });

    for await (const instance of instances({ runnerDir })) {
      if (instance.id === 'encryption-test-cluster') return {
        cryptShared, uri: instance.connectionString
      };
    }

    throw new Error('Unable to location newly configured instance of mongod - should never happen.');
  }
}

main();
