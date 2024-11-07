'use strict';

/**
 * Get the bson type, if it exists
 * @api private
 */

function isBsonType(obj, typename) {
  return (
    obj != null &&
    obj._bsontype === typename
  );
}

module.exports = isBsonType;
