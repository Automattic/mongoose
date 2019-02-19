'use strict';

/*!
 * ignore
 */

let driver = null;

module.exports.get = function() {
  return driver;
};

module.exports.set = function(v) {
  if (typeof v === 'string') {
    v = require(v);
  }
  driver = v;
};
