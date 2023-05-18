'use strict';

const mms = require('mongodb-memory-server');

/*

Note: dont use any mocha-specific things in this file, it may or may not be called without mocha (see deno.js)

*/

/*
 * Default MMS mongodb version is used, unless MONGOMS_VERSION is set (which is set with the matrix in test.yml for CI)
 */

// a single-instance running for single-instance tests
let mongoinstance;

// a replset-instance for running repl-set tests
let mongorreplset;

// decide whether to start MMS instances or use the existing URI's
const startMemoryInstance = !process.env.MONGOOSE_TEST_URI;
const startMemoryReplset = !process.env.MONGOOSE_REPLSET_URI;

module.exports.mochaGlobalSetup = async function mochaGlobalSetup() {
  let instanceuri;
  let replseturi;

  process.env.RUNTIME_DOWNLOAD = '1'; // ensure MMS is able to download binaries in this context
  process.env.MONGOMS_MD5_CHECK = '1';

  // set some options when running in a CI
  if (process.env.CI) {
    // this option is also set in the github-ci tests.yml, but this is just to ensure it is in any CI
    process.env.MONGOMS_PREFER_GLOBAL_PATH = '1'; // set MMS to use "~/.cache/mongodb-binaries" even when the path does not yet exist
  }

  if (startMemoryInstance) {
    mongoinstance = await mms.MongoMemoryServer.create({ instance: { args: ['--setParameter', 'ttlMonitorSleepSecs=1'], storageEngine: 'wiredTiger' } });
    instanceuri = mongoinstance.getUri();
  } else {
    instanceuri = process.env.MONGOOSE_TEST_URI;
  }

  if (startMemoryReplset) {
    mongorreplset = await mms.MongoMemoryReplSet.create({ replSet: { count: 3, args: ['--setParameter', 'ttlMonitorSleepSecs=1'], storageEngine: 'wiredTiger' } }); // using 3 because even numbers can lead to vote problems
    replseturi = mongorreplset.getUri();
  } else {
    replseturi = process.env.MONGOOSE_REPLSET_URI;
  }

  process.env.MONGOOSE_TEST_URI = instanceuri;
  process.env.MONGOOSE_REPLSET_URI = replseturi;
};

module.exports.mochaGlobalTeardown = async function mochaGlobalTeardown() {
  if (mongoinstance) {
    await mongoinstance.stop();
  }
  if (mongorreplset) {
    await mongorreplset.stop();
  }
};
