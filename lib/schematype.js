/*!
 * Module dependencies.
 */

var utils = require('./utils');
var CastError = require('./errors/cast')
var ValidatorError = require('./errors/validator')

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
 * ####Example:
 *
 *     var s = new Schema({ n: { type: Number, default: 10 })
 *     var M = db.model('M', s)
 *     var m = new M;
 *     console.log(m.n) // 10
 *
 * @param {any} val default value
 * @return {SchemaType|defaultValue}
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
 * Declares the index options for this schematype.
 *
 * ####Example:
 *
 *     var s = new Schema({ name: { type: String, index: true })
 *     var s = new Schema({ name: { type: String, index: { unique: true, expires: '1d' }})
 *     Schema.path('my.path').index(true);
 *     Schema.path('my.path').index({ expires: 60 });
 *     Schema.path('my.path').index({ unique: true, sparse: true });
 *
 * ####NOTE:
 *
 * _Indexes are created in the background by default. Specify `background: false` to override._
 *
 * [Direction doesn't matter for single key indexes](http://www.mongodb.org/display/DOCS/Indexes#Indexes-CompoundKeysIndexes)
 *
 * @param {Object|Boolean} options
 * @return {SchemaType} this
 * @api public
 */

SchemaType.prototype.index = function (options) {
  this._index = options;
  utils.expires(this._index);
  return this;
};

/**
 * Declares an unique index.
 *
 * ####Examples:
 *
 *     var s = new Schema({ name: { type: String, unique: true })
 *     Schema.path('name').index({ unique: true });
 *
 * @param {Boolean} bool
 * @return {SchemaType} this
 * @api public
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
 * ####Examples:
 *
 *     var s = new Schema({ name: { type: String, sparse: true })
 *     Schema.path('name').index({ sparse: true });
 *
 * @param {Boolean} bool
 * @return {SchemaType} this
 * @api public
 */

SchemaType.prototype.sparse = function (bool) {
  if (!this._index || 'Object' !== this._index.constructor.name) {
    this._index = {};
  }

  this._index.sparse = bool;
  return this;
};

/**
 * Declares a TTL index (rounded to the nearest second) for _Date_ types only.
 *
 * This sets the `expiresAfterSeconds` index option available in MongoDB >= 2.1.2.
 * This index type is only compatible with Date types.
 *
 * ####Example:
 *
 *     // expire in 24 hours
 *     new Schema({..}, { expires: 60*60*24 });
 *
 * `expires` utilizes the `ms` module from [guille](https://github.com/guille/) allowing us to use a friendlier syntax:
 *
 * ####Example:
 *
 *     // expire in 24 hours
 *     new Schema({..}, { expires: '24h' });
 *
 *     // expire in 1.5 hours
 *     new Schema({..}, { expires: '1.5h' });
 *
 *     // expire in 7 days
 *     var schema = new Schema({..});
 *     schema.expires('7d');
 *
 * @param {Number|String} when
 * @added 3.0.0
 * @return {SchemaType} this
 * @api public
 */

SchemaType.prototype.expires = function (when) {
  if (!this._index || 'Object' !== this._index.constructor.name) {
    this._index = {};
  }

  this._index.expires = when;
  utils.expires(this._index);
  return this;
};

/**
 * Adds a setter to this schematype.
 *
 * ####Example:
 *
 *     function capitalize (val) {
 *       if ('string' != typeof val) val = '';
 *       return val.charAt(0).toUpperCase() + val.substring(1);
 *     }
 *
 *     var s = new Schema({ name: { type: String, set: capitalize })
 *     // or
 *     Schema.path('name').set(capitalize);
 *
 * @param {Function} fn
 * @return {SchemaType} this
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
 * ####Example:
 *
 *     function dob (val) {
 *       if (!val) return val;
 *       return (val.getMonth() + 1) + "/" + val.getDate() + "/" + val.getFullYear();
 *     }
 *
 *     var s = new Schema({ born: { type: Date, get: dob })
 *     // or
 *     Schema.path('name').get(dob);
 *
 * @param {Function} fn
 * @return {SchemaType} this
 * @api public
 */

SchemaType.prototype.get = function (fn) {
  if ('function' != typeof fn)
    throw new Error('A getter must be a function.');
  this.getters.push(fn);
  return this;
};

/**
 * Adds validator(s) for this document path.
 *
 * Validators must return `Boolean`. Returning false is interpreted as validation failure.
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
 *     // or utilizing SchemaType methods directly:
 *
 *     var schema = new Schema({ name: 'string' });
 *     schema.path('name').validate(validator, 'validation failed');
 *
 * ####Asynchronous validation:
 *
 * Passing a validator function that receives two arguments tells mongoose that the validator is an asynchronous validator. The first arg passed is the value to validate, the second is an callback function that must be passed either `true` or `false` when validation is complete. Asynchronous validators open the door for retreiving other documents from the database first to validate against.
 *
 *     schema.path('name').validate(function (value, respond) {
 *       doStuff(value, function () {
 *         ...
 *         respond(false); // validation failed
 *       })
*      }, 'my error type');
 *
 * Validation occurs `pre('save')` or whenever you manually execute [document#validate](#document_Document-validate).
 *
 * If validation fails during `pre('save')` and no callback was passed to receive the error, an `error` event will be emitted on your Models associated db [connection](#connection_Connection), passing the validation error object along.
 *
 *     var conn = mongoose.createConnection(..);
 *     conn.on('error', handleError);
 *
 *     var Product = conn.model('Product', yourSchema);
 *     var dvd = new Product(..);
 *     dvd.save(); // emits error on the `conn` above
 *
 * If you desire handling these errors at the Model level, attach an `error` listener to your Model and the event will instead be emitted there.
 *
 *     // registering an error listener on the Model lets us handle errors more locally
 *     Product.on('error', handleError);
 *
 * @param {RegExp|Function|Object} obj validator
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
    if (!(arg && 'Object' == arg.constructor.name)) {
      var msg = 'Invalid validator. Received (' + typeof arg + ') '
        + arg
        + '. See http://mongoosejs.com/docs/api.html#schematype_SchemaType-validate';

      throw new Error(msg);
    }
    this.validate(arg.validator, arg.msg);
  }

  return this;
};

/**
 * Adds a required validator to this schematype.
 *
 * ####Example:
 *
 *     var s = new Schema({ born: { type: Date, required: true })
 *     // or
 *     Schema.path('name').required(true);
 *
 *
 * @param {Boolean} required enable/disable the validator
 * @return {SchemaType} this
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
 *     T.find().select('-x').exec(callback);
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

/*!
 * Module exports.
 */

module.exports = exports = SchemaType;

exports.CastError = CastError;

exports.ValidatorError = ValidatorError;
