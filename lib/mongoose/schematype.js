
/**
 * Module dependencies.
 */

var MongooseError = require('./error');

/**
 * SchemaType constructor
 *
 * @param {String} path
 * @api public
 */

function SchemaType (path, options) {
  this.path = path;
  this.defaultValue = null;
  this.validators = [];
  this.options = options;
  for (var i in options)
    if (this[i] && 'function' == typeof this[i]){
      var opts = Array.isArray(options[i]) ? options[i] : [options[i]];
      this[i].apply(this, opts);
    }
};

/**
 * Base schema. Set by Schema when instantiated.
 *
 * @api private
 */

SchemaType.prototype.base;

/**
 * Sets a default
 *
 * @param {Object} default value
 * @api public
 */

SchemaType.prototype.default = function (val) {
  this.defaultValue = val;
  return this;
};

/**
 * Adds a validator
 *
 * @param {Object} validator
 * @param {String} optional error message
 * @api public
 */

SchemaType.prototype.validate = function(obj, error){
  this.validators.push([obj, error]);
  return this;
};

/**
 * Adds a required validator
 *
 * @param {Boolean} enable/disable the validator
 * @api public
 */

SchemaType.prototype.required = function(required){
  var checkRequired = this.checkRequired.bind(this);

  if (false === required){
    this.validators = this.validators.filter(function(v){
      return v[0] !== checkRequired;
    });
  } else 
    this.validators.push([checkRequired, 'required']);

  return this;
};

/**
 * Gets the default value
 *
 * @param {Function} callback
 * @param {Object} scope
 * @api private
 */

SchemaType.prototype.getDefault = function (fn, scope) {
  if ('function' == typeof this.defaultValue)
    if (1 == this.defaultValue.length)
      this.defaultValue.call(scope, fn);
    else
      fn(null, this.defaultValue.call(scope))
  else
    fn(null, this.defaultValue);
};

/**
 * Performs a validation
 *
 * @param {Function} callback
 * @param {Object} scope
 * @api private
 */

SchemaType.prototype.doValidate = function (value, fn, scope) {
  var err = false
    , path = this.path
    , count = this.validators.length;

  if (!count) return fn(null);

  function validate (val, msg) {
    if (err) return;
    if (val === undefined || val) {
      --count || fn(null);
    } else {
      fn(new ValidatorError(path, msg));
      err = true;
    }
  };

  this.validators.forEach(function(v){
    var validator = v[0]
      , message = v[1];
    if (validator instanceof RegExp)
      validate(validator.test(value), message);
    else if ('function' == typeof validator)
      if (2 == validator.length)
        validator.call(scope, value, function(val){
          validate(val, message);
        })
      else
        validate(validator.call(scope, value), message);
  });
};

/**
 * Validator error
 *
 * @param {String} path
 * @param {String} msg
 * @api private
 */

function ValidatorError (path, msg) {
  MongooseError.call(this, 'Validator "' + msg + '" failed for path ' + path);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidatorError';
  this.path = path;
};

/**
 * Inherits from MongooseError
 */

ValidatorError.prototype.__proto__ = MongooseError.prototype;

/**
 * Cast error
 *
 * @api private
 */

function CastError (type, path, type, value) {
  MongooseError.call(this, 'Cast to ' + type + ' failed for value "' + value + '"');
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'CastError';
  this.path = path;
  this.type = type;
  this.value = value;
};

/**
 * Inherits from MongooseError.
 */

CastError.prototype.__proto__ = MongooseError.prototype;

/**
 * Module exports.
 */

module.exports = exports = SchemaType;

exports.CastError = CastError;

exports.ValidatorError = ValidatorError;
