'use strict';

module.exports = function getSubdocumentStrictValue(parts, schema) {
  if (parts.length === 1) {
    return undefined;
  }
  let cur = parts[0];
  let strict = undefined;
  for (let i = 0; i < parts.length - 1; ++i) {
    const curSchemaType = schema.path(cur);
    if (curSchemaType && curSchemaType.schema) {
      strict = curSchemaType.schema.options.strict;
      schema = curSchemaType.schema;
      cur = parts[i + 1];
    } else {
      cur += '.' + parts[i + 1];
    }
  }

  return strict;
};
