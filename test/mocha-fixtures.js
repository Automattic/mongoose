'use strict';

const mms = require('mongodb-memory-server');

/*
 * Default MMS mongodb version is used, unless MONGOMS_VERSION is set (which is set with the matrix in test.yml for CI)
 */

// a single-instance running for single-instance tests
let mongoinstance;

// a replset-instance for running repl-set tests
let mongorreplset;

// decide wheter to start a in-memory or not
const startMemoryInstance = !process.env.MONGOOSE_TEST_URI;
const startMemoryReplset = !process.env.MONGOOSE_REPLSET_URI;

module.exports.mochaGlobalSetup = async function mochaGlobalSetup() {
  let instanceuri;
  let replseturi;

  process.env.RUNTIME_DOWNLOAD = '1'; // ensure MMS is able to download binaries in this context

  // set some options when running in a CI
  if (process.env.CI) {
    process.env.MONGOMS_PREFER_GLOBAL_PATH = '1'; // set MMS to use "~/.cache/mongodb-binaries" even when the path does not yet exist
  }

  if (startMemoryInstance) { // Config to decided if an mongodb-memory-server instance should be used
    // it's needed in global space, because we don't want to create a new instance every test-suite
    mongoinstance = await mms.MongoMemoryServer.create({ instance: { args: ['--setParameter', 'ttlMonitorSleepSecs=1'] } });
    instanceuri = mongoinstance.getUri();
  } else {
    instanceuri = process.env.MONGOOSE_TEST_URI;
  }

  if (startMemoryReplset) {
    mongorreplset = await mms.MongoMemoryReplSet.create({ replSet: { count: 3, args: ['--setParameter', 'ttlMonitorSleepSecs=1'] } }); // using 3 because even numbers can lead to vote problems
    replseturi = mongorreplset.getUri();
  } else {
    replseturi = '';
  }

  process.env.MONGOOSE_TEST_URI = instanceuri;
  process.env.MONGOOSE_REPLSET_URI = replseturi;

  // The following is to make sure the database is clean before an test starts
  // const client = new mongodb.MongoClient(finaluri);
  // await client.connect();
};

module.exports.mochaGlobalTeardown = async function mochaGlobalTeardown() {
  if (mongoinstance) { // Config to decided if an mongodb-memory-server instance should be used
    await mongoinstance.stop();
  }
  if (mongorreplset) {
    await mongorreplset.stop();
  }
};
