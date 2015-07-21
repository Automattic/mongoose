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
 * Set the current promise constructor
 *
 * @api private
 */

Promise.set = function(lib) {
  if (lib === MPromise) {
    return Promise.reset();
  }
  Promise._promise = require('./ES6Promise');
  Promise._promise.use(lib);
  require('mquery').Promise = Promise._promise.ES6;
};

/**
 * Resets to using mpromise
 *
 * @api private
 */

Promise.reset = function() {
  Promise._promise = MPromise;
};

module.exports = Promise;
