'use strict';

/*!
 * ignore
 */

const MongooseMap = require('../types/map');
const SchemaMapOptions = require('../options/schemaMapOptions');
const SchemaType = require('../schemaType');
const createJSONSchemaTypeDefinition = require('../helpers/createJSONSchemaTypeDefinition');

/*!
 * ignore
 */

class SchemaMap extends SchemaType {
  constructor(key, options) {
    super(key, options, 'Map');
    this.$isSchemaMap = true;
  }

  set(option, value) {
    return SchemaType.set(option, value);
  }

  cast(val, doc, init, prev, options) {
    if (val instanceof MongooseMap) {
      return val;
    }

    const path = options?.path ?? this.path;

    if (init) {
      const map = new MongooseMap({}, path, doc, this.$__schemaType);

      if (val instanceof global.Map) {
        for (const key of val.keys()) {
          let _val = val.get(key);
          if (_val == null) {
            _val = map.$__schemaType._castNullish(_val);
          } else {
            _val = map.$__schemaType.cast(_val, doc, true, null, { ...options, path: path + '.' + key });
          }
          map.$init(key, _val);
        }
      } else {
        for (const key of Object.keys(val)) {
          let _val = val[key];
          if (_val == null) {
            _val = map.$__schemaType._castNullish(_val);
          } else {
            _val = map.$__schemaType.cast(_val, doc, true, null, { ...options, path: path + '.' + key });
          }
          map.$init(key, _val);
        }
      }

      return map;
    }

    return new MongooseMap(val, path, doc, this.$__schemaType);
  }

  clone() {
    const schematype = super.clone();

    if (this.$__schemaType != null) {
      schematype.$__schemaType = this.$__schemaType.clone();
    }
    return schematype;
  }

  /**
   * Returns the embedded schema type (i.e. the `.$*` path)
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
    const result = createJSONSchemaTypeDefinition('object', 'object', useBsonType, isRequired);
    result.additionalProperties = embeddedSchemaType.toJSONSchema(options);

    return result;
  }

  autoEncryptionType() {
    return 'object';
  }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaMap.schemaName = 'Map';

SchemaMap.prototype.OptionsConstructor = SchemaMapOptions;

SchemaMap.defaultOptions = {};

module.exports = SchemaMap;
