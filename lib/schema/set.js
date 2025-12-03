'use strict';

/*!
 * ignore
 */

const MongooseSet = require('../types/set');
const SchemaType = require('../schemaType');
const createJSONSchemaTypeDefinition = require('../helpers/createJSONSchemaTypeDefinition');
const MongooseError = require('../error/mongooseError');
const Schema = require('../schema');
const utils = require('../utils');

class SchemaSet extends SchemaType {
  /**
   * Set SchemaType constructor.
   *
   * @param {String} path
   * @param {Object} options
   * @param {Object} schemaOptions
   * @param {Schema} parentSchema
   * @inherits SchemaType
   * @api public
   */

  constructor(key, options, schemaOptions, parentSchema) {
    super(key, options, 'Set', parentSchema);
    this.$isSchemaSet = true;
    // Create the nested schema type for the set values
    this._createNestedSchemaType(parentSchema, key, options, schemaOptions);
  }

  /**
   * Sets a default option for all Set instances.
   *
   * @param {String} option The option you'd like to set the value for
   * @param {Any} value value for option
   * @return {undefined}
   * @function set
   * @api public
   */

  set(option, value) {
    return SchemaType.set(option, value);
  }

  /**
   * Casts to Set
   *
   * @param {Object} value
   * @param {Object} model this value is optional
   * @api private
   */

  cast(val, doc, init, prev, options) {
    if (val instanceof MongooseSet) {
      return val;
    }

    const path = this.path;

    if (init) {
      const set = new MongooseSet(null, path, doc, this, options);

      if (val instanceof Set || Array.isArray(val)) {
        for (const v of val) {
          let _val = v;
          if (this.$__schemaType) {
            _val = this.$__schemaType.cast(_val, doc, true, null, options);
          }
          set.add(_val);
        }
      } else {
        // Single value
        let _val = val;
        if (this.$__schemaType) {
          _val = this.$__schemaType.cast(_val, doc, true, null, options);
        }
        set.add(_val);
      }

      return set;
    }

    return new MongooseSet(val, path, doc, this, options);
  }

  /**
   * Returns the embedded schema type (i.e. the `of` type)
   *
   * @api public
   */

  getEmbeddedSchemaType() {
    return this.$__schemaType;
  }

  /**
   * Returns this schema type's representation in a JSON schema.
   *
   * @param [options]
   * @param [options.useBsonType=false] If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.
   * @returns {Object} JSON schema properties
   */

  toJSONSchema(options) {
    const useBsonType = options?.useBsonType;
    const embeddedSchemaType = this.getEmbeddedSchemaType();

    const isRequired = this.options.required && typeof this.options.required !== 'function';
    const result = createJSONSchemaTypeDefinition('array', 'array', useBsonType, isRequired);
    
    if (embeddedSchemaType) {
      result.items = embeddedSchemaType.toJSONSchema(options);
    }
    result.uniqueItems = true;

    return result;
  }

  _createNestedSchemaType(schema, path, obj, options) {
    let _setType = { type: {} };
    if (utils.hasUserDefinedProperty(obj, 'of')) {
      const isInlineSchema = utils.isPOJO(obj.of) &&
        Object.keys(obj.of).length > 0 &&
        !utils.hasUserDefinedProperty(obj.of, schema.options.typeKey);
      
      if (isInlineSchema) {
        _setType = { [schema.options.typeKey]: new Schema(obj.of) };
      } else if (utils.isPOJO(obj.of)) {
        _setType = Object.assign({}, obj.of);
      } else {
        _setType = { [schema.options.typeKey]: obj.of };
      }

      if (utils.hasUserDefinedProperty(obj, 'ref')) {
        _setType.ref = obj.ref;
      }
    }
    this.$__schemaType = schema.interpretAsType(path, _setType, options);
  }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */

SchemaSet.schemaName = 'Set';

SchemaSet.defaultOptions = {};

module.exports = SchemaSet;
