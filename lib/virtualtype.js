/**
 * VirtualType constructor
 *
 * This is what mongoose uses to define virtual attributes via
 * `Schema.prototype.virtual`
 *
 * @api public
 */

function VirtualType (options) {
  this.getters = [];
  this.setters = [];
  this.options = options || {};
}

/**
 * Adds a getter
 * 
 * @param {Function} fn
 * @return {VirtualType} this
 * @api public
 */

VirtualType.prototype.get = function (fn) {
  this.getters.push(fn);
  return this;
};

/**
 * Adds a setter
 * 
 * @param {Function} fn
 * @return {VirtualType} this
 * @api public
 */

VirtualType.prototype.set = function (fn) {
  this.setters.push(fn);
  return this;
};

/**
 * Applies getters
 *
 * @param {Object} value
 * @param {Object} scope
 * @api public
 */

VirtualType.prototype.applyGetters = function (value, scope) {
  var v = value;
  for (var l = this.getters.length - 1; l >= 0; l--){
    v = this.getters[l].call(scope, v);
  }
  return v;
};

/**
 * Applies setters
 *
 * @param {Object} value
 * @param {Object} scope
 * @api public
 */

VirtualType.prototype.applySetters = function (value, scope) {
  var v = value;
  for (var l = this.setters.length - 1; l >= 0; l--){
    this.setters[l].call(scope, v);
  }
  return v;
};

module.exports = VirtualType;
