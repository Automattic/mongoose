
/**
 * Module requirements.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , MongooseNumber = require('../types/number');

/**
 * Number SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @api private
 */

function SchemaNumber (key, options) {
  SchemaType.call(this, key, options);
};

/**
 * Inherits from SchemaType.
 */

SchemaNumber.prototype.__proto__ = SchemaType.prototype;

/**
 * Returns init value
 *
 * @api private
 */

SchemaNumber.prototype.initValue = function () {
  return null;
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
      return v >= value;
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
      return v <= value;
    }, 'max']);
  return this;
};

/**
 * Casts to number
 *
 * @param {Object} value to cast
 * @param {Document} document that triggers the casting
 * @api private
 */

SchemaNumber.prototype.cast = function (value, doc) {
  if (!isNaN(value)){
    if (value instanceof Number || typeof value == 'number' ||
       (value.toString && value.toString() == Number(value)))
      return new MongooseNumber(value, doc);
  }
  throw new CastError('number', value);
};

/**
 * Module exports.
 */

module.exports = SchemaNumber;
