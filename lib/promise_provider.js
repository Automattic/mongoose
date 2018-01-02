/*!
 * ignore
 */

const assert = require('assert');
const mquery = require('mquery');

/**
 * Helper for multiplexing promise implementations
 *
 * @api private
 */

var store = {
  _promise: null
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
  assert.ok(typeof lib === 'function',
    `mongoose.Promise must be a function, got ${lib}`);
  store._promise = lib;
  mquery.Promise = lib;
};

/*!
 * Use native promises by default
 */

store.set(global.Promise);

module.exports = store;
