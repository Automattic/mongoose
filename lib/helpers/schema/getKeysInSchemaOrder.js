'use strict';

const get = require('../get');

module.exports = function getKeysInSchemaOrder(schema, val, path) {
  const valKeys = Object.keys(val);
  if (valKeys.length <= 1) {
    return valKeys;
  }

  const schemaKeys = path != null ? Object.keys(get(schema.tree, path, {})) : Object.keys(schema.tree);
  const remaining = new Set(valKeys);

  const keys = [];
  for (const key of schemaKeys) {
    if (remaining.delete(key)) {
      keys.push(key);
    }
  }
  for (const key of remaining) {
    keys.push(key);
  }

  return keys;
};
