
/**
 * Module dependencies.
 */

function MongooseNumber () {
  Number.apply(this, arguments);
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

MongooseNumber.prototype.increment = function(){
  
};

/**
 * Atomic decrement
 *
 * @api public
 */

MongooseNumber.prototype.decrement = function(){
  
};

/**
 * Module exports
 */

module.exports = MongooseNumber;
