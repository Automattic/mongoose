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
  constructor(key, options, schemaOptions = {}) {
    super(key, options, 'Union');
    if (!options || !Array.isArray(options.of) || options.of.length === 0) {
      throw new Error('Union schema type requires an array of types');
    }
    this.schemaTypes = options.of.map(obj => options.parentSchema.interpretAsType(key, obj, schemaOptions));
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

  clone() {
    const schematype = super.clone();

    schematype.schemaTypes = this.schemaTypes.map(schemaType => schemaType.clone());
    return schematype;
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
