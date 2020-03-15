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