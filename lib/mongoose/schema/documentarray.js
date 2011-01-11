
/**
 * Module dependencies.
 */

var Schema = require('../schema')
  , SchemaType = require('../schematype')
  , ArrayType = require('./array');

/**
 * SubdocsArray SchemaType constructor
 *
 * @param {String} key
 * @param {String} cast
 * @api private
 */

function DocumentArray (key, cast) {
  ArrayType.call(this, key);
  this.caster = cast;
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
