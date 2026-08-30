'use strict';

const isBsonType = require('../helpers/isBsonType');
const ObjectId = require('../types/objectid');

module.exports = function castObjectId(value) {
  if (Array.isArray(value)) {
    // ObjectId accepts nested arrays through Array#toString().
    if (value.length !== 1) {
      throw new Error('Arrays must have exactly one element to be cast to an ObjectId');
    }
    if (Array.isArray(value[0])) {
      throw new Error('Nested arrays cannot be cast to an ObjectId');
    }
    value = value[0];
  }

  if (value == null) {
    return value;
  }
  if (value === '') {
    return null;
  }

  if (isBsonType(value, 'ObjectId')) {
    return value;
  }

  if (value._id) {
    if (isBsonType(value._id, 'ObjectId')) {
      return value._id;
    }
    if (value._id.toString instanceof Function) {
      return new ObjectId(value._id.toString());
    }
  }

  if (value.toString instanceof Function) {
    return new ObjectId(value.toString());
  }

  return new ObjectId(value);
};
