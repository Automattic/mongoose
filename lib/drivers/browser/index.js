/*!
 * Module exports.
 */

'use strict';

exports.Binary = require('./binary');
exports.Collection = function() {
  throw new Error('Cannot create a collection from browser library');
};
exports.Decimal128 = require('./decimal128');
exports.ObjectId = require('./objectid');
exports.ReadPreference = require('./ReadPreference');
