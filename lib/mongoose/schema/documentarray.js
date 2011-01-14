
/**
 * Module dependencies.
 */

var Schema = require('../schema')
  , SchemaType = require('../schematype')
  , ArrayType = require('./array')
  , MongooseDocumentArray = require('../types/').DocumentArray;

/**
 * SubdocsArray SchemaType constructor
 *
 * @param {String} key
 * @param {String} cast
 * @param {Object} options
 * @api private
 */

function DocumentArray (key, cast, options) {
  ArrayType.call(this, key, cast, options);
};

/**
 * Inherits from ArrayType.
 */

DocumentArray.prototype.__proto__ = ArrayType.prototype;

/**
 * Returns the init value.
 *
 * @api private
 */

DocumentArray.prototype.initValue = function () {
  return new MongooseDocumentArray();
};

/**
 * Performs local validations first, then validations on each embedded doc
 *
 * @api private
 */

DocumentArray.prototype.doValidate = function (array, fn, scope) {
  var self = this;
  ArrayType.prototype.doValidate.call(array, function(err){
    if (err) return fn(err);
    
    var count = array.length
      , error = false;

    if (!count) return fn();

    array.forEach(function(doc, index){
      doc.validate(function(err){
        if (err && !error){
          // rewrite they key
          err.key = self.key + '.' + index + '.' + err.key;
          fn(err);
          error = true;
        } else {
          --count || fn();
        }
      });
    });
  }, scope);
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @api private
 */

DocumentArray.prototype.cast = function (value) {
  if (Array.isArray(value)){
    var caster = this.caster;
    if (caster instanceof Schema)
      return value.map(function(v){
        if (!(v instanceof caster.ctor))
          return new (caster.ctor)(v);
        return v;
      });
  }
  throw new CastError('document', value, caster);
};

/**
 * Module exports.
 */

module.exports = DocumentArray;
