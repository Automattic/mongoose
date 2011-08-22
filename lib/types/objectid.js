
/**
 * Access driver.
 */

var driver = global.MONGOOSE_DRIVER_PATH || '../drivers/node-mongodb-native';

/**
 * Module exports.
 */

module.exports = require(driver + '/objectid');
