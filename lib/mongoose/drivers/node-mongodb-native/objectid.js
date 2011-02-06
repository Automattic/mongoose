
/**
 * Module dependencies.
 */

var ObjectId = require('../../../../support/node-mongodb-native/lib/mongodb/').BSONPure.ObjectID;

/**
 * Constructor export
 *
 * @api private
 */

module.exports = exports = ObjectId;
/**
 * Creates an ObjectID for this driver
 *
 * @param {Object} hex string or ObjectId
 * @api private
 */

exports.fromString = function(str){
  return ObjectId.createFromHexString(str);
};

/**
 * Gets an ObjectId and converts it to string.
 *
 * @param {ObjectId} -native objectid
 * @api private
 */

exports.toString = function(oid){
  return oid.toHexString();
};
