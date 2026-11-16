'use strict';

/**
 * Get the bson type, if it exists
 * @api private
 */

function isBsonType(obj, typename) {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    obj._bsontype === typename &&
    // bson defines `_bsontype` on the prototype, so an own `_bsontype` means a plain object pretending to be a bson value
    !Object.prototype.hasOwnProperty.call(obj, '_bsontype')
  );
}

module.exports = isBsonType;
