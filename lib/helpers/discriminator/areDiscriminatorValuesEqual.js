'use strict';

const ObjectId = require('../../types/objectid');

module.exports = function areDiscriminatorValuesEqual(a, b) {
  if (typeof a === 'string' && typeof b === 'string') {
    return a === b;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b;
  }
  if (a instanceof ObjectId && b instanceof ObjectId) {
    return a.toString() === b.toString();
  }
  return false;
};