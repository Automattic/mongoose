
/**
 * Module dependencies.
 */

function ModelNumber () {
  Number.apply(this, arguments);
};

/**
 * Inherits from Number.
 */

ModelNumber.prototype.__proto__ = Number.prototype;

/**
 * Atomic increment
 *
 * @api public
 */

ModelNumber.prototype.increment = function(){
  
};

/**
 * Atomic decrement
 *
 * @api public
 */

ModelNumber.prototype.decrement = function(){
  
};

/**
 * Module exports
 */

module.exports = ModelNumber;
