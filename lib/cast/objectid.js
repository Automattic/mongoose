'use strict';

const isBsonType = require('../helpers/isBsonType');
const ObjectId = require('../driver').get().ObjectId;

module.exports = function castObjectId(value) {
  if (value == null) {
    return value;
  }

  if (isBsonType(value, 'ObjectID')) {
    return value;
  }

  if (value._id) {
    if (isBsonType(value._id, 'ObjectID')) {
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
