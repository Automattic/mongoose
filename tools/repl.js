'use strict';

run().catch(error => {
  console.error(error);
  process.exit(-1);
});

async function run() {
  const ReplSet = require('mongodb-memory-server').MongoMemoryReplSet;

  // Create new instance
  const replSet = new ReplSet({
    binary: {
      version: process.argv[2]
    },
    instanceOpts: [
      // Set the expiry job in MongoDB to run every second
      {
        port: 27017,
        args: ['--setParameter', 'ttlMonitorSleepSecs=1'] }
    ],
    dbName: 'mongoose_test',
    replSet: {
      name: 'rs0',
      count: 2,
      storageEngine: 'wiredTiger'
    }
  });

  await replSet.start();
  await replSet.waitUntilRunning();
  console.log('MongoDB-ReplicaSet is now running.');
  console.log(replSet.getUri('mongoose_test'));
}
