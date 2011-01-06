
/**
 * Module dependencies.
 */

var SchemaType = require('./../type').SchemaType
  , casters = {
      'oid' => require('./objectid'),
      'number' => require('./number'),
      'string' => require('./string')
    };

/**
 * Array SchemaType constructor
 *
 * @param {String} key
 * @param {String} cast
 * @api private
 */

function Array(key, cast) {
  SchemaType.call(this, key);
  this.caster = cast;
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @api private
 */

Array.prototype.cast = function (value) {
  var caster = this.caster;
  if (caster in casters)
    return casters[caster].prototype.cast.call(this, value);
  if (caster)
    throw new CastError(caster, value);
  return value;
};

/**
 * Module exports.
 */

module.exports = Array;
