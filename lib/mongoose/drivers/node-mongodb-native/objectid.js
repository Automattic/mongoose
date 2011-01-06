
/**
 * Module dependencies.
 */

var ObjectId = require('mongodb').ObjectId;

/**
 * Creates an ObjectID for this driver
 *
 * @param {String} hex string
 * @api private
 */

module.exports = function(str){
  return ObjectId.createFromHexString(str);
};
