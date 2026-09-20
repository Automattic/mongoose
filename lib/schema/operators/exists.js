'use strict';

const CastError = require('../../error/cast');
const castBoolean = require('../../cast/boolean');

/*!
 * ignore
 */

module.exports = function(val) {
  const path = this?.path ?? null;
  try {
    return castBoolean(val);
  } catch (error) {
    throw new CastError('boolean', val, path, error);
  }
};
