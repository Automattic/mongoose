/*!
 * Module dependencies.
 */

var MongooseError = require('./error');
var utils = require('./utils');

/**
 * SchemaType constructor
 *
 * @param {String} path
 * @param {Object} [options]
 * @param {String} [instance]
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
  this.selected;

  for (var i in options) if (this[i] && 'function' == typeof this[i]) {
    // { unique: true, index: true }
    if ('index' == i && this._index) continue;

    var opts = Array.isArray(options[i])
      ? options[i]
      : [options[i]];

    this[i].apply(this, opts);
  }
};

/**
 * Sets a default value for this schematype.
 *
 * @param {any} val default value
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
 * Declares an index for this schematype.
 *
 * ####Examples:
 *
 *     Schema.path('my.path').index(true);
 *     Schema.path('my.path').index({ unique: true });
 *
 * [Direction doesn't matter for single key indexes](http://www.mongodb.org/display/DOCS/Indexes#Indexes-CompoundKeysIndexes)
 *
 * @param {Object|Boolean} index
 * @returns {SchemaType} this
 * @api public
 */

SchemaType.prototype.index = function (index) {
  this._index = index;
  return this;
};

/**
 * Declares an unique index.
 *
 * @param {Boolean} bool
 * @returns {SchemaType} this
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
 * Declares a sparse index.
 *
 * @param {Boolean} bool
 * @returns {SchemaType} this
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
 * Adds a setter to this schematype.
 *
 * @param {Function} fn
 * @api public
 */

SchemaType.prototype.set = function (fn) {
  if ('function' != typeof fn)
    throw new Error('A setter must be a function.');
  this.setters.push(fn);
  return this;
};

/**
 * Adds a getter to this schematype.
 *
 * @param {Function} fn
 * @api public
 */

SchemaType.prototype.get = function (fn) {
  if ('function' != typeof fn)
    throw new Error('A getter must be a function.');
  this.getters.push(fn);
  return this;
};

/**
 * Adds validators to this schematype.
 *
 * ####Examples:
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
 * @param {Object} obj validator
 * @param {String} [error] optional error message
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
 * Adds a required validator to this schematype.
 *
 * @param {Boolean} requred enable/disable the validator
 * @returns {SchemaType} this
 * @api public
 */

SchemaType.prototype.required = function (required) {
  var self = this;

  function __checkRequired (v) {
    // in here, `this` refers to the validating document.
    // no validation when this path wasn't selected in the query.
    if ('isSelected' in this &&
        !this.isSelected(self.path) &&
        !this.isModified(self.path)) return true;
    return self.checkRequired(v);
  }

  if (false === required) {
    this.isRequired = false;
    this.validators = this.validators.filter(function (v) {
      return v[0].name !== '__checkRequired';
    });
  } else {
    this.isRequired = true;
    this.validators.push([__checkRequired, 'required']);
  }

  return this;
};

/**
 * Gets the default value
 *
 * @param {Object} scope the scope which callback are executed
 * @param {Boolean} init
 * @api private
 */

SchemaType.prototype.getDefault = function (scope, init) {
  var ret = 'function' === typeof this.defaultValue
    ? this.defaultValue.call(scope)
    : this.defaultValue;

  if (null !== ret && undefined !== ret) {
    return this.cast(ret, scope, init);
  } else {
    return ret;
  }
};

/**
 * Applies setters
 *
 * @param {Object} value
 * @param {Object} scope
 * @param {Boolean} init
 * @api private
 */

SchemaType.prototype.applySetters = function (value, scope, init) {
  if (SchemaType._isRef(this, value, init)) return value;

  var v = value
    , setters = this.setters
    , len = setters.length

  if (!len) {
    if (null === v || undefined === v) return v;
    return init
      ? v // if we just initialized we dont recast
      : this.cast(v, scope, init)
  }

  while (len--) {
    v = setters[len].call(scope, v, this);
  }

  if (null === v || undefined === v) return v;

  // do not cast until all setters are applied #665
  v = this.cast(v, scope);

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

  if (!len) {
    return v;
  }

  while (len--) {
    v = getters[len].call(scope, v, this);
  }

  return v;
};

/**
 * Sets default `select()` behavior for this path.
 *
 * Set to `true` if this path should always be included in the results, `false` if it should be excluded by default. This setting can be overridden at the query level.
 *
 * ####Example:
 *
 *     T = db.model('T', new Schema({ x: { type: String, select: true }}));
 *     T.find(..); // field x will always be selected ..
 *     // .. unless overridden;
 *     T.find().select({ x: 0 }).exec();
 *
 * @param {Boolean} val
 * @api public
 */

SchemaType.prototype.select = function select (val) {
  this.selected = !! val;
}

/**
 * Performs a validation of `value` using the validators declared for this SchemaType.
 *
 * @param {any} value
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
      fn(err = new ValidatorError(path, msg));
    }
  }

  this.validators.forEach(function (v) {
    var validator = v[0]
      , message   = v[1];

    if (validator instanceof RegExp) {
      validate(validator.test(value), message);
    } else if ('function' === typeof validator) {
      if (2 === validator.length) {
        validator.call(scope, value, function (val) {
          validate(val, message);
        });
      } else {
        validate(validator.call(scope, value), message);
      }
    }
  });
};

/**
 * Determines if value is a valid Reference.
 *
 * @param {SchemaType} self
 * @param {Object} value
 * @param {Boolean} init
 * @return {Boolean}
 * @api private
 */

SchemaType._isRef = function (self, value, init) {
  if (init && self.options && self.options.ref) {
    if (null == value) return true;
    if (value._id && value._id.constructor.name === self.instance) return true;
  }

  return false;
}

/**
 * Schema validator error
 *
 * @param {String} path
 * @param {String} msg
 * @inherits MongooseError
 * @api private
 */

function ValidatorError (path, type) {
  var msg = type
    ? '"' + type + '" '
    : '';
  MongooseError.call(this, 'Validator ' + msg + 'failed for path ' + path);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidatorError';
  this.path = path;
  this.type = type;
};

/*!
 * toString helper
 */

ValidatorError.prototype.toString = function () {
  return this.message;
}

/*!
 * Inherits from MongooseError
 */

ValidatorError.prototype.__proto__ = MongooseError.prototype;

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function CastError (type, value) {
  MongooseError.call(this, 'Cast to ' + type + ' failed for value "' + value + '"');
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'CastError';
  this.type = type;
  this.value = value;
};

/*!
 * Inherits from MongooseError.
 */

CastError.prototype.__proto__ = MongooseError.prototype;

/*!
 * Module exports.
 */

module.exports = exports = SchemaType;

exports.CastError = CastError;

exports.ValidatorError = ValidatorError;
