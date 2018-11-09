'use strict';

/*!
 * Set `$parentSchema` on all schema types, and `$schemaType` on single
 * nested docs.
 *
 * This is a slow path function, should only run when model is compiled
 */

module.exports = function setParentPointers(schema, skipRecursion) {
  for (const path of Object.keys(schema.paths)) {
    const schemaType = schema.paths[path];
    if (schemaType.schema != null) {
      Object.defineProperty(schemaType.schema, '$schemaType', {
        configurable: true,
        writable: false,
        enumerable: false,
        value: schemaType
      });
    }
    Object.defineProperty(schemaType, '$parentSchema', {
      configurable: true,
      writable: false,
      enumerable: false,
      value: schema
    });
  }

  // `childSchemas` contains all descendant schemas, so no need to recurse
  // further.
  if (skipRecursion) {
    return;
  }

  for (const obj of schema.childSchemas) {
    setParentPointers(obj.schema, true);
  }
};