'use strict';

const getInheritedProperty = require('./getInheritedProperty');

/**
 * Returns true if `v` is a Mongoose document: `v` inherits
 * `Document.prototype.$isMongooseDocumentPrototype`. Use this instead of
 * `v.$__ != null` when `v` may be user data, because user data can contain a
 * `$__` key.
 *
 * Checks the prototype marker rather than using `instanceof`, so documents
 * created by a different copy of Mongoose still count. Spread documents
 * (`{ ...doc }`) are POJOs, so they do **not** count.
 *
 * @param {any} v
 * @return {boolean}
 * @api private
 */

module.exports = function isMongooseDocument(v) {
  return getInheritedProperty(v, '$isMongooseDocumentPrototype') === true;
};
