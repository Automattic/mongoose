'use strict';

/*!
 * ignore
 */

class CoreMongooseArray extends Array {
  get isMongooseArray() {
    return true;
  }

  remove() {}
}

module.exports = CoreMongooseArray;