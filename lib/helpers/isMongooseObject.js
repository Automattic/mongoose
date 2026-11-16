'use strict';

const getInheritedProperty = require('./getInheritedProperty');
const isMongooseArray = require('../types/array/isMongooseArray').isMongooseArray;
const isMongooseDocument = require('./isMongooseDocument');
/**
 * Returns if `v` is a mongoose object that has a `toObject()` method we can use.
 *
 * This is for compatibility with libs like Date.js which do foolish things to Natives.
 *
 * @param {any} v
 * @api private
 */

module.exports = function(v) {
  return (
    v != null && (
      isMongooseArray(v) || // Array or Document Array
      isMongooseDocument(v) || // Document
      (Buffer.isBuffer(v) && v.isMongooseBuffer) || // Buffer
      getInheritedProperty(v, '$isMongooseMap') // Map
    )
  );
};
