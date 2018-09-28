'use strict';

const handleTimestampOption = require('../schema/handleTimestampOption');

module.exports = applyTimestampsToChildren;

/*!
 * ignore
 */

function applyTimestampsToChildren(query) {
  const now = query.model.base.now();
  const update = query.getUpdate();
  const keys = Object.keys(update);
  let key;
  const schema = query.model.schema;
  let len;
  let createdAt;
  let updatedAt;
  let timestamps;
  let path;

  const hasDollarKey = keys.length && keys[0].charAt(0) === '$';

  if (hasDollarKey) {
    if (update.$push) {
      for (key in update.$push) {
        const $path = schema.path(key);
        if (update.$push[key] &&
            $path &&
            $path.$isMongooseDocumentArray &&
            $path.schema.options.timestamps) {
          timestamps = $path.schema.options.timestamps;
          createdAt = handleTimestampOption(timestamps, 'createdAt');
          updatedAt = handleTimestampOption(timestamps, 'updatedAt');
          if (update.$push[key].$each) {
            update.$push[key].$each.forEach(function(subdoc) {
              if (updatedAt != null) {
                subdoc[updatedAt] = now;
              }
              if (createdAt != null) {
                subdoc[createdAt] = now;
              }
            });
          } else {
            if (updatedAt != null) {
              update.$push[key][updatedAt] = now;
            }
            if (createdAt != null) {
              update.$push[key][createdAt] = now;
            }
          }
        }
      }
    }
    if (update.$set != null) {
      const keys = Object.keys(update.$set);
      for (key of keys) {
        const keyToSearch = key.replace(/\.\$\./g, '.0.').replace(/\.\$$/, '.0');
        path = schema.path(keyToSearch);
        if (!path) {
          continue;
        }
        if (Array.isArray(update.$set[key]) && path.$isMongooseDocumentArray) {
          len = update.$set[key].length;
          timestamps = schema.path(key).schema.options.timestamps;
          if (timestamps) {
            createdAt = handleTimestampOption(timestamps, 'createdAt');
            updatedAt = handleTimestampOption(timestamps, 'updatedAt');
            for (let i = 0; i < len; ++i) {
              if (updatedAt != null) {
                update.$set[key][i][updatedAt] = now;
              }
              if (createdAt != null) {
                update.$set[key][i][createdAt] = now;
              }
            }
          }
        } else if (update.$set[key] && path.$isSingleNested) {
          timestamps = schema.path(key).schema.options.timestamps;
          if (timestamps) {
            createdAt = handleTimestampOption(timestamps, 'createdAt');
            updatedAt = handleTimestampOption(timestamps, 'updatedAt');
            if (updatedAt != null) {
              update.$set[key][updatedAt] = now;
            }
            if (createdAt != null) {
              update.$set[key][createdAt] = now;
            }
          }
        } else if (path.$parentSchema !== schema && path.$parentSchema != null) {
          const parentPath = path.$parentSchema.$schemaType;

          if (parentPath == null) {
            continue;
          }

          timestamps = parentPath.schema.options.timestamps;
          createdAt = handleTimestampOption(timestamps, 'createdAt');
          updatedAt = handleTimestampOption(timestamps, 'updatedAt');

          if (updatedAt == null) {
            continue;
          }

          if (parentPath.$isSingleNested) {
            // Single nested is easy
            update.$set[parentPath.path + '.' + updatedAt] = now;
            continue;
          }

          let childPath = key.substr(parentPath.path.length + 1);
          const firstDot = childPath.indexOf('.');

          // Shouldn't happen, but if it does ignore this path
          if (firstDot === -1) {
            continue;
          }

          childPath = childPath.substr(0, firstDot);

          update.$set[parentPath.path + '.' + childPath + '.' + updatedAt] = now;
        } else if (path.schema != null && path.schema != schema) {
          timestamps = path.schema.options.timestamps;
          createdAt = handleTimestampOption(timestamps, 'createdAt');
          updatedAt = handleTimestampOption(timestamps, 'updatedAt');

          if (updatedAt != null) {
            update.$set[key][updatedAt] = now;
          }
          if (createdAt != null) {
            update.$set[key][createdAt] = now;
          }
        }
      }
    }
  }
}