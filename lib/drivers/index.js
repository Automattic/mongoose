/*!
 * ignore
 */

var driver;

if (typeof window === 'undefined') {
  driver = require('./node-mongodb-native');
  if (global.MONGOOSE_DRIVER_PATH) {
    driver = require(global.MONGOOSE_DRIVER_PATH);
  }
} else {
  driver = require('./browser');
}

/*!
 * ignore
 */

module.exports = driver;
