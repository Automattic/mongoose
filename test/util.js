'use strict';
const mongoose = require('../index');

/**
 * Generates a random string
 */

exports.random = function() {
  return Math.random().toString().substring(3);
};

exports.clearTestData = async function clearTestData(db) {
  async function _inner() {
    await db.dropDatabase();
  }
  // retry the "dropDBs" actions if the error is "operation was interrupted", which can often happen in replset CI tests
  let retries = 5;
  while (retries > 0) {
    retries -= 1;
    try {
      await _inner();
    } catch (err) {
      if (err instanceof mongoose.mongo.MongoWriteConcernError && /operation was interrupted/.test(err.message)) {
        console.log('DropDB operation interrupted, retrying'); // log that a error was thrown to know that it is going to re-try
        continue;
      }

      throw err;
    }
  }
};

exports.stopRemainingOps = function stopRemainingOps(db) {
  // Make all future operations on currently defined models hang
  // forever. Since the collection gets deleted, should get
  // garbage collected.
  for (const name of Object.keys(db.models)) {
    const model = db.models[name];
    model.collection.buffer = true;
  }
};
