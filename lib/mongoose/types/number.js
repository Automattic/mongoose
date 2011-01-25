
/**
 * Module dependencies.
 */

/**
 * MongooseNumber constructor.
 *
 * @param {Object} value to pass to Number
 * @param {Document} parent document
 * @api private
 */

function MongooseNumber (value, path, doc) {
  this._atomics = [];
  this.v = value;
  this._path = path;
  this._parent = doc;
  Number.call(this, value);
};

/**
 * Inherits from Number.
 */

MongooseNumber.prototype.__proto__ = Number.prototype;

/**
 * Atomic increment
 *
 * @api public
 */

MongooseNumber.prototype.increment = function(value){
  value = Number(value);
  this.v += (value || 1);
  this._atomics = [['$inc', value || 1]];
  this._parent.activePaths.modify(this._path);
  return this;
};

/**
 * Returns true if we have to perform atomics for this, and no normal
 * operations
 *
 * @api public
 */

MongooseNumber.prototype.__defineGetter__('doAtomics', function () {
  return this._atomics.length;
});

/**
 * Atomic decrement
 *
 * @api public
 */

MongooseNumber.prototype.decrement = function(){
  this.increment(-1);
};

/**
 * Implement valueOf
 *
 * @api public
 */

MongooseNumber.prototype.valueOf = function () {
  return this.v;
};

/**
 * Implement toString
 *
 * @api public
 */

MongooseNumber.prototype.toString = function () {
  return String(this.valueOf());
};

/**
 * Module exports
 */

module.exports = MongooseNumber;
