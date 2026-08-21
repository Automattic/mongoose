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
 * @param {object} options
 * @param {string} instance
 * @param {Schema} parentSchema
 * @inherits SchemaType
 * @api public
 */

function SchemaDocumentArrayElement(path, options, instance, parentSchema) {
  this.$parentSchemaType = options?.$parentSchemaType;
  if (!this.$parentSchemaType) {
    throw new MongooseError('Cannot create DocumentArrayElement schematype without a parent');
  }
  delete options.$parentSchemaType;

  SchemaType.call(this, path, options, instance, parentSchema);

  this.$isMongooseDocumentArrayElement = true;
  this.Constructor = options?.Constructor;
  this.schema = options?.schema;
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
 * Clone the current SchemaType
 *
 * @return {DocumentArrayElement} The cloned instance
 * @api private
 */

SchemaDocumentArrayElement.prototype.clone = function() {
  // Preserve `$parentSchemaType` and `Constructor` when cloning.
  const options = Object.assign({}, this.options, {
    $parentSchemaType: this.$parentSchemaType,
    Constructor: this.Constructor
  });
  const schematype = new this.constructor(
    this.path,
    options,
    this.instance,
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
