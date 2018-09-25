'use strict';

/*!
 * Set `$parentSchema` on all schema types, and `$schemaType` on single
 * nested docs
 */

module.exports = function setParentPointers(schema, skipRecursion) {
  for (const path of Object.keys(schema.paths)) {
    const schemaType = schema.paths[path];
    if (schemaType.schema != null) {
      schemaType.schema.$schemaType = schemaType;
    }
    schemaType.$parentSchema = schema;
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