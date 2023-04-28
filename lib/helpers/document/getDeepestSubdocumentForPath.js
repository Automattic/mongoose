'use strict';

module.exports = function getDeepestSubdocumentForPath(doc, parts, schema) {
  let curPath = parts[0];
  let curSchema = schema;
  let subdoc = doc;
  for (let i = 0; i < parts.length - 1; ++i) {
    const curSchemaType = curSchema.path(curPath);
    if (curSchemaType && curSchemaType.schema) {
      subdoc = subdoc.get(curPath);
      curSchema = curSchemaType.schema;
      curPath = parts[i + 1];
      if (subdoc == null) {
        break;
      }
    } else {
      curPath += '.' + parts[i + 1];
    }
  }

  return subdoc;
};
