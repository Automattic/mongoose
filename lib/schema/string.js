'use strict';

/*!
 * Module dependencies.
 */

const SchemaType = require('../schematype');
const MongooseError = require('../error/index');
const SchemaStringOptions = require('../options/SchemaStringOptions');
const castString = require('../cast/string');
const utils = require('../utils');

const populateModelSymbol = require('../helpers/symbols').populateModelSymbol;

const CastError = SchemaType.CastError;
let Document;

/**
 * String SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaString(key, options) {
  this.enumValues = [];
  this.regExp = null;
  SchemaType.call(this, key, options, 'String');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaString.schemaName = 'String';

/*!
 * Inherits from SchemaType.
 */
SchemaString.prototype = Object.create(SchemaType.prototype);
SchemaString.prototype.constructor = SchemaString;
SchemaString.prototype.OptionsConstructor = SchemaStringOptions;

/*!
 * ignore
 */

SchemaString._cast = castString;

/**
 * Get/set the function used to cast arbitrary values to strings.
 *
 * ####Example:
 *
 *     // Throw an error if you pass in an object. Normally, Mongoose allows
 *     // objects with custom `toString()` functions.
 *     const original = mongoose.Schema.Types.String.cast();
 *     mongoose.Schema.Types.String.cast(v => {
 *       assert.ok(v == null || typeof v !== 'object');
 *       return original(v);
 *     });
 *
 *     // Or disable casting entirely
 *     mongoose.Schema.Types.String.cast(false);
 *
 * @param {Function} caster
 * @return {Function}
 * @function get
 * @static
 * @api public
 */

SchemaString.cast = function cast(caster) {
  if (arguments.length === 0) {
    return this._cast;
  }
  if (caster === false) {
    caster = v => {
      if (v != null && typeof v !== 'string') {
        throw new Error();
      }
      return v;
    };
  }
  this._cast = caster;

  return this._cast;
};

/**
 * Attaches a getter for all String instances.
 *
 * ####Example:
 *
 *     // Make all numbers round down
 *     mongoose.Schema.String.get(v => v.toLowerCase());
 *
 *     const Model = mongoose.model('Test', new Schema({ test: String }));
 *     new Model({ test: 'FOO' }).test; // 'foo'
 *
 * @param {Function} getter
 * @return {this}
 * @function get
 * @static
 * @api public
 */

SchemaString.get = SchemaType.get;

/*!
 * ignore
 */

SchemaString._checkRequired = v => (v instanceof String || typeof v === 'string') && v.length;

/**
 * Override the function the required validator uses to check whether a string
 * passes the `required` check.
 *
 * ####Example:
 *
 *     // Allow empty strings to pass `required` check
 *     mongoose.Schema.Types.String.checkRequired(v => v != null);
 *
 *     const M = mongoose.model({ str: { type: String, required: true } });
 *     new M({ str: '' }).validateSync(); // `null`, validation passes!
 *
 * @param {Function} fn
 * @return {Function}
 * @function checkRequired
 * @static
 * @api public
 */

SchemaString.checkRequired = SchemaType.checkRequired;

/**
 * Adds an enum validator
 *
 * ####Example:
 *
 *     var states = ['opening', 'open', 'closing', 'closed']
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
 *     var enum = {
 *       values: ['opening', 'open', 'closing', 'closed'],
 *       message: 'enum validator failed for path `{PATH}` with value `{VALUE}`'
 *     }
 *     var s = new Schema({ state: { type: String, enum: enum })
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

SchemaString.prototype.enum = function() {
  if (this.enumValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.enumValidator;
    }, this);
    this.enumValidator = false;
  }

  if (arguments[0] === void 0 || arguments[0] === false) {
    return this;
  }

  let values;
  let errorMessage;

  if (utils.isObject(arguments[0])) {
    values = arguments[0].values;
    errorMessage = arguments[0].message;
  } else {
    values = arguments;
    errorMessage = MongooseError.messages.String.enum;
  }

  for (let i = 0; i < values.length; i++) {
    if (undefined !== values[i]) {
      this.enumValues.push(this.cast(values[i]));
    }
  }

  const vals = this.enumValues;
  this.enumValidator = function(v) {
    return undefined === v || ~vals.indexOf(v);
  };
  this.validators.push({
    validator: this.enumValidator,
    message: errorMessage,
    type: 'enum',
    enumValues: vals
  });

  return this;
};

/**
 * Adds a lowercase [setter](http://mongoosejs.com/docs/api.html#schematype_SchemaType-set).
 *
 * ####Example:
 *
 *     var s = new Schema({ email: { type: String, lowercase: true }})
 *     var M = db.model('M', s);
 *     var m = new M({ email: 'SomeEmail@example.COM' });
 *     console.log(m.email) // someemail@example.com
 *     M.find({ email: 'SomeEmail@example.com' }); // Queries by 'someemail@example.com'
 *
 * @api public
 * @return {SchemaType} this
 */

SchemaString.prototype.lowercase = function(shouldApply) {
  if (arguments.length > 0 && !shouldApply) {
    return this;
  }
  return this.set(function(v, self) {
    if (typeof v !== 'string') {
      v = self.cast(v);
    }
    if (v) {
      return v.toLowerCase();
    }
    return v;
  });
};

/**
 * Adds an uppercase [setter](http://mongoosejs.com/docs/api.html#schematype_SchemaType-set).
 *
 * ####Example:
 *
 *     var s = new Schema({ caps: { type: String, uppercase: true }})
 *     var M = db.model('M', s);
 *     var m = new M({ caps: 'an example' });
 *     console.log(m.caps) // AN EXAMPLE
 *     M.find({ caps: 'an example' }) // Matches documents where caps = 'AN EXAMPLE'
 *
 * @api public
 * @return {SchemaType} this
 */

SchemaString.prototype.uppercase = function(shouldApply) {
  if (arguments.length > 0 && !shouldApply) {
    return this;
  }
  return this.set(function(v, self) {
    if (typeof v !== 'string') {
      v = self.cast(v);
    }
    if (v) {
      return v.toUpperCase();
    }
    return v;
  });
};

/**
 * Adds a trim [setter](http://mongoosejs.com/docs/api.html#schematype_SchemaType-set).
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

SchemaString.prototype.trim = function(shouldTrim) {
  if (arguments.length > 0 && !shouldTrim) {
    return this;
  }
  return this.set(function(v, self) {
    if (typeof v !== 'string') {
      v = self.cast(v);
    }
    if (v) {
      return v.trim();
    }
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
 *     // We can also use the special {MINLENGTH} token which will be replaced with the minimum allowed length
 *     var minlength = [5, 'The value of path `{PATH}` (`{VALUE}`) is shorter than the minimum allowed length ({MINLENGTH}).'];
 *     var schema = new Schema({ postalCode: { type: String, minlength: minlength })
 *     var Address = mongoose.model('Address', schema);
 *     var address = new Address({ postalCode: '9512' });
 *     address.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `postalCode` (`9512`) is shorter than the minimum length (5).
 *     })
 *
 * @param {Number} value minimum string length
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaString.prototype.minlength = function(value, message) {
  if (this.minlengthValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.minlengthValidator;
    }, this);
  }

  if (value !== null && value !== undefined) {
    let msg = message || MongooseError.messages.String.minlength;
    msg = msg.replace(/{MINLENGTH}/, value);
    this.validators.push({
      validator: this.minlengthValidator = function(v) {
        return v === null || v.length >= value;
      },
      message: msg,
      type: 'minlength',
      minlength: value
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
 *     // We can also use the special {MAXLENGTH} token which will be replaced with the maximum allowed length
 *     var maxlength = [9, 'The value of path `{PATH}` (`{VALUE}`) exceeds the maximum allowed length ({MAXLENGTH}).'];
 *     var schema = new Schema({ postalCode: { type: String, maxlength: maxlength })
 *     var Address = mongoose.model('Address', schema);
 *     var address = new Address({ postalCode: '9512512345' });
 *     address.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `postalCode` (`9512512345`) exceeds the maximum allowed length (9).
 *     })
 *
 * @param {Number} value maximum string length
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaString.prototype.maxlength = function(value, message) {
  if (this.maxlengthValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.maxlengthValidator;
    }, this);
  }

  if (value !== null && value !== undefined) {
    let msg = message || MongooseError.messages.String.maxlength;
    msg = msg.replace(/{MAXLENGTH}/, value);
    this.validators.push({
      validator: this.maxlengthValidator = function(v) {
        return v === null || v.length <= value;
      },
      message: msg,
      type: 'maxlength',
      maxlength: value
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

SchemaString.prototype.match = function match(regExp, message) {
  // yes, we allow multiple match validators

  const msg = message || MongooseError.messages.String.match;

  const matchValidator = function(v) {
    if (!regExp) {
      return false;
    }

    const ret = ((v != null && v !== '')
      ? regExp.test(v)
      : true);
    return ret;
  };

  this.validators.push({
    validator: matchValidator,
    message: msg,
    type: 'regexp',
    regexp: regExp
  });
  return this;
};

/**
 * Check if the given value satisfies the `required` validator. The value is
 * considered valid if it is a string (that is, not `null` or `undefined`) and
 * has positive length. The `required` validator **will** fail for empty
 * strings.
 *
 * @param {Any} value
 * @param {Document} doc
 * @return {Boolean}
 * @api public
 */

SchemaString.prototype.checkRequired = function checkRequired(value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return !!value;
  }

  // `require('util').inherits()` does **not** copy static properties, and
  // plugins like mongoose-float use `inherits()` for pre-ES6.
  const _checkRequired = typeof this.constructor.checkRequired == 'function' ?
    this.constructor.checkRequired() :
    SchemaString.checkRequired();

  return _checkRequired(value);
};

/**
 * Casts to String
 *
 * @api private
 */

SchemaString.prototype.cast = function(value, doc, init) {
  if (SchemaType._isRef(this, value, doc, init)) {
    // wait! we may need to cast this to a document

    if (value === null || value === undefined) {
      return value;
    }

    // lazy load
    Document || (Document = require('./../document'));

    if (value instanceof Document) {
      value.$__.wasPopulated = true;
      return value;
    }

    // setting a populated path
    if (typeof value === 'string') {
      return value;
    } else if (Buffer.isBuffer(value) || !utils.isObject(value)) {
      throw new CastError('string', value, this.path);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    const path = doc.$__fullPath(this.path);
    const owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    const pop = owner.populated(path, true);
    const ret = new pop.options[populateModelSymbol](value);
    ret.$__.wasPopulated = true;
    return ret;
  }

  const castString = typeof this.constructor.cast === 'function' ?
    this.constructor.cast() :
    SchemaString.cast();
  try {
    return castString(value);
  } catch (error) {
    throw new CastError('string', value, this.path);
  }
};

/*!
 * ignore
 */

function handleSingle(val) {
  return this.castForQuery(val);
}

function handleArray(val) {
  const _this = this;
  if (!Array.isArray(val)) {
    return [this.castForQuery(val)];
  }
  return val.map(function(m) {
    return _this.castForQuery(m);
  });
}

SchemaString.prototype.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {
      $all: handleArray,
      $gt: handleSingle,
      $gte: handleSingle,
      $lt: handleSingle,
      $lte: handleSingle,
      $options: String,
      $regex: handleSingle,
      $not: handleSingle
    });

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [val]
 * @api private
 */

SchemaString.prototype.castForQuery = function($conditional, val) {
  let handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler) {
      throw new Error('Can\'t use ' + $conditional + ' with String.');
    }
    return handler.call(this, val);
  }
  val = $conditional;
  if (Object.prototype.toString.call(val) === '[object RegExp]') {
    return val;
  }

  return this._castForQuery(val);
};

/*!
 * Module exports.
 */

module.exports = SchemaString;
