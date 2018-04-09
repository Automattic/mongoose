'use strict';

module.exports = getVirtual;

/*!
 * ignore
 */

function getVirtual(schema, name) {
  if (schema.virtuals[name]) {
    return schema.virtuals[name];
  }
  const parts = name.split('.');
  let cur = '';
  let nestedSchemaPath = '';
  for (let i = 0; i < parts.length; ++i) {
    cur += (cur.length > 0 ? '.' : '') + parts[i];
    if (schema.virtuals[cur]) {
      if (i === parts.length - 1) {
        schema.virtuals[cur].$nestedSchemaPath = nestedSchemaPath;
        return schema.virtuals[cur];
      }
      continue;
    }

    if (schema.paths[cur] && schema.paths[cur].schema) {
      schema = schema.paths[cur].schema;

      if (i === parts.length - 2 && schema.discriminators) {
        // Check for embedded discriminators, don't currently support populating
        // nested virtuals underneath embedded discriminators because that will
        // require substantial refactoring.
        for (let key of Object.keys(schema.discriminators)) {
          const discriminatorSchema = schema.discriminators[key];
          let _cur = parts[i + 1];
          if (discriminatorSchema.virtuals[_cur]) {
            discriminatorSchema.virtuals[_cur].$nestedSchemaPath =
              (nestedSchemaPath.length > 0 ? '.' : '') + cur;
            return discriminatorSchema.virtuals[_cur];
          }
        }
      }

      nestedSchemaPath += (nestedSchemaPath.length > 0 ? '.' : '') + cur;
      cur = '';
      continue;
    }

    return null;
  }
}
