/**
 * Helper for multiplexing promise implementations
 *
 * @api private
 */

var store = {
  _promise: global.Promise
};

/**
 * Get the current promise constructor
 *
 * @api private
 */

store.get = function() {
  return store._promise;
};

/**
 * Set the current promise constructor
 *
 * @api private
 */

store.set = function(lib) {
  store._promise = lib;
  require('mquery').Promise = lib;
};

module.exports = store;
