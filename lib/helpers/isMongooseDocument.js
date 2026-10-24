'use strict';

const getInheritedProperty = require('./getInheritedProperty');

/**
 * Returns true if `v` has Mongoose document internals: a `$__` property that
 * is an `InternalCache`. Use this instead of `v.$__ != null` when `v` may be
 * user data, because user data can contain a `$__` key.
 *
 * Checks for `InternalCache.prototype.strictMode` rather than using `instanceof`,
 * so documents created by a different copy of Mongoose still count. Spread
 * documents (`{ ...doc }`) also count, because they copy the document's `$__`.
 *
 * @param {any} v
 * @return {boolean}
 * @api private
 */

module.exports = function isMongooseDocument(v) {
  if (v == null) {
    return false;
  }
  const internals = v.$__;
  return internals != null && getInheritedProperty(internals, 'strictMode') != null;
};
