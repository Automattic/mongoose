
/**
 * Module dependencies.
 */

var MongooseArray = require('./array');

/**
 * Array of embedded documents
 *
 * @param text
 */

function MongooseDocumentArray () {
  MongooseArray.apply(this, arguments);
};

/**
 * Inherits from MongooseArray
 *
 */

MongooseDocumentArray.prototype.__proto__ = MongooseArray.prototype;

/**
 * Filters items by id
 *
 * @param {Object} id
 * @api public
 */

MongooseDocumentArray.prototype.id = function(id) {
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

MongooseDocumentArray.prototype.applyDefaults = function(next){
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

MongooseDocumentArray.prototype.validate = function(next) {
  if (!this.length)
    return next();

  var complete = this.length;
};

/**
 * Module exports.
 */

module.exports = MongooseDocumentArray;
