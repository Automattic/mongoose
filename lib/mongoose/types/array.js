
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
  arr.__proto__ = MongooseArray.prototype;
  arr.push.apply(arr, values);
  arr._atomics = [];
  arr._path = path;
  arr._parent = doc;
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
  // make sure to not do casting directly since we need to capture
  // CastError instances for save() error handler.
  return this._parent.doCast(this.path);
};

/**
 * Marks this array as modified
 *
 * @api public
 */

MongooseArray.prototype._markModified = function () {
  this._parent.modifiedPaths[this.path] = true;
  return this;
};

/**
 * Register an atomic operation with the parent
 *
 * @param {Array} operation
 * @api private
 */

MongooseArray.prototype._registerAtomic = function (op) {
  this.atomics.push(op);
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
 * Override methods that affect the array
 *
 * @api public
 */

['push', 'unshift'].forEach(function (method) {
  var oldMethod = Mongoose.prototype[method];

  MongooseArray.prototype[method] = function () {
    var ret = oldMethod.apply(this, arguments);
    this._cast();
    this._markModified();
    return ret;
  });
});

/**
 * Pushes item/s to the array atomically
 *
 * @param {Object} value
 * @api public
 */

MongooseArray.prototype.$push = function (value) {
  if (arguments.length > 1){
    for (var i = 0, l = arguments.length; i < l; i++)
      this.$push(arguments[i]);
  } else {
    this.push(value);
    // make sure we access the casted element
    this._registerAtomic(['$push', this[this.length - 1]]);
  }
  return this;
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
