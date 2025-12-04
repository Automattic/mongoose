'use strict';

const isTextIndex = require('./isTextIndex');

module.exports = function applySchemaCollation(indexKeys, indexOptions, schemaOptions) {
  if (isTextIndex(indexKeys)) {
    return;
  }

  if (Object.hasOwn(schemaOptions, 'collation') && !Object.hasOwn(indexOptions, 'collation')) {
    indexOptions.collation = schemaOptions.collation;
  }
};
