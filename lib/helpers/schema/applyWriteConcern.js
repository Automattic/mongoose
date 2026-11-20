'use strict';

const utils = require('../../utils');

const writeConcernKeys = ['w', 'j', 'wtimeout'];

/**
 * Moves top-level `w`, `j`, `wtimeout` into `options.writeConcern` (the driver ignores them).
 * Precedence: top-level > `options.writeConcern` > schema `writeConcern`.
 * Mutates `options` (pass a copy), but not `options.writeConcern`.
 *
 * @param {Schema} schema
 * @param {object} options
 * @api private
 */

module.exports = function applyWriteConcern(schema, options) {
  // Setting write concern on an operation in a transaction is an error
  // See: https://www.mongodb.com/docs/manual/reference/write-concern/
  if (options.session?.inTransaction?.()) {
    return;
  }

  const hasWriteConcernOption = options.writeConcern != null;
  const writeConcern = hasWriteConcernOption ? { ...options.writeConcern } : {};

  for (const key of writeConcernKeys) {
    if (key in options) {
      if (options[key] != null) {
        writeConcern[key] = options[key];
      }
      delete options[key];
    }
  }

  // Skip schema defaults when a session is set
  const schemaWriteConcern = schema.options.writeConcern;
  if (!hasWriteConcernOption && !options.session?.transaction && schemaWriteConcern != null) {
    for (const key of writeConcernKeys) {
      if (!(key in writeConcern) && schemaWriteConcern[key] != null) {
        writeConcern[key] = schemaWriteConcern[key];
      }
    }
  }

  if (hasWriteConcernOption || utils.hasOwnKeys(writeConcern)) {
    options.writeConcern = writeConcern;
  }
};
