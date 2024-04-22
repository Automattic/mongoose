'use strict';

const get = require('../get');

module.exports = function applyReadConcern(schema, options) {
  if (options.readConcern != null) {
    return;
  }
  // Don't apply default write concern to operations in transactions,
  // because setting write concern on an operation in a transaction is an error
  // See: https://www.mongodb.com/docs/manual/reference/write-concern/
  if (options && options.session && options.session.transaction) {
    return;
  }
  const readConcern = get(schema, 'options.readConcern', {});
  if (Object.keys(readConcern).length != 0) {
    options.readConcern = {};
    if (!('majority' in options) && readConcern.level != null) {
      options.readConcern.level = readConcern.level;
    }
  }
  else {
    if (!('majority' in options) && readConcern.level != null) {
      options.readConcern.level = readConcern.level;
    }
  }
};
