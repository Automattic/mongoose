'use strict';

const StrictModeError = require('../../error/strict');

/**
 * Handle immutable option for a given path when casting updates based on options
 *
 * @param {SchemaType} schematype the resolved schematype for this path
 * @param {boolean | 'throw' | null} strict whether strict mode is set for this query
 * @param {object} obj the object containing the value being checked so we can delete
 * @param {string} key the key in `obj` which we are checking for immutability
 * @param {string} fullPath the full path being checked
 * @param {object} options the query options
 * @param {Query} ctx the query. Passed as `this` and first param to the `immutable` option, if `immutable` is a function
 * @returns {boolean} true if field was removed, false otherwise
 */

module.exports = function handleImmutable(schematype, strict, obj, key, fullPath, options, ctx) {
  if (!schematype?.options?.immutable) {
    return false;
  }
  let immutable = schematype.options.immutable;

  if (typeof immutable === 'function') {
    immutable = immutable.call(ctx, ctx);
  }
  if (!immutable) {
    return false;
  }

  if (options?.overwriteImmutable) {
    return false;
  }
  if (strict === false) {
    return false;
  }
  if (strict === 'throw') {
    throw new StrictModeError(null,
      `Field ${fullPath} is immutable and strict = 'throw'`);
  }

  delete obj[key];
  return true;
};
