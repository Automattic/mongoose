'use strict';

/*!
 * Generates a random string
 *
 * @api private
 */

exports.random = function() {
  return Math.random().toString().substring(3);
};

exports.clearTestData = function clearTestData(db) {
  if (db.models == null) {
    return;
  }

  const arr = [];

  for (const model of Object.keys(db.models)) {
    const Model = db.models[model];
    if (Model.baseModelName != null) {
      // Skip discriminators
      continue;
    }
    // Avoid dropping collections, because dropping collections has historically been
    // painfully slow on the WiredTiger storage engine
    arr.push(db.models[model].deleteMany({}).catch(err => {
      if (err.message === 'Time-series deletes are not enabled') {
        // Can't empty out a timeseries collection using `deleteMany()`, see:
        // https://docs.mongodb.com/manual/core/timeseries/timeseries-limitations/#updates-and-deletes
        return db.models[model].collection.drop();
      }
      throw err;
    }));
    arr.push(db.models[model].collection.dropIndexes().catch(() => {}));
  }

  return Promise.all(arr);
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
