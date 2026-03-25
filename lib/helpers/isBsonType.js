'use strict';

/**
 * Determines if `obj` has the given BSON type.
 * @api private
 */

function isBsonType(obj, typename) {
  return (
    obj != null &&
    obj._bsontype === typename
  );
}

module.exports = isBsonType;
