
/**
 * Module dependencies.
 */

var ModelArray = require('./array');

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

module.exports = ModelDocumentArray;
