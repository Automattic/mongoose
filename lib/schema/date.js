/*!
 * Module requirements.
 */

var errorMessages = require('../error').messages;
var utils = require('../utils');

var SchemaType = require('../schematype');

var CastError = SchemaType.CastError;

/**
 * Date SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function SchemaDate (key, options) {
  SchemaType.call(this, key, options, 'Date');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api private
 */
SchemaDate.schemaName = 'Date';

/*!
 * Inherits from SchemaType.
 */
SchemaDate.prototype = Object.create( SchemaType.prototype );
SchemaDate.prototype.constructor = SchemaDate;

/**
 * Declares a TTL index (rounded to the nearest second) for _Date_ types only.
 *
 * This sets the `expiresAfterSeconds` index option available in MongoDB >= 2.1.2.
 * This index type is only compatible with Date types.
 *
 * ####Example:
 *
 *     // expire in 24 hours
 *     new Schema({ createdAt: { type: Date, expires: 60*60*24 }});
 *
 * `expires` utilizes the `ms` module from [guille](https://github.com/guille/) allowing us to use a friendlier syntax:
 *
 * ####Example:
 *
 *     // expire in 24 hours
 *     new Schema({ createdAt: { type: Date, expires: '24h' }});
 *
 *     // expire in 1.5 hours
 *     new Schema({ createdAt: { type: Date, expires: '1.5h' }});
 *
 *     // expire in 7 days
 *     var schema = new Schema({ createdAt: Date });
 *     schema.path('createdAt').expires('7d');
 *
 * @param {Number|String} when
 * @added 3.0.0
 * @return {SchemaType} this
 * @api public
 */

SchemaDate.prototype.expires = function (when) {
  if (!this._index || 'Object' !== this._index.constructor.name) {
    this._index = {};
  }

  this._index.expires = when;
  utils.expires(this._index);
  return this;
};

/**
 * Required validator for date
 *
 * @api private
 */

SchemaDate.prototype.checkRequired = function (value) {
  return value instanceof Date;
};

/**
 * Sets a minimum date validator.
 *
 * ####Example:
 *
 *     var s = new Schema({ d: { type: Date, min: Date('1970-01-01') })
 *     var M = db.model('M', s)
 *     var m = new M({ d: Date('1969-12-31') })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.d = Date('2014-12-08');
 *       m.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MIN} token which will be replaced with the invalid value
 *     var min = [Date('1970-01-01'), 'The value of path `{PATH}` ({VALUE}) is beneath the limit ({MIN}).'];
 *     var schema = new Schema({ d: { type: Date, min: min })
 *     var M = mongoose.model('M', schema);
 *     var s= new M({ d: Date('1969-12-31') });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `d` (1969-12-31) is before the limit (1970-01-01).
 *     })
 *
 * @param {Date} value minimum date
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaDate.prototype.min = function (value, message) {
  if (this.minValidator) {
    this.validators = this.validators.filter(function (v) {
      return v.validator != this.minValidator;
    }, this);
  }

  if (value) {
    var msg = message || errorMessages.Date.min;
    msg = msg.replace(/{MIN}/, (value === Date.now ? 'Date.now()' : this.cast(value).toString()));
    var self = this;
    this.validators.push({
      validator: this.minValidator = function (val) {
        var min = (value === Date.now ? value() : self.cast(value));
        return val === null || val.valueOf() >= min.valueOf();
      },
      message: msg,
      type: 'min',
      min: value
    });
  }

  return this;
};

/**
 * Sets a maximum date validator.
 *
 * ####Example:
 *
 *     var s = new Schema({ d: { type: Date, max: Date('2014-01-01') })
 *     var M = db.model('M', s)
 *     var m = new M({ d: Date('2014-12-08') })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.d = Date('2013-12-31');
 *       m.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MAX} token which will be replaced with the invalid value
 *     var max = [Date('2014-01-01'), 'The value of path `{PATH}` ({VALUE}) exceeds the limit ({MAX}).'];
 *     var schema = new Schema({ d: { type: Date, max: max })
 *     var M = mongoose.model('M', schema);
 *     var s= new M({ d: Date('2014-12-08') });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `d` (2014-12-08) exceeds the limit (2014-01-01).
 *     })
 *
 * @param {Date} maximum date
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaDate.prototype.max = function (value, message) {
  if (this.maxValidator) {
    this.validators = this.validators.filter(function(v){
      return v.validator != this.maxValidator;
    }, this);
  }

  if (value) {
    var msg = message || errorMessages.Date.max;
    msg = msg.replace(/{MAX}/, (value === Date.now ? 'Date.now()' : this.cast(value).toString()));
    var self = this;
    this.validators.push({
      validator: this.maxValidator = function(val) {
        var max = (value === Date.now ? value() : self.cast(value));
        return val === null || val.valueOf() <= max.valueOf();
      },
      message: msg,
      type: 'max',
      max: value
    });
  }

  return this;
};

/**
 * Casts to date
 *
 * @param {Object} value to cast
 * @api private
 */

SchemaDate.prototype.cast = function (value) {
  // If null or undefined
  if (value == null || value === '')
    return value;

  if (value instanceof Date)
    return value;

  var date;

  // support for timestamps
  if (typeof value !== 'undefined') {
    if (value instanceof Number || 'number' == typeof value
        || String(value) == Number(value)) {
      date = new Date(Number(value));
    } else if (value.toString) {
      // support for date strings
      date = new Date(value.toString());
    }

    if (date.toString() != 'Invalid Date') {
      return date;
    }
  }

  throw new CastError('date', value, this.path);
};

/*!
 * Date Query casting.
 *
 * @api private
 */

function handleSingle (val) {
  return this.cast(val);
}

function handleArray (val) {
  var self = this;
  return val.map( function (m) {
    return self.cast(m);
  });
}

SchemaDate.prototype.$conditionalHandlers =
  utils.options(SchemaType.prototype.$conditionalHandlers, {
    '$all': handleArray,
    '$gt': handleSingle,
    '$gte': handleSingle,
    '$in': handleArray,
    '$lt': handleSingle,
    '$lte': handleSingle,
    '$ne': handleSingle,
    '$nin': handleArray
  });


/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

SchemaDate.prototype.castForQuery = function ($conditional, val) {
  var handler;

  if (2 !== arguments.length) {
    return this.cast($conditional);
  }

  handler = this.$conditionalHandlers[$conditional];

  if (!handler) {
    throw new Error("Can't use " + $conditional + " with Date.");
  }

  return handler.call(this, val);
};

/*!
 * Module exports.
 */

module.exports = SchemaDate;
