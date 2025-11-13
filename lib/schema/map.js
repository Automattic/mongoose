'use strict';

/*!
 * ignore
 */

const MongooseMap = require('../types/map');
const SchemaMapOptions = require('../options/schemaMapOptions');
const SchemaType = require('../schemaType');
const createJSONSchemaTypeDefinition = require('../helpers/createJSONSchemaTypeDefinition');
const MongooseError = require('../error/mongooseError');
const Schema = require('../schema');
const utils = require('../utils');

/*!
 * ignore
 */

class SchemaMap extends SchemaType {
  constructor(key, options, schemaOptions, parentSchema) {
    super(key, options, 'Map', parentSchema);
    this.$isSchemaMap = true;
    // Create the nested schema type for the map values
    this._createNestedSchemaType(parentSchema, key, options, schemaOptions);
  }

  set(option, value) {
    return SchemaType.set(option, value);
  }

  cast(val, doc, init, prev, options) {
    if (val instanceof MongooseMap) {
      return val;
    }

    const path = this.path;

    if (init) {
      const map = new MongooseMap({}, path, doc, this.$__schemaType, options);

      // Use the map's path for passing to nested casts.
      // If map's parent is a subdocument, use the relative path so nested casts get relative paths.
      const mapPath = map.$__pathRelativeToParent != null ? map.$__pathRelativeToParent : map.$__path;

      if (val instanceof global.Map) {
        for (const key of val.keys()) {
          let _val = val.get(key);
          if (_val == null) {
            _val = map.$__schemaType._castNullish(_val);
          } else {
            _val = map.$__schemaType.cast(_val, doc, true, null, { ...options, path: mapPath + '.' + key });
          }
          map.$init(key, _val);
        }
      } else {
        for (const key of Object.keys(val)) {
          let _val = val[key];
          if (_val == null) {
            _val = map.$__schemaType._castNullish(_val);
          } else {
            _val = map.$__schemaType.cast(_val, doc, true, null, { ...options, path: mapPath + '.' + key });
          }
          map.$init(key, _val);
        }
      }

      return map;
    }

    return new MongooseMap(val, path, doc, this.$__schemaType, options);
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

/*!
 * ignore
 */

SchemaMap.prototype._createNestedSchemaType = function _createNestedSchemaType(schema, path, obj, options) {
  const mapPath = path + '.$*';
  let _mapType = { type: {} };
  if (utils.hasUserDefinedProperty(obj, 'of')) {
    const isInlineSchema = utils.isPOJO(obj.of) &&
      Object.keys(obj.of).length > 0 &&
      !utils.hasUserDefinedProperty(obj.of, schema.options.typeKey);
    if (isInlineSchema) {
      _mapType = { [schema.options.typeKey]: new Schema(obj.of) };
    } else if (utils.isPOJO(obj.of)) {
      _mapType = Object.assign({}, obj.of);
    } else {
      _mapType = { [schema.options.typeKey]: obj.of };
    }

    if (_mapType[schema.options.typeKey] && _mapType[schema.options.typeKey].instanceOfSchema) {
      const subdocumentSchema = _mapType[schema.options.typeKey];
      subdocumentSchema.eachPath((subpath, type) => {
        if (type.options.select === true || type.options.select === false) {
          throw new MongooseError('Cannot use schema-level projections (`select: true` or `select: false`) within maps at path "' + path + '.' + subpath + '"');
        }
      });
    }

    if (utils.hasUserDefinedProperty(obj, 'ref')) {
      _mapType.ref = obj.ref;
    }
  }
  this.$__schemaType = schema.interpretAsType(mapPath, _mapType, options);
};

module.exports = SchemaMap;
