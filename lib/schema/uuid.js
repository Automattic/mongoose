/*!
 * Module dependencies.
 */

'use strict';

const MongooseBuffer = require('../types/buffer');
const SchemaType = require('../schematype');
const CastError = SchemaType.CastError;
const utils = require('../utils');
const isBsonType = require('../helpers/isBsonType');

const UUID_FORMAT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const Binary = MongooseBuffer.Binary;

/**
 * Convert a hex-string to a buffer
 * @param {String} hex The hex string to convert
 * @returns {Buffer} The hex as buffer
 */

function hex2buffer(hex) {
  // use buffer built-in function to convert from hex-string to buffer
  const buff = Buffer.from(hex, 'hex');
  return buff;
}

function binary2hex(buf) {
  // use buffer built-in function to convert from buffer to hex-string
  const hex = buf.toString('hex');
  return hex;
}

function stringToBinary(uuidStr) {
  // Protect against undefined & throwing err
  if (typeof uuidStr !== 'string') uuidStr = '';
  const hex = uuidStr.replace(/[{}-]/g, ''); // remove extra characters
  const bytes = hex2buffer(hex);
  const buff = new MongooseBuffer(bytes);
  buff._subtype = 4;

  return buff;
}

function binaryToString(uuidBin) {
  const hex = binary2hex(uuidBin);
  const uuidStr = hex.substring(0, 8) + '-' + hex.substring(8, 8 + 4) + '-' + hex.substring(12, 12 + 4) + '-' + hex.substring(16, 16 + 4) + '-' + hex.substring(20, 20 + 12);
  return uuidStr;
}

/**
 * UUIDv1 SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaUUID(key, options) {
  SchemaType.call(this, key, options, 'UUID');
  this.getters.push(binaryToString);
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaUUID.schemaName = 'UUID';

SchemaUUID.defaultOptions = {};

/*!
 * Inherits from SchemaType.
 */
SchemaUUID.prototype = Object.create(SchemaType.prototype);
SchemaUUID.prototype.constructor = SchemaUUID;

/*!
 * ignore
 */

SchemaUUID._cast = function(value) {
  if (value === null) {
    return value;
  }

  function newBuffer(initbuff) {
    const buff = new MongooseBuffer(initbuff);
    buff._subtype = 4;
    return buff;
  }

  if (typeof value === 'string') {
    if (UUID_FORMAT.test(value)) {
      return stringToBinary(value);
    } else {
      throw new CastError(SchemaUUID.schemaName, value, this.path);
    }
  }

  if (Buffer.isBuffer(value)) {
    return newBuffer(value);
  }

  if (value instanceof Binary) {
    return newBuffer(value.value(true));
  }

  // Re: gh-647 and gh-3030, we're ok with casting using `toString()`
  // **unless** its the default Object.toString, because "[object Object]"
  // doesn't really qualify as useful data
  if (value.toString && value.toString !== Object.prototype.toString) {
    if (UUID_FORMAT.test(value.toString())) {
      return stringToBinary(value.toString());
    }
  }

  throw new CastError(SchemaUUID.schemaName, value, this.path);
};

/**
 * Sets a default option for all UUID instances.
 *
 * #### Example:
 *
 *     // Make all UUIDs have `required` of true by default.
 *     mongoose.Schema.UUID.set('required', true);
 *
 *     const User = mongoose.model('User', new Schema({ test: mongoose.UUID }));
 *     new User({ }).validateSync().errors.test.message; // Path `test` is required.
 *
 * @param {String} option The option you'd like to set the value for
 * @param {Any} value value for option
 * @return {undefined}
 * @function set
 * @static
 * @api public
 */

SchemaUUID.set = SchemaType.set;

/**
 * Get/set the function used to cast arbitrary values to UUIDs.
 *
 * #### Example:
 *
 *     // Make Mongoose refuse to cast UUIDs with 0 length
 *     const original = mongoose.Schema.Types.UUID.cast();
 *     mongoose.UUID.cast(v => {
 *       assert.ok(typeof v === "string" && v.length > 0);
 *       return original(v);
 *     });
 *
 *     // Or disable casting entirely
 *     mongoose.UUID.cast(false);
 *
 * @param {Function} [caster]
 * @return {Function}
 * @function get
 * @static
 * @api public
 */

SchemaUUID.cast = function cast(caster) {
  if (arguments.length === 0) {
    return this._cast;
  }
  if (caster === false) {
    caster = this._defaultCaster;
  }
  this._cast = caster;

  return this._cast;
};

/*!
 * ignore
 */

SchemaUUID._checkRequired = v => UUID_FORMAT.test(v);

/**
 * Override the function the required validator uses to check whether a string
 * passes the `required` check.
 *
 * @param {Function} fn
 * @return {Function}
 * @function checkRequired
 * @static
 * @api public
 */

SchemaUUID.checkRequired = SchemaType.checkRequired;

/**
 * Check if the given value satisfies a required validator.
 *
 * @param {Any} value
 * @return {Boolean}
 * @api public
 */

SchemaUUID.prototype.checkRequired = function checkRequired(value) {
  return UUID_FORMAT.test(value);
};

/**
 * Casts to UUID
 *
 * @param {Object} value
 * @param {Object} doc
 * @param {Boolean} init whether this is an initialization cast
 * @api private
 */

SchemaUUID.prototype.cast = function(value, doc, init) {
  if (SchemaType._isRef(this, value, doc, init)) {
    if (isBsonType(value, 'UUID')) {
      return value;
    }

    return this._castRef(value, doc, init);
  }

  let castFn;
  if (typeof this._castFunction === 'function') {
    castFn = this._castFunction;
  } else if (typeof this.constructor.cast === 'function') {
    castFn = this.constructor.cast();
  } else {
    castFn = SchemaUUID.cast();
  }

  try {
    return castFn(value);
  } catch (error) {
    throw new CastError(SchemaUUID.schemaName, value, this.path, error, this);
  }
};

/*!
 * ignore
 */

function handleSingle(val) {
  return this.cast(val);
}

/*!
 * ignore
 */

function handleArray(val) {
  return val.map((m) => {
    return this.cast(m);
  });
}

SchemaUUID.prototype.$conditionalHandlers =
utils.options(SchemaType.prototype.$conditionalHandlers, {
  $all: handleArray,
  $gt: handleSingle,
  $gte: handleSingle,
  $in: handleArray,
  $lt: handleSingle,
  $lte: handleSingle,
  $ne: handleSingle,
  $nin: handleArray
});

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} val
 * @api private
 */

SchemaUUID.prototype.castForQuery = function($conditional, val) {
  let handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler)
      throw new Error('Can\'t use ' + $conditional + ' with UUID.');
    return handler.call(this, val);
  } else {
    return this.cast($conditional);
  }
};

/*!
 * Module exports.
 */

module.exports = SchemaUUID;
