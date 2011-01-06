
/**
 * Module dependencies.
 */

function ModelArray () {
  Array.apply(this, arguments);
};

/**
 * Inherit from Array.
 */

ModelArray.prototype.__proto__ = Array.protoype;

/**
 * Inherit from Array.
 */

ModelArray.prototype.__proto__ = Array.prototype;

/**
 * Stores a queue of atomic operations to perform
 *
 * @api private
 */

ModelArray.prototype.atomics;

/**
 * Parent owner document
 *
 * @api private
 */

ModelArray.prototype.doc;

/**
 * Register an atomic operation with the parent
 *
 * @param {Array} operation
 * @api private
 */

ModelArray.prototype.registerAtomic = function (op) {
  if (this.parent instanceof Subdocument)
    this.parent.error('Atomic operations on arrays within subdocuments are unsupported');
  else
    this.parent.registerAtomic(this.path, op);
};

/**
 * Pushes item/s to the array
 *
 * @param {Object} value
 * @api public
 */

ModelArray.prototype.$push = function (value) {
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

ModelArray.prototype.$pushAll = function(value) {
  this.registerAtomic(['$pushAll', value]);
  this.push.apply(this, value);
  return this;
};

/**
 * Pops the array
 *
 * @api public
 */

ModelArray.prototype.$pop = function(){
  this.registerAtomic(['$pop', '1']);
  return this.pop();
};

/**
 * Shifts the array
 *
 * @api public
 */

ModelArray.prototype.$shift = function(){
  this.registerAtomic(['$shift', '-1']);
  return this.shift();
};

/**
 * Pulls from the array
 *
 * @api public
 */

ModelArray.prototype.$pull = function(match){
  this.registerAtomic(['$pull', match]);
  return this;
};

/**
 * Pulls many items from an array
 *
 * @api public
 */

ModelArray.prototype.$pullAll = function(match){
  this.registerAtomic(['$pullAll', match]);
  return this;
};

/**
 * Commits the changes to the array
 *
 * @param text
 */

ModelArray.prototype.commit = function(){
  this.parent.dirtyPaths[this.path] = true;
  return this;
};

/**
 * Array of embedded documents
 *
 * @param text
 */

function ModelDocumentArray () {
  ModelArray.apply(this, arguments);
};

/**
 * Inherits from ModelArray
 *
 */

ModelDocumentArray.prototype.__proto__ = ModelArray.prototype;

/**
 * Filters items by id
 *
 * @param {Object} id
 * @api public
 */

ModelDocumentArray.prototype.id = function(id) {
  for (var i = 0, l = this.length; i < l; i++)
    if (this[i] instanceof Document && this[i].castValue('_id', id).toHexString() == this[i].doc._id.toHexString())
      return this[i];
};

/**
 * Applies defaults
 *
 * @param {Function} next
 * @api private
 */

ModelDocumentArray.prototype.applyDefaults = function(next){
  if (!this.length)
    return next();

  var complete = this.length;
  for (var i = 0, l = this.length; i < l; i++)
    this[i].applyDefaults(function(){
      --complete || next();
    });
};

/**
 * Performs validations in parallel of the inner documents
 *
 * @param {Function} next
 * @api private
 */

ModelDocumentArray.prototype.validate = function(next) {
  if (!this.length)
    return next();

  var complete = this.length;
};

/**
 * Module exports.
 */

exports.ModelArray = ModelArray;

exports.ModelDocumentArray = ModelDocumentArray;
