/*!
 * Module dependencies.
 */

var MPromise = require('./promise');

/**
 * Helper for multiplexing promise implementations
 *
 * @api private
 */

var Promise = {
  _promise: MPromise
};

/**
 * Get the current promise constructor
 *
 * @api private
 */
Promise.get = function() {
  return Promise._promise;
};

/**
 * Get the current promise constructor in ES6 style
 *
 * @api private
 */
Promise.getES6 = function() {
  if (Promise._promise === MPromise) {
    return MPromise.ES6;
  }
  return Promise._promise;
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
