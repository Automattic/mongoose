'use strict';

/*!
 * ignore
 */

const SchemaUnionOptions = require('../options/schemaUnionOptions');
const SchemaType = require('../schemaType');

const firstValueSymbol = Symbol('firstValue');
const castSchemaTypeSymbol = Symbol('mongoose#castSchemaType');

/*!
 * ignore
 */

class Union extends SchemaType {
  constructor(key, options, schemaOptions = {}) {
    super(key, options, 'Union');
    if (!options || !Array.isArray(options.of) || options.of.length === 0) {
      throw new Error('Union schema type requires an array of types');
    }
    this.schemaTypes = options.of.map(obj => options.parentSchema.interpretAsType(key, obj, schemaOptions));

    this.validators.push({
      validator: () => true,
      type: 'union'
    });
  }

  cast(val, doc, init, prev, options) {
    let firstValue = firstValueSymbol;
    let firstSchemaType = null;
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
          if (casted != null && typeof casted === 'object' && casted.$__ != null) {
            casted.$__[castSchemaTypeSymbol] = this.schemaTypes[i];
          }
          return casted;
        }

        if (firstValue === firstValueSymbol) {
          firstValue = casted;
          firstSchemaType = this.schemaTypes[i];
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (firstValue !== firstValueSymbol) {
      // Store which schema type was used for this cast
      if (firstValue != null && typeof firstValue === 'object' && firstValue.$__ != null) {
        firstValue.$__[castSchemaTypeSymbol] = firstSchemaType;
      }
      return firstValue;
    }
    throw lastError;
  }

  // Setters also need to be aware of casting - we need to apply the setters of the entry in the union we choose.
  applySetters(val, doc, init, prev, options) {
    let firstValue = firstValueSymbol;
    let firstSchemaType = null;
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
          if (castedVal != null && typeof castedVal === 'object' && castedVal.$__ != null) {
            castedVal.$__[castSchemaTypeSymbol] = this.schemaTypes[i];
          }
          return castedVal;
        }

        if (firstValue === firstValueSymbol) {
          firstValue = castedVal;
          firstSchemaType = this.schemaTypes[i];
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (firstValue !== firstValueSymbol) {
      if (firstValue != null && typeof firstValue === 'object' && firstValue.$__ != null) {
        firstValue.$__[castSchemaTypeSymbol] = firstSchemaType;
      }
      return firstValue;
    }
    throw lastError;
  }

  clone() {
    const schematype = super.clone();

    schematype.schemaTypes = this.schemaTypes.map(schemaType => schemaType.clone());
    return schematype;
  }

  /**
   * Validates the value against all schema types in the union.
   * The value must successfully validate against at least one schema type.
   *
   * @api private
   */
  doValidate(value, fn, scope, options) {
    if (options && options.skipSchemaValidators) {
      return fn(null);
    }

    SchemaType.prototype.doValidate.call(this, value, function(error) {
      if (error) {
        return fn(error);
      }
      if (value == null) {
        return fn(null);
      }

      // Check if we stored which schema type was used during casting
      if (value && value.$__ && value.$__[castSchemaTypeSymbol]) {
        const schemaType = value.$__[castSchemaTypeSymbol];
        return schemaType.doValidate(value, fn, scope, options);
      }

      if (value && value.schema && value.$__) {
        const subdocSchema = value.schema;
        for (let i = 0; i < this.schemaTypes.length; ++i) {
          const schemaType = this.schemaTypes[i];
          if (schemaType.schema && schemaType.schema === subdocSchema) {
            return schemaType.doValidate(value, fn, scope, options);
          }
        }
      }

      // For primitives, we need to determine which schema type accepts the value by attempting to cast.
      // We can't store metadata on primitives, so we re-cast to find the matching schema type.
      let matchedSchemaType = null;
      for (let i = 0; i < this.schemaTypes.length; ++i) {
        try {
          const casted = this.schemaTypes[i].cast(value, scope, false, null, options);
          if (casted === value) {
            // This schema type accepts the value as-is
            matchedSchemaType = this.schemaTypes[i];
            break;
          }
          if (matchedSchemaType == null) {
            // First schema type that successfully casts the value
            matchedSchemaType = this.schemaTypes[i];
          }
        } catch (error) {
          // This schema type can't cast the value, try the next one
        }
      }

      if (matchedSchemaType) {
        return matchedSchemaType.doValidate(value, fn, scope, options);
      }

      // If no schema type can cast the value, return an error
      return fn(new Error(`Value ${value} does not match any schema type in union`));
    }.bind(this), scope, options);
  }

  /**
   * Synchronously validates the value against all schema types in the union.
   * The value must successfully validate against at least one schema type.
   *
   * @api private
   */
  doValidateSync(value, scope, options) {
    if (!options || !options.skipSchemaValidators) {
      const schemaTypeError = SchemaType.prototype.doValidateSync.call(this, value, scope);
      if (schemaTypeError) {
        return schemaTypeError;
      }
    }

    if (value == null) {
      return;
    }

    // Check if we stored which schema type was used during casting (for subdocuments)
    if (value && value.$__ && value.$__[castSchemaTypeSymbol]) {
      const schemaType = value.$__[castSchemaTypeSymbol];
      return schemaType.doValidateSync(value, scope, options);
    }

    if (value && value.schema && value.$__) {
      const subdocSchema = value.schema;
      for (let i = 0; i < this.schemaTypes.length; ++i) {
        const schemaType = this.schemaTypes[i];
        if (schemaType.schema && schemaType.schema === subdocSchema) {
          return schemaType.doValidateSync(value, scope, options);
        }
      }
    }

    // For primitives, we need to determine which schema type accepts the value by attempting to cast.
    // We can't store metadata on primitives, so we re-cast to find the matching schema type.
    let matchedSchemaType = null;
    for (let i = 0; i < this.schemaTypes.length; ++i) {
      try {
        const casted = this.schemaTypes[i].cast(value, scope, false, null, options);
        if (casted === value) {
          // This schema type accepts the value as-is
          matchedSchemaType = this.schemaTypes[i];
          break;
        }
        if (matchedSchemaType == null) {
          // First schema type that successfully casts the value
          matchedSchemaType = this.schemaTypes[i];
        }
      } catch (error) {
        // This schema type can't cast the value, try the next one
      }
    }

    if (matchedSchemaType) {
      return matchedSchemaType.doValidateSync(value, scope, options);
    }

    // If no schema type can cast the value, return an error
    return new Error(`Value ${value} does not match any schema type in union`);
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
