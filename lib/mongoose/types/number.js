
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
 * Module exports
 */

module.exports = MongooseNumber;
