'use strict';

/**
 * Handles creating `{ type: 'object' }` vs `{ bsonType: 'object' }` vs `{ bsonType: ['object', 'null'] }`
 *
 * @param {String} type
 * @param {String} bsonType
 * @param {Boolean} useBsonType
 * @param {Boolean} isRequired
 */

module.exports = function createJSONSchemaTypeArray(type, bsonType, useBsonType, isRequired) {
  if (useBsonType) {
    if (isRequired) {
      return { bsonType };
    }
    return { bsonType: [bsonType, 'null'] };
  } else {
    if (isRequired) {
      return { type };
    }
    return { type: [type, 'null'] };
  }
};
