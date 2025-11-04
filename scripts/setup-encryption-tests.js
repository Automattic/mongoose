'use strict';

const { downloadMongoDb } = require('@mongodb-js/mongodb-downloader');
const { instances, start } = require('mongodb-runner');
const { rm, readdir, writeFile } = require('fs/promises');
const { tmpdir } = require('os');
const { join, resolve } = require('path');

async function main() {
  const runnerDir = join(resolve(__dirname), '../data');
  const serverVersion = '8.0';

  const configuration = await run();
  await writeFile('fle-cluster-config.json', JSON.stringify(configuration, null, 2));

  async function downloadCryptShared() {
    const crypt_shared_dir = await downloadMongoDb({
      directory: join(runnerDir, 'crypt'),
      version: serverVersion,
      downloadOptions: {
        enterprise: true,
        crypt_shared: true
      }
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
    const binDir = await downloadMongoDb({
      directory: runnerDir,
      version: serverVersion,
      downloadOptions: {
        enterprise: true
      }
    });

    await start({ id: 'encryption-test-cluster', binDir, topology:
      'sharded', runnerDir, tmpDir: tmpdir() });

    for await (const instance of instances({ runnerDir })) {
      if (instance.id === 'encryption-test-cluster') {
        return {
          cryptShared, uri: instance.connectionString
        };
      }
    }

    throw new Error('Unable to locate newly configured instance of mongod - should never happen.');
  }
}

main();
