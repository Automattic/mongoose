'use strict';

/*!
 * Returns if `v` is a mongoose object that has a `toObject()` method we can use.
 *
 * This is for compatibility with libs like Date.js which do foolish things to Natives.
 *
 * @param {any} v
 * @api private
 */

module.exports = function(v) {
  if (v == null) {
    return false;
  }

  return v.$__ != null || // Document
    v.isMongooseArray || // Array or Document Array
    v.isMongooseBuffer || // Buffer
    v.$isMongooseMap; // Map
};