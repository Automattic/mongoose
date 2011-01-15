
/**
 * Module dependencies.
 */

var EmbeddedDocument = require('./document');

/**
 * Mongoose Array constructor.
 *
 * @param {Array} values
 * @param {Document} parent document
 * @api private
 * @see http://bit.ly/f6CnZU
 */

function MongooseArray (values, doc) {
  var arr = [];
  arr.__proto__ = MongooseArray.prototype;
  arr.push.apply(arr, values);
  arr.atomics = [];
  arr.parent = doc;
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

MongooseArray.prototype.atomics;

/**
 * Parent owner document
 *
 * @api private
 */

MongooseArray.prototype.doc;

/**
 * Register an atomic operation with the parent
 *
 * @param {Array} operation
 * @api private
 */

MongooseArray.prototype.registerAtomic = function (op) {
  this.atomics.push(op);
};

/**
 * Pushes item/s to the array
 *
 * @param {Object} value
 * @api public
 */

MongooseArray.prototype.$push = function (value) {
  if (arguments.length > 1){
    for (var i = 0, l = arguments.length; i < l; i++)
      this.$push(arguments[i]);
  } else {
    this.registerAtomic(['$push', value]);
    this.push(value);
  }
  return this;
};

/**
 * Pushes several items at once to the array
 *
 * @param {Array} values
 * @api public
 */

MongooseArray.prototype.$pushAll = function(value) {
  this.registerAtomic(['$pushAll', value]);
  this.push.apply(this, value);
  return this;
};

/**
 * Pops the array
 *
 * @api public
 */

MongooseArray.prototype.$pop = function(){
  this.registerAtomic(['$pop', '1']);
  return this.pop();
};

/**
 * Shifts the array
 *
 * @api public
 */

MongooseArray.prototype.$shift = function(){
  this.registerAtomic(['$shift', '-1']);
  return this.shift();
};

/**
 * Pulls from the array
 *
 * @api public
 */

MongooseArray.prototype.$pull = function(match){
  this.registerAtomic(['$pull', match]);
  return this;
};

/**
 * Pulls many items from an array
 *
 * @api public
 */

MongooseArray.prototype.$pullAll = function(match){
  this.registerAtomic(['$pullAll', match]);
  return this;
};

/**
 * Commits the changes to the array
 *
 * @param text
 */

MongooseArray.prototype.commit = function(){
  this.parent.dirtyPaths[this.path] = true;
  return this;
};

/**
 * Module exports.
 */

module.exports = MongooseArray;
