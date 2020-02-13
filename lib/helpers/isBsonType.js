'use strict';

const get = require('./get');

/*!
 * Get the bson type, if it exists
 */

function isBsonType(obj, typename) {
  return get(obj, '_bsontype', void 0) === typename;
}

module.exports = isBsonType;
