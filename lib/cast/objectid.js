'use strict';

const ObjectId = require('../driver').get().ObjectId;
const assert = require('assert');

module.exports = function castObjectId(value) {
  if (value == null) {
    return value;
  }

  if (value instanceof ObjectId) {
    return value;
  }

  if (value._id) {
    if (value._id instanceof ObjectId) {
      return value._id;
    }
    if (value._id.toString instanceof Function) {
      return new ObjectId(value._id.toString());
    }
  }

  if (value.toString instanceof Function) {
    return new ObjectId(value.toString());
  }

  assert.ok(false);
};