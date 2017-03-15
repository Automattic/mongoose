'use strict';

/*!
 * ignore
 */

module.exports = function(val) {
  if (typeof val !== 'number' && typeof val !== 'string') {
    throw new Error('$type parameter must be number or string');
  }

  return val;
};
