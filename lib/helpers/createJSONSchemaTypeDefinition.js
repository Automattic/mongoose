'use strict';

/**
 * Handles creating `{ type: 'object' }` vs `{ bsonType: 'object' }` vs `{ bsonType: ['object', 'null'] }`
 *
 * @param {string} type
 * @param {string} bsonType
 * @param {boolean} useBsonType
 * @param {boolean} isRequired
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
