
/**
 * Module dependencies.
 */

var EmbeddedDocument = require('./document');

/**
 * Mongoose Array constructor.
 * Values always have to be passed to the constructor to initialize, since
 * otherwise MongooseArray#push will mark the array as modified to the parent.
 *
 * @param {Array} values
 * @param {String} key path
 * @param {Document} parent document
 * @api private
 * @see http://bit.ly/f6CnZU
 */

function MongooseArray (values, path, doc) {
  var arr = [];
  arr.push.apply(arr, values);
  arr.__proto__ = MongooseArray.prototype;
  arr._atomics = [];
  arr.validators = [];
  arr._path = path;
  arr._parent = doc;
  if (doc)
    arr._schema = doc.schema.path(path);
  return arr;
};

/**
 * Inherit from Array.
 */

MongooseArray.prototype = new Array();

/**
 * Stores a queue of atomic operations to perform
 *
 * @api private
 */

MongooseArray.prototype._atomics;

/**
 * Parent owner document
 *
 * @api private
 */

MongooseArray.prototype._parent;

/**
 * Casts a member
 *
 * @api private
 */

MongooseArray.prototype._cast = function (value) {
  var cast = this._schema.caster.prototype.cast
    , doc = this._parent;

  doc.try(function(){
    cast.call(null, value, doc);
  });
};

/**
 * Marks this array as modified
 *
 * @api public
 */

MongooseArray.prototype._markModified = function () {
  this._parent.modifiedPaths[this._path] = true;
  return this;
};

/**
 * Register an atomic operation with the parent
 *
 * @param {Array} operation
 * @api private
 */

MongooseArray.prototype._registerAtomic = function (op) {
  this._atomics.push(op);
  this._markModified();
  return this;
};

/**
 * Returns true if we have to perform atomics for this, and no normal
 * operations
 *
 * @api public
 */

MongooseArray.prototype.__defineGetter__('_doAtomics', function () {
  return this._atomics.length;
});

/**
 * Override native push
 *
 * @api public
 */

var oldPush = MongooseArray.prototype.push;

MongooseArray.prototype.push = function (obj, options) {
  var obj = this._cast(obj)
    , ret = oldPush.call(this, obj);

  if (!options || false !== options.atomic)
    this._registerAtomic(['$push', obj]);
  else
    this._markModified();

  return ret;
};

/**
 * Pushes item/s to the array atomically
 *
 * @param {Object} value
 * @api public
 */

MongooseArray.prototype.$push = function (value) {
  return this.push(value);
};

/**
 * Pushes several items at once to the array atomically
 *
 * @param {Array} values
 * @api public
 */

MongooseArray.prototype.$pushAll = function (value) {
  var length = this.length;
  this.push.apply(this, value);
  // make sure we access the casted elements
  this._registerAtomic(['$pushAll', this.slice(length) ]);
  return this;
};

/**
 * Pops the array atomically
 *
 * @api public
 */

MongooseArray.prototype.$pop = function () {
  this._registerAtomic(['$pop', '1']);
  return this.pop();
};

/**
 * Shifts the array
 *
 * @api public
 */

MongooseArray.prototype.$shift = function () {
  this._registerAtomic(['$shift', '-1']);
  return this.shift();
};

/**
 * Pulls from the array
 *
 * @api public
 */

MongooseArray.prototype.$pull = function (match) {
  this._registerAtomic(['$pull', match]);
  return this;
};

/**
 * Pulls many items from an array
 *
 * @api public
 */

MongooseArray.prototype.$pullAll = function (match) {
  this._registerAtomic(['$pullAll', match]);
  return this;
};

/**
 * Module exports.
 */

module.exports = MongooseArray;
