var Document = require('../document');
var PromiseProvider = require('../promise_provider');

module.exports = Subdocument;

/**
 * Subdocument constructor.
 *
 * @inherits Document
 * @api private
 */

function Subdocument() {
  Document.apply(this, arguments);
  this.$isSingleNested = true;
}

Subdocument.prototype = Object.create(Document.prototype);

/**
 * Used as a stub for [hooks.js](https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3)
 *
 * ####NOTE:
 *
 * _This is a no-op. Does not actually save the doc to the db._
 *
 * @param {Function} [fn]
 * @return {Promise} resolved Promise
 * @api private
 */

Subdocument.prototype.save = function(fn) {
  var Promise = PromiseProvider.get();
  return new Promise.ES6(function(resolve) {
    fn && fn();
    resolve();
  });
};

Subdocument.prototype.$isValid = function(path) {
  if (this.$parent) {
    return this.$parent.$isValid([this.$basePath, path].join('.'));
  }
};

Subdocument.prototype.markModified = function(path) {
  if (this.$parent) {
    this.$parent.markModified([this.$basePath, path].join('.'));
  }
};

Subdocument.prototype.$markValid = function(path) {
  if (this.$parent) {
    this.$parent.$markValid([this.$basePath, path].join('.'));
  }
};

Subdocument.prototype.invalidate = function(path, err, val) {
  if (this.$parent) {
    this.$parent.invalidate([this.$basePath, path].join('.'), err, val);
  }
};
