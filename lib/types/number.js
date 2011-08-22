
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
  var number = new Number(value);
  number.__proto__ = MongooseNumber.prototype;
  number._atomics = {};
  number._path = path;
  number._parent = doc;
  return number;
};

/**
 * Inherits from Number.
 */

MongooseNumber.prototype = new Number();

/**
 * Atomic increment
 *
 * @api public
 */

MongooseNumber.prototype.$inc =
MongooseNumber.prototype.increment = function increment (value) {
  var schema = this._parent.schema.path(this._path)
    , value = Number(value) || 1;
  if (isNaN(value)) value = 1;
  this._parent.setValue(this._path, schema.cast(this + value));
  this._parent.getValue(this._path)._atomics['$inc'] = value || 1;
  this._parent._activePaths.modify(this._path);
  return this;
};

/**
 * Returns true if we have to perform atomics for this, and no normal
 * operations
 *
 * @api public
 */

MongooseNumber.prototype.__defineGetter__('doAtomics', function () {
  return Object.keys(this._atomics).length;
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
 * Re-declare toString (for `console.log`)
 *
 * @api public
 */

MongooseNumber.prototype.inspect =
MongooseNumber.prototype.toString = function () {
  return String(this.valueOf());
};


/**
 * Module exports
 */

module.exports = MongooseNumber;
