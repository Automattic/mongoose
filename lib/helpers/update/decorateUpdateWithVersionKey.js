'use strict';

/**
 * Decorate the update with a version key, if necessary
 * @api private
 */

module.exports = function decorateUpdateWithVersionKey(update, options, versionKey) {
  if (!versionKey || !(options && options.upsert || false)) {
    return;
  }

  if (options.overwrite) {
    if (!hasKey(update, versionKey)) {
      update[versionKey] = 0;
    }
  } else if (
    !hasKey(update, versionKey) &&
    !hasKey(update?.$set, versionKey) &&
    !hasKey(update?.$inc, versionKey) &&
    !hasKey(update?.$setOnInsert, versionKey)
  ) {
    if (!update.$setOnInsert) {
      update.$setOnInsert = {};
    }
    update.$setOnInsert[versionKey] = 0;
  }
};

function hasKey(obj, key) {
  if (obj == null || typeof obj !== 'object') {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(obj, key);
}
