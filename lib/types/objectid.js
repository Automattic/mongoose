
/*!
 * Access driver.
 */

var driver = global.MONGOOSE_DRIVER_PATH || '../drivers/node-mongodb-native';

/**
 * ObjectId type constructor
 *
 * ####Example
 *
 *     var id = new mongoose.Types.ObjectId;
 *
 * @constructor ObjectId
 */

var ObjectId = require(driver + '/objectid');
module.exports = ObjectId;

/**
 * Creates an ObjectId from `str`
 *
 * @param {ObjectId|HexString} str
 * @static fromString
 * @receiver ObjectId
 * @return {ObjectId}
 * @api private
 */

ObjectId.fromString;

/**
 * Converts `oid` to a string.
 *
 * @param {ObjectId} oid ObjectId instance
 * @static toString
 * @receiver ObjectId
 * @return {String}
 * @api private
 */

ObjectId.toString;
