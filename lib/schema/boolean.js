
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype');

/**
 * Boolean SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function SchemaBoolean (path, options) {
  SchemaType.call(this, path, options);
};

/*!
 * Inherits from SchemaType.
 */
SchemaBoolean.prototype.__proto__ = SchemaType.prototype;

/**
 * Required validator
 *
 * @api private
 */

SchemaBoolean.prototype.checkRequired = function (value) {
  return value === true || value === false;
};

/**
 * Casts to boolean
 *
 * @param {Object} value
 * @api private
 */

SchemaBoolean.prototype.cast = function (value) {
  if (value === null) return value;
  if (value === '0') return false;
  return !!value;
};

/*!
 * ignore
 */

function handleArray (val) {
  var self = this;
  return val.map(function (m) {
    return self.cast(m);
  });
}

SchemaBoolean.$conditionalHandlers = {
    '$in': handleArray
}

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} val
 * @api private
 */

SchemaBoolean.prototype.castForQuery = function ($conditional, val) {
  var handler;
  if (2 === arguments.length) {
    handler = SchemaBoolean.$conditionalHandlers[$conditional];

    if (!handler)
      throw new Error("Can't use " + $conditional + " with Boolean.");

    return handler.call(this, val);
  }

  return this.cast($conditional);
};

/*!
 * Module exports.
 */

module.exports = SchemaBoolean;
