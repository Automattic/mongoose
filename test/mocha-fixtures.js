'use strict';

const mms = require('mongodb-memory-server');
const mmsresolve = require('mongodb-memory-server-core/lib/util/resolveConfig');

/*
 * Default MMS mongodb version is used, unless MONGOMS_VERSION is set (which is set with the matrix in test.yml for CI)
 */

// a single-instance running for single-instance tests
let mongoinstance;

// a replset-instance for running repl-set tests
let mongorreplset;

// decide wheter to start a in-memory or not
const startMemory = !mmsresolve.envToBool(process.env.CI) && !process.env.MONGOOSE_TEST_URI;

module.exports.mochaGlobalSetup = async function mochaGlobalSetup() {
  let instanceuri;
  let replseturi;
  if (startMemory) { // Config to decided if an mongodb-memory-server instance should be used
    // it's needed in global space, because we don't want to create a new instance every test-suite
    mongoinstance = await mms.MongoMemoryServer.create({ instance: { args: ['--setParameter', 'ttlMonitorSleepSecs=1'] } });
    const uri = mongoinstance.getUri();
    instanceuri = uri.slice(0, uri.lastIndexOf('/'));

    mongorreplset = await mms.MongoMemoryReplSet.create({ replSet: { count: '3', args: ['--setParameter', 'ttlMonitorSleepSecs=1'] } }); // using 3 because even numbers can lead to vote problems
    replseturi = mongorreplset.getUri();
  } else {
    instanceuri = process.env.MONGOOSE_TEST_URI;
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
};
