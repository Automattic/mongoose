'use strict';

exports.clearTestData = function clearTestData(db) {
  if (db.models == null) {
    return;
  }

  const arr = [];

  for (const model of Object.keys(db.models)) {
    arr.push(db.models[model].deleteMany({}));
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