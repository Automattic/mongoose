'use strict';

const utils = require('./utils');

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
 * @param {Object|Function} [options.match=null] add an extra match condition to `populate()`
 * @param {Number} [options.limit=null] add a default `limit` to the `populate()` query
 * @param {Number} [options.skip=null] add a default `skip` to the `populate()` query
 * @param {Number} [options.perDocumentLimit=null] For legacy reasons, `limit` with `populate()` may give incorrect results because it only executes a single query for every document being populated. If you set `perDocumentLimit`, Mongoose will ensure correct `limit` per document by executing a separate query for each document to `populate()`. For example, `.find().populate({ path: 'test', perDocumentLimit: 2 })` will execute 2 additional queries if `.find()` returns 2 documents.
 * @param {Object} [options.options=null] Additional options like `limit` and `lean`.
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
  const clone = new VirtualType(this.options, this.path);
  clone.getters = [].concat(this.getters);
  clone.setters = [].concat(this.setters);
  return clone;
};

/**
 * Adds a custom getter to this virtual.
 *
 * Mongoose calls the getter function with the below 3 parameters.
 *
 * - `value`: the value returned by the previous getter. If there is only one getter, `value` will be `undefined`.
 * - `virtual`: the virtual object you called `.get()` on
 * - `doc`: the document this virtual is attached to. Equivalent to `this`.
 *
 * ####Example:
 *
 *     const virtual = schema.virtual('fullname');
 *     virtual.get(function(value, virtual, doc) {
 *       return this.name.first + ' ' + this.name.last;
 *     });
 *
 * @param {Function(Any, VirtualType, Document)} fn
 * @return {VirtualType} this
 * @api public
 */

VirtualType.prototype.get = function(fn) {
  this.getters.push(fn);
  return this;
};

/**
 * Adds a custom setter to this virtual.
 *
 * Mongoose calls the setter function with the below 3 parameters.
 *
 * - `value`: the value being set
 * - `virtual`: the virtual object you're calling `.set()` on
 * - `doc`: the document this virtual is attached to. Equivalent to `this`.
 *
 * ####Example:
 *
 *     const virtual = schema.virtual('fullname');
 *     virtual.set(function(value, virtual, doc) {
 *       const parts = value.split(' ');
 *       this.name.first = parts[0];
 *       this.name.last = parts[1];
 *     });
 *
 *     const Model = mongoose.model('Test', schema);
 *     const doc = new Model();
 *     // Calls the setter with `value = 'Jean-Luc Picard'`
 *     doc.fullname = 'Jean-Luc Picard';
 *     doc.name.first; // 'Jean-Luc'
 *     doc.name.last; // 'Picard'
 *
 * @param {Function(Any, VirtualType, Document)} fn
 * @return {VirtualType} this
 * @api public
 */

VirtualType.prototype.set = function(fn) {
  this.setters.push(fn);
  return this;
};

/**
 * Applies getters to `value`.
 *
 * @param {Object} value
 * @param {Document} doc The document this virtual is attached to
 * @return {any} the value after applying all getters
 * @api public
 */

VirtualType.prototype.applyGetters = function(value, doc) {
  if (utils.hasUserDefinedProperty(this.options, ['ref', 'refPath']) &&
      doc.$$populatedVirtuals &&
      doc.$$populatedVirtuals.hasOwnProperty(this.path)) {
    value = doc.$$populatedVirtuals[this.path];
  }

  let v = value;
  for (let l = this.getters.length - 1; l >= 0; l--) {
    v = this.getters[l].call(doc, v, this, doc);
  }
  return v;
};

/**
 * Applies setters to `value`.
 *
 * @param {Object} value
 * @param {Document} doc
 * @return {any} the value after applying all setters
 * @api public
 */

VirtualType.prototype.applySetters = function(value, doc) {
  let v = value;
  for (let l = this.setters.length - 1; l >= 0; l--) {
    v = this.setters[l].call(doc, v, this, doc);
  }
  return v;
};

/*!
 * exports
 */

module.exports = VirtualType;
