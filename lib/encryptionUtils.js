'use strict';

const schemaTypes = require('./schema/index.js');
const SchemaBigInt = require('./schema/bigint');
const SchemaBoolean = require('./schema/boolean');
const SchemaBuffer = require('./schema/buffer');
const SchemaDate = require('./schema/date');
const SchemaDecimal128 = require('./schema/decimal128');
const SchemaDouble = require('./schema/double');
const SchemaInt32 = require('./schema/int32');
const SchemaObjectId = require('./schema/objectId');
const SchemaString = require('./schema/string');

/**
 * Given a schema and a path to a field in the schema, this returns the
 * BSON type of the field, if it can be determined.  This method specifically
 * **only** handles BSON types that are used for CSFLE and QE - any other
 * BSON types will return `null`. (example: MinKey and MaxKey).
 *
 * @param {import('.').Schema} schema
 * @param {string} path
 * @returns {string}
 */
function inferBSONType(schema, path) {
  const type = schema.path(path);

  if (type instanceof SchemaString) {
    return 'string';
  }

  if (type instanceof SchemaInt32) {
    return 'int';
  }

  if (type instanceof SchemaBigInt) {
    return 'long';
  }

  if (type instanceof SchemaBoolean) {
    return 'bool';
  }

  if (type instanceof SchemaDate) {
    return 'date';
  }

  if (type instanceof SchemaBuffer) {
    return 'binData';
  }

  if (type instanceof SchemaObjectId) {
    return 'objectId';
  }

  if (type instanceof SchemaDecimal128) {
    return 'decimal';
  }

  if (type instanceof SchemaDouble) {
    return 'double';
  }

  if (type instanceof schemaTypes.Array) {
    return 'array';
  }

  return null;
}

module.exports = {
  inferBSONType
};
