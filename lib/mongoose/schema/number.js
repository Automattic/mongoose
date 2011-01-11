
/**
 * Module requirements.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , MongososeNumber = require('../types/number');

/**
 * Number SchemaType constructor.
 *
 * @param {String} key
 * @api private
 */

function SchemaNumber (key) {
  SchemaType.call(this, key);
};

/**
 * Required validator for number
 *
 * @api private
 */

SchemaNumber.prototype.checkRequired = function (value) {
  return typeof value == 'number' || value instanceof Number;
};

/**
 * Sets a maximum number validator
 *
 * @param {Number} minimum number
 * @api public
 */

SchemaNumber.prototype.min = function (value, message) {
  if (this.minValidator)
    this.validators = this.validators.filter(function(v){
      return v[1] != 'min';
    });
  if (value != null)
    this.validators.push([function(v){
      return v <= value;
    }, 'min']);
  return this;
};

/**
 * Sets a maximum number validator
 *
 * @param {Number} maximum number
 * @api public
 */

SchemaNumber.prototype.max = function (value, message) {
  if (this.maxValidator)
    this.validators = this.validators.filter(function(v){
      return v[1] != 'max';
    });
  if (value != null)
    this.validators.push([this.maxValidator = function(v){
      return v >= value;
    }, 'max']);
  return this;
};

/**
 * Casts to number
 *
 * @param {Object} value to cast
 * @api private
 */

SchemaNumber.prototype.cast = function (value) {
  if (!isNaN(value)){
    if (value instanceof Number || typeof value == 'number' ||
       (value.toString && value.toString() == Number(value)))
      return new MongooseNumber(value);
  }
  throw new CastError('number', value);
};

/**
 * Module exports.
 */

module.exports = SchemaNumber;
