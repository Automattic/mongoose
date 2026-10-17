'use strict';

/*!
 * ignore
 */

const MongooseSet = require('../types/set');
const SchemaSetOptions = require('../options/schemaSetOptions');
const SchemaType = require('../schemaType');
const CastError = SchemaType.CastError;
const MongooseError = require('../error/mongooseError');
const castToNumber = require('./operators/helpers').castToNumber;
const utils = require('../utils');
const util = require('util');

class SchemaSet extends SchemaType {
  /**
   * Set SchemaType constructor. Sets are stored as arrays in MongoDB.
   *
   * @param {string} path
   * @param {object} options
   * @param {object} schemaOptions
   * @param {Schema} parentSchema
   * @inherits SchemaType
   * @api public
   */

  constructor(key, options, schemaOptions, parentSchema) {
    super(key, options, 'Set', parentSchema);
    this.$isSchemaSet = true;
    this._createNestedSchemaType(parentSchema, key, options, schemaOptions);
  }

  /**
   * Casts to Set
   *
   * @param {any} value
   * @param {Document} doc
   * @param {boolean} init
   * @api private
   */

  cast(val, doc, init, prev, options) {
    if (val instanceof MongooseSet) {
      return val;
    }

    const path = options?.path ?? this.path;
    if (!Array.isArray(val) && !(val instanceof Set)) {
      val = [val];
    }

    const set = new MongooseSet(null, path, doc, this.$__schemaType);
    for (const value of val) {
      try {
        set.$init(this.$__schemaType.applySetters(value, doc, init));
      } catch (error) {
        throw new CastError('Set', util.inspect(val), this.path, error, this);
      }
    }

    return set;
  }

  /**
   * Casts values for queries. Like arrays, a single value matches sets that
   * contain that value, and an array or set of values matches the whole set.
   *
   * @param {string} [$conditional]
   * @param {any} val
   * @param {Query} context
   * @api private
   */

  castForQuery($conditional, val, context) {
    if ($conditional != null) {
      const handler = this.$conditionalHandlers[$conditional];
      if (handler == null) {
        // Operators like `$gt` and `$regex` apply to each value in the set
        return this.$__schemaType.castForQuery($conditional, val, context);
      }
      return handler.call(this, val, context);
    }

    if (Array.isArray(val) || val instanceof Set) {
      return Array.from(val, v => this.$__schemaType.castForQuery(null, v, context));
    }
    return this.$__schemaType.castForQuery(null, val, context);
  }

  /**
   * Creates a copy of this set schema type.
   *
   * @api private
   */

  clone() {
    const schematype = super.clone();

    if (this.$__schemaType != null) {
      schematype.$__schemaType = this.$__schemaType.clone();
    }
    return schematype;
  }

  /**
   * Performs validation on the set itself, and then on each of its values.
   *
   * @api private
   */

  async doValidate(value, scope, options) {
    await super.doValidate(value, scope, options);
    if (value == null) {
      return;
    }
    for (const v of value) {
      await this.$__schemaType.doValidate(v, scope, options);
    }
  }

  /**
   * Returns the embedded schema type, the schema type of the set's values.
   *
   * @api public
   */

  getEmbeddedSchemaType() {
    return this.$__schemaType;
  }
}

/**
 * Sets a default option for all Set instances.
 *
 * @param {string} option The option you'd like to set the value for
 * @param {any} value value for option
 * @return {undefined}
 * @function set
 * @static
 * @api public
 */

SchemaSet.set = SchemaType.set;

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */

SchemaSet.schemaName = 'Set';

SchemaSet.prototype.OptionsConstructor = SchemaSetOptions;

SchemaSet.defaultOptions = {};

SchemaSet.prototype.$conditionalHandlers = {
  ...SchemaType.prototype.$conditionalHandlers,
  $size: castToNumber
};

/*!
 * ignore
 */

SchemaSet.prototype._createNestedSchemaType = function _createNestedSchemaType(schema, path, obj, options) {
  let _setType = { type: {} };
  if (utils.hasUserDefinedProperty(obj, 'of')) {
    if (utils.isPOJO(obj.of) && utils.hasOwnKeys(obj.of) && !utils.hasUserDefinedProperty(obj.of, schema.options.typeKey)) {
      throw new MongooseError('Sets do not support subdocuments, got an object for `of` at path "' + path + '"');
    }
    _setType = utils.isPOJO(obj.of) ? Object.assign({}, obj.of) : { [schema.options.typeKey]: obj.of };
  }

  const schemaType = schema.interpretAsType(path, _setType, options);
  if (schemaType.$isSingleNested || schemaType.$isMongooseArray || schemaType.$isSchemaMap || schemaType.$isSchemaSet) {
    throw new MongooseError('Sets do not support subdocuments, arrays, maps, or sets as values at path "' + path + '"');
  }
  this.$__schemaType = schemaType;
};

module.exports = SchemaSet;
