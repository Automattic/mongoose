'use strict';

const hasParentPointers = Symbol('Mongoose.helpers.setParentPointers');

/*!
 * Set `$parentSchema` on all schema types, and `$schemaType` on single
 * nested docs.
 *
 * This is a slow path function, should only run when model is compiled
 */

module.exports = function setParentPointers(schema, parentSchemaType) {
  if (schema[hasParentPointers]) {
    return;
  }
  schema[hasParentPointers] = true;
  for (const path of Object.keys(schema.paths)) {
    const schemaType = schema.paths[path];
    if (parentSchemaType != null) {
      Object.defineProperty(schemaType, '$parentSchemaType', {
        configurable: true,
        writable: false,
        enumerable: false,
        value: parentSchemaType
      });
    }
    Object.defineProperty(schemaType, '$parentSchema', {
      configurable: true,
      writable: false,
      enumerable: false,
      value: schema
    });
  }

  for (const path of Object.keys(schema.paths)) {
    const type = schema.paths[path];
    if (type.$isSingleNested || type.$isMongooseDocumentArray) {
      setParentPointers(type.schema, type);
    }
  }
};