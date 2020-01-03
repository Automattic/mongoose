'use strict';

const get = require('../get');

/**
 * Given an update, move all $set on immutable properties to $setOnInsert.
 * No need to check for upserts, because there's no harm in setting
 * $setOnInsert even if `upsert` is false.
 */

module.exports = function moveImmutableProperties(schema, update, ctx) {
  if (update == null) {
    return;
  }

  const keys = Object.keys(update);
  for (const key of keys) {
    const isDollarKey = key.startsWith('$');

    if (key === '$set') {
      const updatedPaths = Object.keys(update[key]);
      for (const path of updatedPaths) {
        _walkUpdatePath(schema, update[key], path, update, ctx);
      }
    } else if (!isDollarKey) {
      _walkUpdatePath(schema, update, key, update, ctx);
    }

  }
};

function _walkUpdatePath(schema, op, path, update, ctx) {
  const schematype = schema.path(path);
  if (schematype == null) {
    return;
  }

  let immutable = get(schematype, 'options.immutable', null);
  if (immutable == null) {
    return;
  }
  if (typeof immutable === 'function') {
    immutable = immutable.call(ctx, ctx);
  }

  if (!immutable) {
    return;
  }

  update.$setOnInsert = update.$setOnInsert || {};
  update.$setOnInsert[path] = op[path];
  delete op[path];
}