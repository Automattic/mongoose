/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('../error/mongooseError');
const SchemaType = require('../schematype');
const SubdocumentPath = require('./SubdocumentPath');
const getConstructor = require('../helpers/discriminator/getConstructor');

/**
 * DocumentArrayElement SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function DocumentArrayElement(path, options) {
  this.$parentSchemaType = options && options.$parentSchemaType;
  if (!this.$parentSchemaType) {
    throw new MongooseError('Cannot create DocumentArrayElement schematype without a parent');
  }
  delete options.$parentSchemaType;

  SchemaType.call(this, path, options, 'DocumentArrayElement');

  this.$isMongooseDocumentArrayElement = true;
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
DocumentArrayElement.schemaName = 'DocumentArrayElement';

DocumentArrayElement.defaultOptions = {};

/*!
 * Inherits from SchemaType.
 */
DocumentArrayElement.prototype = Object.create(SchemaType.prototype);
DocumentArrayElement.prototype.constructor = DocumentArrayElement;

/**
 * Casts `val` for DocumentArrayElement.
 *
 * @param {Object} value to cast
 * @api private
 */

DocumentArrayElement.prototype.cast = function(...args) {
  return this.$parentSchemaType.cast(...args)[0];
};

/**
 * Casts contents for queries.
 *
 * @param {String} $cond
 * @param {any} [val]
 * @api private
 */

DocumentArrayElement.prototype.doValidate = function(value, fn, scope, options) {
  const Constructor = getConstructor(this.caster, value);

  if (value && !(value instanceof Constructor)) {
    value = new Constructor(value, scope, null, null, options && options.index != null ? options.index : null);
  }

  return SubdocumentPath.prototype.doValidate.call(this, value, fn, scope, options);
};

/**
 * Clone the current SchemaType
 *
 * @return {DocumentArrayElement} The cloned instance
 * @api private
 */

DocumentArrayElement.prototype.clone = function() {
  this.options.$parentSchemaType = this.$parentSchemaType;
  const ret = SchemaType.prototype.clone.apply(this, arguments);
  delete this.options.$parentSchemaType;

  ret.caster = this.caster;
  ret.schema = this.schema;

  return ret;
};

/*!
 * Module exports.
 */

module.exports = DocumentArrayElement;
