'use strict';

const StrictModeError = require('../../error/strict');

module.exports = function handleImmutable(schematype, strict, obj, key, fullPath) {
  if (schematype == null || !schematype.options.immutable) {
    return false;
  }
  if (strict === false) {
    return false;
  }
  if (strict === 'throw') {
    throw new StrictModeError(null,
      `Field ${fullPath} is immutable and strict = 'throw'`);
  }
  delete obj[key];
  return true;
};