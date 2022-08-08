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

  const promises = Object.keys(db.models).map(model => {
    const Model = db.models[model];
    if (Model.baseModelName != null) {
      // Skip discriminators
      return null;
    }
    return db.models[model].collection.drop().catch(err => {
      if (err.codeName === 'NamespaceNotFound') {
        return;
      }
      throw err;
    });
  });

  return Promise.all(promises);
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
