
/**
 * Module dependencies.
 */

var Schema = require('../schema')
  , SchemaType = require('../schema').SchemaType;

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
 * Casts contents
 *
 * @param {Object} value
 * @api private
 */

DocumentArray.prototype.cast = function (value) {
  var caster = this.caster;
  if (caster instanceof Schema)
    return value.map(function(v){
      if (!(v instanceof caster.ctor))
        return new (caster.ctor)(v);
      return v;
    });
  throw new CastError('document', value, caster);
};

/**
 * Module exports.
 */

module.exports = DocumentArray;
