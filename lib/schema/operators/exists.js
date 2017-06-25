'use strict';

/*!
 * ignore
 */

module.exports = function(val) {
  if (typeof val !== 'boolean') {
    throw new Error('$exists parameter must be a boolean!');
  }

  return val;
};
