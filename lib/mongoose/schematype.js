
/**
 * Module dependencies.
 */

/**
 * SchemaType constructor
 *
 * @param {String} key name
 * @api public
 */

function SchemaType (key, options) {
  this.key = key;
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
    , count = this.validators.length;

  if (!count) return fn(null);

  function validate (val, msg){
    console.log('validating');
    if (!err && false === val){
      fn(new ValidatorError(msg));
      err = true;
    } else
      --count || fn(null);
  };

  this.validators.forEach(function(v){
    var validator = v[0]
      , message = v[1];
    if (validator instanceof RegExp)
      validate(validator.test(value), message);
    else if ('function' == typeof validator)
      if (2 == validator.length)
        validator.call(scope, value, function(val){
          fn(val, message);
        })
      else
        fn(validator.call(scope, value));
  });
};

/**
 * Module exports.
 */

module.exports = SchemaType;
