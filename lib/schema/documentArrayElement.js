/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('../error/mongooseError');
const SchemaType = require('../schemaType');
const SchemaSubdocument = require('./subdocument');
const getConstructor = require('../helpers/discriminator/getConstructor');

/**
 * DocumentArrayElement SchemaType constructor. Mongoose calls this internally when you define a new document array in your schema.
 *
 * #### Example:
 *     const schema = new Schema({ users: [{ name: String }] });
 *     schema.path('users.$'); // SchemaDocumentArrayElement with schema `new Schema({ name: String })`
 *
 * @param {string} path
 * @param {Schema} schema
 * @param {object} options
 * @param {Schema} parentSchema
 * @inherits SchemaType
 * @api public
 */

function SchemaDocumentArrayElement(path, schema, options, parentSchema) {
  this.$parentSchemaType = options?.$parentSchemaType;
  if (!this.$parentSchemaType) {
    throw new MongooseError('Cannot create DocumentArrayElement schematype without a parent');
  }
  delete options.$parentSchemaType;

  SchemaType.call(this, path, options, 'DocumentArrayElement', parentSchema);

  this.$isMongooseDocumentArrayElement = true;
  this.Constructor = options?.Constructor;
  this.schema = schema;
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaDocumentArrayElement.schemaName = 'DocumentArrayElement';

SchemaDocumentArrayElement.defaultOptions = {};

/**
 * Sets a default option for all SchemaDocumentArrayElement instances.
 *
 * #### Example:
 *
 *     // Make all document array elements have option `_id` equal to false.
 *     mongoose.Schema.Types.DocumentArrayElement.set('_id', false);
 *
 * @param {string} option The name of the option you'd like to set
 * @param {any} value The value of the option you'd like to set.
 * @return {void}
 * @function set
 * @static
 * @api public
 */

SchemaDocumentArrayElement.set = SchemaType.set;

/**
 * Attaches a getter for all DocumentArrayElement instances
 *
 * @param {Function} getter
 * @return {this}
 * @function get
 * @static
 * @api public
 */

SchemaDocumentArrayElement.get = SchemaType.get;

/*!
 * Inherits from SchemaType.
 */
SchemaDocumentArrayElement.prototype = Object.create(SchemaType.prototype);
SchemaDocumentArrayElement.prototype.constructor = SchemaDocumentArrayElement;

/**
 * Casts `val` for DocumentArrayElement.
 *
 * @param {object} value to cast
 * @api private
 */

SchemaDocumentArrayElement.prototype.cast = function(...args) {
  return this.$parentSchemaType.cast(...args)[0];
};

/**
 * Async validation on this individual array element
 *
 * @api public
 */

SchemaDocumentArrayElement.prototype.doValidate = async function doValidate(value, scope, options) {
  const Constructor = getConstructor(this.Constructor, value);

  if (value && !(value instanceof Constructor)) {
    value = new Constructor(value, scope, null, null, options?.index ?? null);
  }

  return SchemaSubdocument.prototype.doValidate.call(this, value, scope, options);
};

/**
 * Synchronous validation on this individual array element
 *
 * @api private
 */

SchemaDocumentArrayElement.prototype.doValidateSync = function doValidateSync(value, scope, options) {
  const Constructor = getConstructor(this.Constructor, value);

  if (value && !(value instanceof Constructor)) {
    value = new Constructor(value, scope, null, null, options?.index ?? null);
  }

  return SchemaSubdocument.prototype.doValidateSync.call(this, value, scope, options);
};

/**
 * Clone the current SchemaType
 *
 * @return {DocumentArrayElement} The cloned instance
 * @api private
 */

SchemaDocumentArrayElement.prototype.clone = function() {
  // This schematype takes the subdocument schema where `SchemaType` takes the
  // options, so it cannot go through `SchemaType.prototype.clone()`: the
  // arguments would land in the wrong parameters and `$parentSchemaType` would
  // never reach the constructor.
  const options = Object.assign({}, this.options, {
    $parentSchemaType: this.$parentSchemaType,
    Constructor: this.Constructor
  });
  const schematype = new this.constructor(
    this.path,
    this.schema,
    options,
    this.parentSchema
  );
  schematype.validators = this.validators.slice();
  if (this.requiredValidator !== undefined) {
    schematype.requiredValidator = this.requiredValidator;
  }

  return schematype;
};

/*!
 * Module exports.
 */

module.exports = SchemaDocumentArrayElement;
