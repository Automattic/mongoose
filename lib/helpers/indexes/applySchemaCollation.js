'use strict';

const isTextIndex = require('./isTextIndex');

module.exports = function applySchemaCollation(indexOptions, schemaOptions) {
  if (isTextIndex(indexOptions)) {
    return;
  }

  if (schemaOptions.hasOwnProperty('collation') && !indexOptions.hasOwnProperty('collation')) {
    indexOptions.collation = schemaOptions.collation;
  }
};