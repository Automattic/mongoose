'use strict';

const MongooseError = require('../../error/mongooseError');

/*!
 * Detects and validates mongoose "named parameters" (RORO style), e.g.
 * `Model.findOne({ $filter, $projection, $options })`.
 *
 * A call is treated as named parameters when a single object argument is passed
 * and at least one of its top-level keys is a recognized sentinel for the
 * method. `$`-prefixed sentinels can never collide with a positional filter,
 * since the server rejects unknown `$`-prefixed keys as top-level operators.
 *
 * @param {String} method the calling method name, used in error messages
 * @param {String[]} sentinels recognized `$`-prefixed keys, e.g. `['$filter', '$projection', '$options']`
 * @param {Array|arguments} args the arguments passed to the method
 * @return {Object|null} the named params keyed without the `$` (e.g. `{ filter, projection, options }`), or `null` if positional
 * @api private
 */

module.exports = function getNamedParams(method, sentinels, args) {
  const first = args[0];
  if (first == null || typeof first !== 'object' || Array.isArray(first)) {
    return null;
  }

  const keys = Object.keys(first);
  const usesNamedParams = keys.some(key => sentinels.indexOf(key) !== -1);
  if (!usesNamedParams) {
    return null;
  }

  if (args.length > 1) {
    throw new MongooseError(
      `${method}() named parameters must be passed as a single argument`
    );
  }

  const params = {};
  for (const key of keys) {
    if (sentinels.indexOf(key) === -1) {
      throw new MongooseError(
        `${method}() received an invalid named parameter \`${key}\`. ` +
        `Named parameters must use only: ${sentinels.join(', ')}.`
      );
    }
    params[key.slice(1)] = first[key];
  }

  return params;
};
