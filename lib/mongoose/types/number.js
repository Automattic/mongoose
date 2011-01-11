
/**
 * Module dependencies.
 */

/**
 * MongooseNumber constructor.
 *
 * @param {Object} value to pass to Number
 * @api private
 */

function MongooseNumber (value) {
  this.atomics = [];
  this.v = value;
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
  this.v += value;
  this.atomics = [['$inc', value || 1]];
  return this;
};

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
