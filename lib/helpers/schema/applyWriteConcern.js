'use strict';

const utils = require('../../utils');

module.exports = function applyWriteConcern(schema, options) {
  if (options.writeConcern != null) {
    return;
  }
  // Don't apply default write concern to operations in transactions,
  // because setting write concern on an operation in a transaction is an error
  // See: https://www.mongodb.com/docs/manual/reference/write-concern/
  if (options?.session?.transaction) {
    return;
  }
  const writeConcern = schema.options.writeConcern ?? {};
  if (utils.hasOwnKeys(writeConcern)) {
    options.writeConcern = {};
    if (!('w' in options) && writeConcern.w != null) {
      options.writeConcern.w = writeConcern.w;
    }
    if (!('j' in options) && writeConcern.j != null) {
      options.writeConcern.j = writeConcern.j;
    }
    if (!('wtimeout' in options) && writeConcern.wtimeout != null) {
      options.writeConcern.wtimeout = writeConcern.wtimeout;
    }
  }
  else {
    if (!('w' in options) && writeConcern.w != null) {
      options.w = writeConcern.w;
    }
    if (!('j' in options) && writeConcern.j != null) {
      options.j = writeConcern.j;
    }
    if (!('wtimeout' in options) && writeConcern.wtimeout != null) {
      options.wtimeout = writeConcern.wtimeout;
    }
  }
};
