'use strict';

/*!
 * ignore
 */

const SchemaUnionOptions = require('../options/schemaUnionOptions');
const SchemaType = require('../schemaType');

const firstValueSymbol = Symbol('firstValue');

/*!
 * ignore
 */

class Union extends SchemaType {
  /**
   * Create a Union schema type.
   *
   * @param {string} key the path in the schema for this schema type
   * @param {object} options SchemaType-specific options (must have 'of' as array)
   * @param {object} schemaOptions additional options from the schema this schematype belongs to
   * @param {Schema} parentSchema the schema this schematype belongs to
   */
  constructor(key, options, schemaOptions, parentSchema) {
    super(key, options, 'Union', parentSchema);
    if (!Array.isArray(options?.of) || options.of.length === 0) {
      throw new Error('Union schema type requires an array of types');
    }
    this.schemaTypes = options.of.map(obj => parentSchema.interpretAsType(key, obj, schemaOptions));
    this.$isSchemaUnion = true;
  }

  cast(val, doc, init, prev, options) {
    let firstValue = firstValueSymbol;
    let lastError;
    // Loop through each schema type in the union. If one of the schematypes returns a value that is `=== val`, then
    // use `val`. Otherwise, if one of the schematypes casted successfully, use the first successfully casted value.
    // Finally, if none of the schematypes casted successfully, throw the error from the last schema type in the union.
    // The `=== val` check is a workaround to ensure that the original value is returned if it matches one of the schema types,
    // avoiding cases like where numbers are casted to strings or dates even if the schema type is a number.
    for (let i = 0; i < this.schemaTypes.length; ++i) {
      try {
        const casted = this.schemaTypes[i].cast(val, doc, init, prev, options);
        if (casted === val) {
          return casted;
        }
        if (firstValue === firstValueSymbol) {
          firstValue = casted;
        }
      } catch (error) {
        lastError = error;
      }
    }
    if (firstValue !== firstValueSymbol) {
      return firstValue;
    }
    throw lastError;
  }

  // Setters also need to be aware of casting - we need to apply the setters of the entry in the union we choose.
  applySetters(val, doc, init, prev, options) {
    let firstValue = firstValueSymbol;
    let lastError;
    // Loop through each schema type in the union. If one of the schematypes returns a value that is `=== val`, then
    // use `val`. Otherwise, if one of the schematypes casted successfully, use the first successfully casted value.
    // Finally, if none of the schematypes casted successfully, throw the error from the last schema type in the union.
    // The `=== val` check is a workaround to ensure that the original value is returned if it matches one of the schema types,
    // avoiding cases like where numbers are casted to strings or dates even if the schema type is a number.
    for (let i = 0; i < this.schemaTypes.length; ++i) {
      try {
        let castedVal = this.schemaTypes[i]._applySetters(val, doc, init, prev, options);
        if (castedVal == null) {
          castedVal = this.schemaTypes[i]._castNullish(castedVal);
        } else {
          castedVal = this.schemaTypes[i].cast(castedVal, doc, init, prev, options);
        }
        if (castedVal === val) {
          return castedVal;
        }
        if (firstValue === firstValueSymbol) {
          firstValue = castedVal;
        }
      } catch (error) {
        lastError = error;
      }
    }
    if (firstValue !== firstValueSymbol) {
      return firstValue;
    }
    throw lastError;
  }

  async doValidate(value, scope, options) {
    if (options && options.skipSchemaValidators) {
      if (value != null && typeof value.validate === 'function') {
        return value.validate();
      }
      return;
    }

    await super.doValidate(value, scope, options);
    if (value != null && typeof value.validate === 'function') {
      await value.validate();
    }
  }

  doValidateSync(value, scope, options) {
    if (!options || !options.skipSchemaValidators) {
      const schemaTypeError = super.doValidateSync(value, scope, options);
      if (schemaTypeError) {
        return schemaTypeError;
      }
    }
    if (value != null && typeof value.validateSync === 'function') {
      return value.validateSync();
    }
  }

  clone() {
    const schematype = super.clone();

    schematype.schemaTypes = this.schemaTypes.map(schemaType => schemaType.clone());
    return schematype;
  }

  /**
   * Returns this schema type's representation in a JSON schema.
   *
   * @param {object} [options]
   * @param {boolean} [options.useBsonType=false] If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.
   * @returns {object} JSON schema properties
   */
  toJSONSchema(options) {
    const isRequired = this.options.required && typeof this.options.required !== 'function';
    const childOptions = { ...options, _overrideRequired: true };
    const jsonSchemas = this.schemaTypes.map(schemaType => schemaType.toJSONSchema(childOptions));
    if (isRequired) {
      return { anyOf: jsonSchemas };
    }

    return {
      anyOf: [
        options?.useBsonType ? { bsonType: 'null' } : { type: 'null' },
        ...jsonSchemas
      ]
    };
  }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
Union.schemaName = 'Union';

Union.defaultOptions = {};

Union.prototype.OptionsConstructor = SchemaUnionOptions;

module.exports = Union;
