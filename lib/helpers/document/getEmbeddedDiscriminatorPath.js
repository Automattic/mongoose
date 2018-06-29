'use strict';

const get = require('lodash.get');

/*!
 * Like `schema.path()`, except with a document, because impossible to
 * determine path type without knowing the embedded discriminator key.
 */

module.exports = function getEmbeddedDiscriminatorPath(doc, path, options) {
  options = options || {};
  const typeOnly = options.typeOnly;
  const parts = path.split('.');
  let schema = null;
  let type = 'adhocOrUndefined';

  for (let i = 0; i < parts.length; ++i) {
    const subpath = parts.slice(0, i + 1).join('.');
    schema = doc.schema.path(subpath);
    if (schema == null) {
      continue;
    }
    type = doc.schema.pathType(subpath);
    if ((schema.$isSingleNested || schema.$isMongooseDocumentArrayElement) &&
        schema.schema.discriminators != null) {
      const discriminators = schema.schema.discriminators;
      const discriminatorKey = doc.get(subpath + '.' +
        get(schema, 'schema.options.discriminatorKey'));
      if (discriminatorKey == null || discriminators[discriminatorKey] == null) {
        continue;
      }
      const rest = parts.slice(i + 1).join('.');
      schema = discriminators[discriminatorKey].path(rest);
      if (schema != null) {
        type = discriminators[discriminatorKey].pathType(rest);
        break;
      }
    }
  }

  // Are we getting the whole schema or just the type, 'real', 'nested', etc.
  return typeOnly ? type : schema;
};
