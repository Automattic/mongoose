
/*!
 * Access driver.
 */

var driver = global.MONGOOSE_DRIVER_PATH || 'node-mongodb-native';

/**
 * ObjectId type constructor
 *
 * ####Example
 *
 *     var id = new mongoose.Types.ObjectId;
 *
 * @constructor ObjectId
 */

var ObjectId = require('../drivers/' + driver + '/objectid');
module.exports = ObjectId;
