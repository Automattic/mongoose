'use strict';

/*!
 * Get the bson type, if it exists
 */

function isBsonType(obj, typename) {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    obj._bsontype === typename
  );
}

module.exports = isBsonType;
