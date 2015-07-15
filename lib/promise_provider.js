/*!
 * Module dependencies.
 */

var Promise = require('./promise');

/**
 * Helper for multiplexing promise implementations
 *
 * @api private
 */

var Promise = {
  _promise: Promise
};

/**
 * Get the current promise constructor
 *
 * @api private
 */
Promise.get = function() {
  return this._promise;
};

/**
 * Set the current promise constructor
 *
 * @api private
 */
Promise.set = function(lib) {
  this._promise = require('./ES6Promise');
  this._promise.use(lib);
};

module.exports = Promise;
