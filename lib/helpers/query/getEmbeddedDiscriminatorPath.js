'use strict';

const cleanPositionalOperators = require('../schema/cleanPositionalOperators');
const get = require('../get');

/*!
 * Like `schema.path()`, except with a document, because impossible to
 * determine path type without knowing the embedded discriminator key.
 */

module.exports = function getEmbeddedDiscriminatorPath(schema, update, filter, path) {
  const parts = path.split('.');
  let schematype = null;
  let type = 'adhocOrUndefined';

  filter = filter || {};
  update = update || {};

  for (let i = 0; i < parts.length; ++i) {
    const subpath = cleanPositionalOperators(parts.slice(0, i + 1).join('.'));
    schematype = schema.path(subpath);
    if (schematype == null) {
      continue;
    }

    type = schema.pathType(subpath);
    if ((schematype.$isSingleNested || schematype.$isMongooseDocumentArrayElement) &&
        schematype.schema.discriminators != null) {
      const discriminators = schematype.schema.discriminators;
      const key = get(schematype, 'schema.options.discriminatorKey');
      const discriminatorValuePath = subpath + '.' + key;
      const discriminatorFilterPath =
        discriminatorValuePath.replace(/\.\d+\./, '.');
      let discriminatorKey = null;

      if (discriminatorValuePath in filter) {
        discriminatorKey = filter[discriminatorValuePath];
      }
      if (discriminatorFilterPath in filter) {
        discriminatorKey = filter[discriminatorFilterPath];
      }
      const wrapperPath = subpath.replace(/\.\d+$/, '');
      if (schematype.$isMongooseDocumentArrayElement &&
          get(filter[wrapperPath], '$elemMatch.' + key) != null) {
        discriminatorKey = filter[wrapperPath].$elemMatch[key];
      }

      if (discriminatorKey == null || discriminators[discriminatorKey] == null) {
        continue;
      }
      const rest = parts.slice(i + 1).join('.');
      schematype = discriminators[discriminatorKey].path(rest);
      if (schematype != null) {
        type = discriminators[discriminatorKey]._getPathType(rest);
        break;
      }
    }
  }

  return { type: type, schematype: schematype };
};
