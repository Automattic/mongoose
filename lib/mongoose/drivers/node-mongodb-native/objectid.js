
/**
 * Module dependencies.
 */

var ObjectId = require('mongodb').ObjectId;

/**
 * Constructor export
 *
 * @api private
 */

module.exports = ObjectId;

/**
 * Creates an ObjectID for this driver
 *
 * @param {Object} hex string or ObjectId
 * @api private
 */

exports.fromString = function(obj){
  return ObjectId.createFromHexString(str);
};
