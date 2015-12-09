/*!
 * Module requirements.
 */

var SchemaType = require('../schematype'),
    CastError = SchemaType.CastError,
    errorMessages = require('../error').messages,
    utils = require('../utils'),
    Document;

/**
 * Number SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function SchemaNumber(key, options) {
  SchemaType.call(this, key, options, 'Number');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api private
 */
SchemaNumber.schemaName = 'Number';

/*!
 * Inherits from SchemaType.
 */
SchemaNumber.prototype = Object.create( SchemaType.prototype );
SchemaNumber.prototype.constructor = SchemaNumber;

/**
 * Required validator for number
 *
 * @api private
 */

SchemaNumber.prototype.checkRequired = function checkRequired(value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return null != value;
  } else {
    return typeof value == 'number' || value instanceof Number;
  }
};

/**
 * Sets a minimum number validator.
 *
 * ####Example:
 *
 *     var s = new Schema({ n: { type: Number, min: 10 })
 *     var M = db.model('M', s)
 *     var m = new M({ n: 9 })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.n = 10;
 *       m.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MIN} token which will be replaced with the invalid value
 *     var min = [10, 'The value of path `{PATH}` ({VALUE}) is beneath the limit ({MIN}).'];
 *     var schema = new Schema({ n: { type: Number, min: min })
 *     var M = mongoose.model('Measurement', schema);
 *     var s= new M({ n: 4 });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `n` (4) is beneath the limit (10).
 *     })
 *
 * @param {Number} value minimum number
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaNumber.prototype.min = function(value, message) {
  if (this.minValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator != this.minValidator;
    }, this);
  }

  if (null != value) {
    var msg = message || errorMessages.Number.min;
    msg = msg.replace(/{MIN}/, value);
    this.validators.push({
      validator: this.minValidator = function(v) {
        return v == null || v >= value;
      },
      message: msg,
      type: 'min',
      min: value
    });
  }

  return this;
};

/**
 * Sets a maximum number validator.
 *
 * ####Example:
 *
 *     var s = new Schema({ n: { type: Number, max: 10 })
 *     var M = db.model('M', s)
 *     var m = new M({ n: 11 })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.n = 10;
 *       m.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MAX} token which will be replaced with the invalid value
 *     var max = [10, 'The value of path `{PATH}` ({VALUE}) exceeds the limit ({MAX}).'];
 *     var schema = new Schema({ n: { type: Number, max: max })
 *     var M = mongoose.model('Measurement', schema);
 *     var s= new M({ n: 4 });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `n` (4) exceeds the limit (10).
 *     })
 *
 * @param {Number} maximum number
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaNumber.prototype.max = function(value, message) {
  if (this.maxValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator != this.maxValidator;
    }, this);
  }

  if (null != value) {
    var msg = message || errorMessages.Number.max;
    msg = msg.replace(/{MAX}/, value);
    this.validators.push({
      validator: this.maxValidator = function(v) {
        return v == null || v <= value;
      },
      message: msg,
      type: 'max',
      max: value
    });
  }

  return this;
};

/**
 * Casts to number
 *
 * @param {Object} value value to cast
 * @param {Document} doc document that triggers the casting
 * @param {Boolean} init
 * @api private
 */

SchemaNumber.prototype.cast = function(value, doc, init) {
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
    if ('number' == typeof value) {
      return value;
    } else if (Buffer.isBuffer(value) || !utils.isObject(value)) {
      throw new CastError('number', value, this.path);
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

  var val = value && value._id
    ? value._id // documents
    : value;

  if (!isNaN(val)) {
    if (null === val) return val;
    if ('' === val) return null;
    if (typeof val === 'string' || typeof val === 'boolean') {
      val = Number(val);
    }
    if (val instanceof Number) return val;
    if ('number' == typeof val) return val;
    if (val.toString && !Array.isArray(val) &&
        val.toString() == Number(val)) {
      return new Number(val);
    }
  }

  throw new CastError('number', value, this.path);
};

/*!
 * ignore
 */

function handleSingle(val) {
  return this.cast(val);
}

function handleArray(val) {
  var self = this;
  if (!Array.isArray(val)) {
    return [this.cast(val)];
  }
  return val.map(function(m) {
    return self.cast(m);
  });
}

function handleBitwiseOperator(val) {
  var _this = this;
  if (Array.isArray(val)) {
    return val.map(function(v) { return _this.cast(v); });
  } else if (Buffer.isBuffer(val)) {
    return val;
  } else {
    // Assume trying to cast to number
    return this.cast(val);
  }
}

SchemaNumber.prototype.$conditionalHandlers =
  utils.options(SchemaType.prototype.$conditionalHandlers, {
    '$bitsAllClear': handleBitwiseOperator,
    '$bitsAnyClear': handleBitwiseOperator,
    '$bitsAllSet': handleBitwiseOperator,
    '$bitsAnySet': handleBitwiseOperator,
    '$gt' : handleSingle,
    '$gte': handleSingle,
    '$lt' : handleSingle,
    '$lte': handleSingle,
    '$mod': handleArray
  });

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

SchemaNumber.prototype.castForQuery = function($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler)
      throw new Error("Can't use " + $conditional + " with Number.");
    return handler.call(this, val);
  } else {
    val = this.cast($conditional);
    return val == null ? val : val;
  }
};

/*!
 * Module exports.
 */

module.exports = SchemaNumber;
