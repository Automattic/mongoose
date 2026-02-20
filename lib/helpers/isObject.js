'use strict';

/**
 * Determines if `arg` is an object.
 *
 * @param {object|Array|string|Function|RegExp|any} arg
 * @api private
 * @return {boolean}
 */

module.exports = function(arg) {
  return (
    Buffer.isBuffer(arg) ||
    Object.prototype.toString.call(arg) === '[object Object]'
  );
};
