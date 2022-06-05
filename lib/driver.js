'use strict';

/*!
 * ignore
 */

let driver = null;

const _mongooseInstances = [];
module.exports._mongooseInstances = _mongooseInstances;

module.exports.get = function() {
  return driver;
};

module.exports.set = function(v) {
  driver = v;

  for (const mongoose of _mongooseInstances) {
    const Connection = driver.getConnection();
    mongoose.Connection = Connection;
    mongoose.connections = [new Connection(mongoose)];
    mongoose.Collection = driver.Collection;
  }
};
