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

    if (schema.nested[cur]) {
      continue;
    }

    if (schema.paths[cur] && schema.paths[cur].schema) {
      schema = schema.paths[cur].schema;
      const rest = parts.slice(i + 1).join('.');

      if (schema.virtuals[rest]) {
        if (i === parts.length - 2) {
          schema.virtuals[rest].$nestedSchemaPath =
            [nestedSchemaPath, cur].filter(v => !!v).join('.');
          return schema.virtuals[rest];
        }
        continue;
      }

      if (i + 1 < parts.length && schema.discriminators) {
        for (const key of Object.keys(schema.discriminators)) {
          const _virtual = getVirtual(schema.discriminators[key], rest);
          if (_virtual != null) {
            _virtual.$nestedSchemaPath = [nestedSchemaPath, cur].
              filter(v => !!v).join('.');
            return _virtual;
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
