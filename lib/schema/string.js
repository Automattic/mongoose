
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , errorMessages = require('../error').messages
  , utils = require('../utils')
  , Document

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

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api private
 */
SchemaString.schemaName = 'String';

/*!
 * Inherits from SchemaType.
 */
SchemaString.prototype = Object.create( SchemaType.prototype );
SchemaString.prototype.constructor = SchemaString;

/**
 * Adds an enum validator
 *
 * ####Example:
 *
 *     var states = 'opening open closing closed'.split(' ')
 *     var s = new Schema({ state: { type: String, enum: states }})
 *     var M = db.model('M', s)
 *     var m = new M({ state: 'invalid' })
 *     m.save(function (err) {
 *       console.error(String(err)) // ValidationError: `invalid` is not a valid enum value for path `state`.
 *       m.state = 'open'
 *       m.save(callback) // success
 *     })
 *
 *     // or with custom error messages
 *     var enu = {
 *       values: 'opening open closing closed'.split(' '),
 *       message: 'enum validator failed for path `{PATH}` with value `{VALUE}`'
 *     }
 *     var s = new Schema({ state: { type: String, enum: enu })
 *     var M = db.model('M', s)
 *     var m = new M({ state: 'invalid' })
 *     m.save(function (err) {
 *       console.error(String(err)) // ValidationError: enum validator failed for path `state` with value `invalid`
 *       m.state = 'open'
 *       m.save(callback) // success
 *     })
 *
 * @param {String|Object} [args...] enumeration values
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaString.prototype.enum = function () {
  if (this.enumValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator != this.enumValidator;
    }, this);
    this.enumValidator = false;
  }

  if (undefined === arguments[0] || false === arguments[0]) {
    return this;
  }

  var values;
  var errorMessage;

  if (utils.isObject(arguments[0])) {
    values = arguments[0].values;
    errorMessage = arguments[0].message;
  } else {
    values = arguments;
    errorMessage = errorMessages.String.enum;
  }

  for (var i = 0; i < values.length; i++) {
    if (undefined !== values[i]) {
      this.enumValues.push(this.cast(values[i]));
    }
  }

  var vals = this.enumValues;
  this.enumValidator = function (v) {
    return undefined === v || ~vals.indexOf(v);
  };
  this.validators.push({
    validator: this.enumValidator,
    message: errorMessage,
    kind: 'enum'
  });

  return this;
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
 * @return {SchemaType} this
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
 * @return {SchemaType} this
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
 * @return {SchemaType} this
 */

SchemaString.prototype.trim = function () {
  return this.set(function (v, self) {
    if ('string' != typeof v) v = self.cast(v)
    if (v) return v.trim();
    return v;
  });
};

/**
 * Sets a minimum length validator.
 *
 * ####Example:
 *
 *     var schema = new Schema({ postalCode: { type: String, minlength: 5 })
 *     var Address = db.model('Address', schema)
 *     var address = new Address({ postalCode: '9512' })
 *     address.save(function (err) {
 *       console.error(err) // validator error
 *       address.postalCode = '95125';
 *       address.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MINLENGTH} token which will be replaced with the invalid value
 *     var minlength = [10, 'The value of path `{PATH}` (`{VALUE}`) is shorter than the minimum length ({MINLENGTH}).'];
 *     var schema = new Schema({ postalCode: { type: String, minlength: minlength })
 *     var Address = mongoose.model('Address', schema);
 *     var address = new Address({ postalCode: '9512' });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `postalCode` (`9512`) is shorter than the minimum length (5).
 *     })
 *
 * @param {Number} value minimum string length
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaString.prototype.minlength = function (value, message) {
  if (this.minlengthValidator) {
    this.validators = this.validators.filter(function (v) {
      return v.validator != this.minlengthValidator;
    }, this);
  }

  if (null != value) {
    var msg = message || errorMessages.String.minlength;
    msg = msg.replace(/{MINLENGTH}/, value);
    this.validators.push({
      validator: this.minlengthValidator = function (v) {
        return v === null || v.length >= value;
      },
      message: msg,
      type: 'minlength'
    });
  }

  return this;
};

/**
 * Sets a maximum length validator.
 *
 * ####Example:
 *
 *     var schema = new Schema({ postalCode: { type: String, maxlength: 9 })
 *     var Address = db.model('Address', schema)
 *     var address = new Address({ postalCode: '9512512345' })
 *     address.save(function (err) {
 *       console.error(err) // validator error
 *       address.postalCode = '95125';
 *       address.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MAXLENGTH} token which will be replaced with the invalid value
 *     var maxlength = [10, 'The value of path `{PATH}` (`{VALUE}`) exceeds the maximum allowed length ({MAXLENGTH}).'];
 *     var schema = new Schema({ postalCode: { type: String, maxlength: maxlength })
 *     var Address = mongoose.model('Address', schema);
 *     var address = new Address({ postalCode: '9512512345' });
 *     address.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `postalCode` (`9512512345`) exceeds the maximum allowed length (10).
 *     })
 *
 * @param {Number} value maximum string length
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaString.prototype.maxlength = function (value, message) {
  if (this.maxlengthValidator) {
    this.validators = this.validators.filter(function(v){
      return v.validator != this.maxlengthValidator;
    }, this);
  }

  if (null != value) {
    var msg = message || errorMessages.String.maxlength;
    msg = msg.replace(/{MAXLENGTH}/, value);
    this.validators.push({
      validator: this.maxlengthValidator = function(v) {
        return v === null || v.length <= value;
      },
      message: msg,
      type: 'maxlength'
    });
  }

  return this;
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
 *     var m = new M({ name: 'I am invalid' })
 *     m.validate(function (err) {
 *       console.error(String(err)) // "ValidationError: Path `name` is invalid (I am invalid)."
 *       m.name = 'apples'
 *       m.validate(function (err) {
 *         assert.ok(err) // success
 *       })
 *     })
 *
 *     // using a custom error message
 *     var match = [ /\.html$/, "That file doesn't end in .html ({VALUE})" ];
 *     var s = new Schema({ file: { type: String, match: match }})
 *     var M = db.model('M', s);
 *     var m = new M({ file: 'invalid' });
 *     m.validate(function (err) {
 *       console.log(String(err)) // "ValidationError: That file doesn't end in .html (invalid)"
 *     })
 *
 * Empty strings, `undefined`, and `null` values always pass the match validator. If you require these values, enable the `required` validator also.
 *
 *     var s = new Schema({ name: { type: String, match: /^a/, required: true }})
 *
 * @param {RegExp} regExp regular expression to test against
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaString.prototype.match = function match (regExp, message) {
  // yes, we allow multiple match validators

  var msg = message || errorMessages.String.match;

  var matchValidator = function(v) {
    var ret = ((null != v && '' !== v)
      ? regExp.test(v)
      : true);
    return ret;
  };

  this.validators.push({ validator: matchValidator, message: msg, type: 'regexp' });
  return this;
};

/**
 * Check required
 *
 * @param {String|null|undefined} value
 * @api private
 */

SchemaString.prototype.checkRequired = function checkRequired (value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
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

SchemaString.prototype.cast = function (value, doc, init) {
  if (SchemaType._isRef(this, value, doc, init)) {
    // wait! we may need to cast this to a document

    if (null == value) {
      return value;
    }

    // lazy load
    Document || (Document = require('./../document'));

    if (value instanceof Document) {
      value.$__.wasPopulated = true;
      return value;
    }

    // setting a populated path
    if ('string' == typeof value) {
      return value;
    } else if (Buffer.isBuffer(value) || !utils.isObject(value)) {
      throw new CastError('string', value, this.path);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    var path = doc.$__fullPath(this.path);
    var owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    var pop = owner.populated(path, true);
    var ret = new pop.options.model(value);
    ret.$__.wasPopulated = true;
    return ret;
  }

  // If null or undefined
  if (value == null) {
    return value;
  }

  if ('undefined' !== typeof value) {
    // handle documents being passed
    if (value._id && 'string' == typeof value._id) {
      return value._id;
    }
    if (value.toString) {
      return value.toString();
    }
  }


  throw new CastError('string', value, this.path);
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

SchemaString.prototype.$conditionalHandlers =
  utils.options(SchemaType.prototype.$conditionalHandlers, {
    '$all': handleArray,
    '$gt' : handleSingle,
    '$gte': handleSingle,
    '$in' : handleArray,
    '$lt' : handleSingle,
    '$lte': handleSingle,
    '$ne' : handleSingle,
    '$nin': handleArray,
    '$options': handleSingle,
    '$regex': handleSingle
  });

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
