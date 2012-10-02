
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , errorMessages = require('../errors/messages');

/**
 * String SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function SchemaString (key, options) {
  this.enumValues = [];
  this.regExp = null;
  SchemaType.call(this, key, options, 'String');
};

/*!
 * Inherits from SchemaType.
 */

SchemaString.prototype.__proto__ = SchemaType.prototype;

/**
 * Adds enumeration values and a coinciding validator.
 *
 * ####Example:
 *
 *     var states = 'opening open closing closed'.split(' ')
 *     var s = new Schema({ state: { type: String, enum: states })
 *     var M = db.model('M', s)
 *     var m = new M({ state: 'invalid' })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.state = 'open'
 *       m.save() // success
 *     })
 *
 * @param {String} [args...] enumeration values
 * @api public
 */

SchemaString.prototype.enum = function () {
  var len = arguments.length;
  if (!len || undefined === arguments[0] || false === arguments[0]) {
    if (this.enumValidator){
      this.enumValidator = false;
      this.validators = this.validators.filter(function(v){
        return v[1] != 'enum';
      });
    }
    return;
  }

  var message = null;
  // we have custom error message passed
  if (arguments[0] instanceof Array) {
    len = arguments[0].length;
    message = arguments[1];
    arguments = arguments[0];
  }

  for (var i = 0; i < len; i++) {
    if (undefined !== arguments[i]) {
      this.enumValues.push(this.cast(arguments[i]));
    }
  }

  if (!this.enumValidator) {
    var values = this.enumValues;
    this.enumValidator = function(v){
      return undefined === v || ~values.indexOf(v);
    };
    message = message || errorMessages['string']['enum'];
    this.validators.push([this.enumValidator, 'enum', message]);
  }
};

/**
 * Adds a lowercase setter.
 *
 * ####Example:
 *
 *     var s = new Schema({ email: { type: String, lowercase: true }})
 *     var M = db.model('M', s);
 *     var m = new M({ email: 'SomeEmail@example.COM' });
 *     console.log(m.email) // someemail@example.com
 *
 * @api public
 */

SchemaString.prototype.lowercase = function () {
  return this.set(function (v, self) {
    if ('string' != typeof v) v = self.cast(v)
    if (v) return v.toLowerCase();
    return v;
  });
};

/**
 * Adds an uppercase setter.
 *
 * ####Example:
 *
 *     var s = new Schema({ caps: { type: String, uppercase: true }})
 *     var M = db.model('M', s);
 *     var m = new M({ caps: 'an example' });
 *     console.log(m.caps) // AN EXAMPLE
 *
 * @api public
 */

SchemaString.prototype.uppercase = function () {
  return this.set(function (v, self) {
    if ('string' != typeof v) v = self.cast(v)
    if (v) return v.toUpperCase();
    return v;
  });
};

/**
 * Adds a trim setter.
 *
 * The string value will be trimmed when set.
 *
 * ####Example:
 *
 *     var s = new Schema({ name: { type: String, trim: true }})
 *     var M = db.model('M', s)
 *     var string = ' some name '
 *     console.log(string.length) // 11
 *     var m = new M({ name: string })
 *     console.log(m.name.length) // 9
 *
 * @api public
 */

SchemaString.prototype.trim = function () {
  return this.set(function (v, self) {
    if ('string' != typeof v) v = self.cast(v)
    if (v) return v.trim();
    return v;
  });
};

/**
 * Sets a regexp validator.
 *
 * Any value that does not pass `regExp`.test(val) will fail validation.
 *
 * ####Example:
 *
 *     var s = new Schema({ name: { type: String, match: /^a/ }})
 *     var M = db.model('M', s)
 *     var m = new M({ name: 'invalid' })
 *     m.validate(function (err) {
 *       console.error(err) // validation error
 *       m.name = 'apples'
 *       m.validate(function (err) {
 *         assert.ok(err) // success
 *       })
 *     })
 *
 * @param {RegExp} regExp regular expression to test against
 * @param {String} optional error message
 * @api public
 */

SchemaString.prototype.match = function match (regExp, message) {
  message = message || errorMessages['string']['match'];
  this.validators.push([function(v){
    return null != v && '' !== v
      ? regExp.test(v)
      : true
  }, 'regexp', message]);
};

/**
 * Check required
 *
 * @param {String|null|undefined} value
 * @api private
 */

SchemaString.prototype.checkRequired = function checkRequired (value) {
  if (SchemaType._isRef(this, value, true)) {
    return null != value;
  } else {
    return (value instanceof String || typeof value == 'string') && value.length;
  }
};

/**
 * Casts to String
 *
 * @api private
 */

SchemaString.prototype.cast = function (value, scope, init) {
  if (SchemaType._isRef(this, value, init)) return value;
  if (value === null) return value;
  if ('undefined' !== typeof value && value.toString) return value.toString();
  var message = errorMessages['string']['cast'];
  throw new CastError('string', value, message, this.path);
};

/*!
 * ignore
 */

function handleSingle (val) {
  return this.castForQuery(val);
}

function handleArray (val) {
  var self = this;
  return val.map(function (m) {
    return self.castForQuery(m);
  });
}

SchemaString.prototype.$conditionalHandlers = {
    '$ne' : handleSingle
  , '$in' : handleArray
  , '$nin': handleArray
  , '$gt' : handleSingle
  , '$lt' : handleSingle
  , '$gte': handleSingle
  , '$lte': handleSingle
  , '$all': handleArray
  , '$regex': handleSingle
  , '$options': handleSingle
};

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [val]
 * @api private
 */

SchemaString.prototype.castForQuery = function ($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler)
      throw new Error("Can't use " + $conditional + " with String.");
    return handler.call(this, val);
  } else {
    val = $conditional;
    if (val instanceof RegExp) return val;
    return this.cast(val);
  }
};

/*!
 * Module exports.
 */

module.exports = SchemaString;
