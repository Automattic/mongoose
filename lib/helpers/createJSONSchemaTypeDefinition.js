'use strict';

/**
 * Handles creating `{ type: 'object' }` vs `{ bsonType: 'object' }` vs `{ bsonType: ['object', 'null'] }`
 *
 * @param {string} type
 * @param {string} bsonType
 * @param {object} schemaTypeOptions
 * @param {object} options
 * @param {boolean} [options.useBsonType=false]
 * @param {boolean} [options._defaultRequired=false]
 * @param {boolean} [options._overrideRequired=false]
 */

module.exports = function createJSONSchemaTypeDefinition(type, bsonType, schemaTypeOptions, options) {
  const useBsonType = options?.useBsonType;
  const isRequired = options?._overrideRequired ??
    (schemaTypeOptions.required === undefined ?
      options?._defaultRequired === true :
      schemaTypeOptions.required && typeof schemaTypeOptions.required !== 'function');

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
