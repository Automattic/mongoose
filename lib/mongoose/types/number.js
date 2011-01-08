
/**
 * Module dependencies.
 */

/**
 * MongooseNumber constructor.
 *
 * @param {Object} value to pass to Number
 * @param {Key} key in the owner document
 * @param {Document} owner document
 * @api private
 */

function MongooseNumber (value, key, ownerDoc) {
  this.key = key;
  this.doc = ownerDoc;
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
