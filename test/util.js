'use strict';

/**
 * Generates a random string
 */

exports.random = function() {
  return Math.random().toString().substring(3);
};

exports.clearTestData = function clearTestData(db) {
  return db.dropDatabase();
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
