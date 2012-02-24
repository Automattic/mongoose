/**
 * Module dependencies.
 */

var MongooseError = require('./error');
var utils = require('./utils');
var errorMessages = require('./errormessages');

/**
 * SchemaType constructor
 *
 * @param {String} path
 * @api public
 */

function SchemaType (path, options, instance) {
  this.path = path;
  this.instance = instance;
  this.validators = [];
  this.setters = [];
  this.getters = [];
  this.options = options;
  this._index = null;

  for (var i in options) if (this[i] && 'function' == typeof this[i]) {
    var opts = Array.isArray(options[i])
      ? options[i]
      : [options[i]];

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
  if (1 === arguments.length) {
    this.defaultValue = typeof val === 'function'
      ? val
      : this.cast(val);
    return this;
  } else if (arguments.length > 1) {
    this.defaultValue = utils.args(arguments);
  }
  return this.defaultValue;
};

/**
 * Sets index. It can be a boolean or a hash of options
 * Example:
 *    Schema.path('my.path').index(true);
 *    Schema.path('my.path').index({ unique: true });
 *
 * "Direction doesn't matter for single key indexes"
 * http://www.mongodb.org/display/DOCS/Indexes#Indexes-CompoundKeysIndexes
 *
 * @param {Object} true/
 * @api public
 */

SchemaType.prototype.index = function (index) {
  this._index = index;
  return this;
};

/**
 * Adds an unique index
 *
 * @param {Boolean}
 * @api private
 */

SchemaType.prototype.unique = function (bool) {
  if (!this._index || 'Object' !== this._index.constructor.name) {
    this._index = {};
  }

  this._index.unique = bool;
  return this;
};

/**
 * Adds an unique index
 *
 * @param {Boolean}
 * @api private
 */

SchemaType.prototype.sparse = function (bool) {
  if (!this._index || 'Object' !== this._index.constructor.name) {
    this._index = {};
  }

  this._index.sparse = bool;
  return this;
};

/**
 * Adds a setter
 *
 * @param {Function} setter
 * @api public
 */

SchemaType.prototype.set = function (fn) {
  if ('function' != typeof fn)
    throw new Error('A setter must be a function.');
  this.setters.push(fn);
  return this;
};

/**
 * Adds a getter
 *
 * @param {Function} getter
 * @api public
 */

SchemaType.prototype.get = function (fn) {
  if ('function' != typeof fn)
    throw new Error('A getter must be a function.');
  this.getters.push(fn);
  return this;
};

/**
 * ##validate
 *
 * Adds validators.
 *
 * Examples:
 *
 *     function validator () { ... }
 *
 *     var single = [validator, 'failed']
 *     new Schema({ name: { type: String, validate: single }});
 *
 *     var many = [
 *         { validator: validator, msg: 'uh oh' }
 *       , { validator: fn, msg: 'failed' }
 *     ]
 *     new Schema({ name: { type: String, validate: many }});
 *
 * @param {Object} validator
 * @param {String} optional error message
 * @api public
 */

SchemaType.prototype.validate = function (obj, error) {
  if ('function' == typeof obj || obj && 'RegExp' === obj.constructor.name) {
    this.validators.push([obj, error]);
    return this;
  }

  var i = arguments.length
    , arg

  while (i--) {
    arg = arguments[i];
    this.validators.push([arg.validator, arg.msg]);
  }

  return this;
};

/**
 * Adds a required validator
 *
 * @param {Boolean} enable/disable the validator
 * @param {String} optional error message
 * @api public
 */

SchemaType.prototype.required = function (required, message) {
  var self = this;

  function __checkRequired (v) {
    return self.checkRequired(v);
  }

  if (false === required) {
    this.isRequired = false;
    this.validators = this.validators.filter(function (v) {
      return v[0].name !== '__checkRequired';
    });
  } else {
    this.isRequired = true;
    message = message || errorMessages['required'];
    this.validators.push([__checkRequired, 'required', message]);
  }

  return this;
};

/**
 * Gets the default value
 *
 * @param {Object} scope for callback defaults
 * @api private
 */

SchemaType.prototype.getDefault = function (scope) {
  var ret = 'function' === typeof this.defaultValue
    ? this.defaultValue.call(scope)
    : this.defaultValue;

  if (null !== ret && undefined !== ret) {
    return this.cast(ret, scope);
  } else {
    return ret;
  }
};

/**
 * Applies setters
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */

SchemaType.prototype.applySetters = function (value, scope, init) {
  if (SchemaType._isRef(this, value, init)) return value;

  var v = value
    , setters = this.setters
    , len = setters.length;

  for (var k = len - 1; k >= 0; k--) {
    v = setters[k].call(scope, v);
    if (null === v || undefined === v) return v;
    v = this.cast(v, scope);
  }

  if (!len) {
    if (null === v || undefined === v) return v;
    if (!init) {
      // if we just initialized we dont recast
      v = this.cast(v, scope, init);
    }
  }

  return v;
};

/**
 * Applies getters to a value
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */

SchemaType.prototype.applyGetters = function (value, scope) {
  if (SchemaType._isRef(this, value, true)) return value;

  var v = value
    , getters = this.getters
    , len = getters.length;

  for (var k = len - 1; k >= 0; k--) {
    v = this.getters[k].call(scope, v);
    if (null === v || undefined === v) return v;
    v = this.cast(v, scope);
  }

  if (!len) {
    if (null === v || undefined === v) return v;
    v = this.cast(v, scope);
  }

  return v;
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

  function validate (val, type, msg) {
    if (err) return;
    if (val === undefined || val) {
      --count || fn(null);
    } else {
      fn(new ValidatorError(path, type, msg));
      err = true;
    }
  }

  this.validators.forEach(function (v) {
    var validator = v[0]
      , type      = v[1]
      , message   = v[2];

    if (validator instanceof RegExp) {
      validate(validator.test(value), type, message);
    } else if ('function' === typeof validator) {
      if (2 === validator.length) {
        validator.call(scope, value, function (val) {
          validate(val, type);
        });
      } else {
        validate(validator.call(scope, value), type, message);
      }
    }
  });
};

/**
 * Determines if value is a valid Reference.
 *
 * @param {SchemaType} self
 * @param {object} value
 * @param {Boolean} init
 * @param {MongooseType} instance
 * @return Boolean
 * @private
 */

SchemaType._isRef = function (self, value, init) {
  if (self.options && self.options.ref && init) {
    if (null == value) return true;
    if (value._id && value._id.constructor.name === self.instance) return true;
  }

  return false;
}

/**
 * Schema validator error
 *
 * @param {String} path
 * @param {String} type
 * param {String} message
 * @api private
 */

function ValidatorError (path, type, message) {
  message = message || errorMessages[type];
  MongooseError.call(this, normalizeMessage(path, message));
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidatorError';
  this.path = path;
  this.type = type;
};

/**
 * String representation of ValidatorError
 *
 * @api public
 */

ValidatorError.prototype.toString = function() {
  return this.message;
}

/**
 * Inherits from MongooseError
 */

ValidatorError.prototype.__proto__ = MongooseError.prototype;

/**
 * Cast error
 *
 * @api private
 */

function CastError (type, value, message, path) {
  MongooseError.call(this, normalizeMessage(path, message));
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'CastError';
  this.type = type;
  this.value = value;
};

/**
 * String representation of CastError
 *
 * @api public
 */
CastError.prototype.toString = function() {
  return this.message;
}

/**
 * Inherits from MongooseError.
 */

CastError.prototype.__proto__ = MongooseError.prototype;

/**
 * Makes path more user-friendly
 * TODO Make this more powerful... it's too simple now...
 */

function normalizeMessage(path, message) {
  var tokens = path.toLowerCase().split('.');

  var normalizedPath = '';   
  for (var i = 0; i < tokens.length; i++) {
    normalizedPath += tokens[i].charAt(0).toUpperCase() + tokens[i].slice(1) + ' ';
  }

  if (~message.indexOf('{path}')) {
    return message.replace('{path}', normalizedPath.trim())
  } else {
    return message.replace(/\{path\|(.*)\}/i, '$1');
  }
}

/**
 * Module exports.
 */

module.exports = exports = SchemaType;

exports.CastError = CastError;

exports.ValidatorError = ValidatorError;
