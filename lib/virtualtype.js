'use strict';

/**
 * VirtualType constructor
 *
 * This is what mongoose uses to define virtual attributes via `Schema.prototype.virtual`.
 *
 * ####Example:
 *
 *     const fullname = schema.virtual('fullname');
 *     fullname instanceof mongoose.VirtualType // true
 *
 * @param {Object} options
 * @param {string|function} [options.ref] if `ref` is not nullish, this becomes a [populated virtual](/docs/populate.html#populate-virtuals)
 * @param {string|function} [options.localField] the local field to populate on if this is a populated virtual.
 * @param {string|function} [options.foreignField] the foreign field to populate on if this is a populated virtual.
 * @param {boolean} [options.justOne=false] by default, a populated virtual is an array. If you set `justOne`, the populated virtual will be a single doc or `null`.
 * @param {boolean} [options.getters=false] if you set this to `true`, Mongoose will call any custom getters you defined on this virtual
 * @param {boolean} [options.count=false] if you set this to `true`, `populate()` will set this virtual to the number of populated documents, as opposed to the documents themselves, using [`Query#countDocuments()`](./api.html#query_Query-countDocuments)
 * @api public
 */

function VirtualType(options, name) {
  this.path = name;
  this.getters = [];
  this.setters = [];
  this.options = Object.assign({}, options);
}

/**
 * If no getters/getters, add a default
 *
 * @param {Function} fn
 * @return {VirtualType} this
 * @api private
 */

VirtualType.prototype._applyDefaultGetters = function() {
  if (this.getters.length > 0 || this.setters.length > 0) {
    return;
  }

  const path = this.path;
  const internalProperty = '$' + path;
  this.getters.push(function() {
    return this[internalProperty];
  });
  this.setters.push(function(v) {
    this[internalProperty] = v;
  });
};

/*!
 * ignore
 */

VirtualType.prototype.clone = function() {
  const clone = new VirtualType(this.name, this.options);
  clone.getters = [].concat(this.getters);
  clone.setters = [].concat(this.setters);
  return clone;
};

/**
 * Defines a getter.
 *
 * ####Example:
 *
 *     var virtual = schema.virtual('fullname');
 *     virtual.get(function () {
 *       return this.name.first + ' ' + this.name.last;
 *     });
 *
 * @param {Function} fn
 * @return {VirtualType} this
 * @api public
 */

VirtualType.prototype.get = function(fn) {
  this.getters.push(fn);
  return this;
};

/**
 * Defines a setter.
 *
 * ####Example:
 *
 *     var virtual = schema.virtual('fullname');
 *     virtual.set(function (v) {
 *       var parts = v.split(' ');
 *       this.name.first = parts[0];
 *       this.name.last = parts[1];
 *     });
 *
 * @param {Function} fn
 * @return {VirtualType} this
 * @api public
 */

VirtualType.prototype.set = function(fn) {
  this.setters.push(fn);
  return this;
};

/**
 * Applies getters to `value` using optional `scope`.
 *
 * @param {Object} value
 * @param {Object} scope
 * @return {any} the value after applying all getters
 * @api public
 */

VirtualType.prototype.applyGetters = function(value, scope) {
  let v = value;
  for (let l = this.getters.length - 1; l >= 0; l--) {
    v = this.getters[l].call(scope, v, this);
  }
  return v;
};

/**
 * Applies setters to `value` using optional `scope`.
 *
 * @param {Object} value
 * @param {Object} scope
 * @return {any} the value after applying all setters
 * @api public
 */

VirtualType.prototype.applySetters = function(value, scope) {
  let v = value;
  for (let l = this.setters.length - 1; l >= 0; l--) {
    v = this.setters[l].call(scope, v, this);
  }
  return v;
};

/*!
 * exports
 */

module.exports = VirtualType;
