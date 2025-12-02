"use strict";

const specialProperties = require('../specialProperties');

/**
 * Casts a sort argument to a MongoDB sort object.
 *
 * @param {Object|String|Array|Map} arg The sort argument.
 * @return {Object} The cast sort object.
 */
module.exports = function castSort(arg) {
  const sort = {};

  if (typeof arg === 'string') {
    const properties = arg.indexOf(' ') === -1 ? [arg] : arg.split(' ');
    for (let property of properties) {
      if (!property) {
        continue;
      }
      const ascend = '-' === property[0] ? -1 : 1;
      if (ascend === -1) {
        property = property.slice(1);
      }
      if (specialProperties.has(property)) {
        continue;
      }
      sort[property] = ascend;
    }
  } else if (Array.isArray(arg)) {
    for (const pair of arg) {
      if (!Array.isArray(pair)) {
        throw new TypeError('Invalid sort() argument, must be array of arrays');
      }
      const key = '' + pair[0];
      if (specialProperties.has(key)) {
        continue;
      }
      sort[key] = _handleSortValue(pair[1], key);
    }
  } else if (typeof arg === 'object' && arg != null && !(arg instanceof Map)) {
    for (const key of Object.keys(arg)) {
      if (specialProperties.has(key)) {
        continue;
      }
      sort[key] = _handleSortValue(arg[key], key);
    }
  } else if (arg instanceof Map) {
    for (let key of arg.keys()) {
      key = '' + key;
      if (specialProperties.has(key)) {
        continue;
      }
      sort[key] = _handleSortValue(arg.get(key), key);
    }
  } else if (arg != null) {
    throw new TypeError('Invalid sort() argument. Must be a string, object, array, or map.');
  }

  return sort;
};

function _handleSortValue(val, key) {
  if (val === 1 || val === 'asc' || val === 'ascending') {
    return 1;
  }
  if (val === -1 || val === 'desc' || val === 'descending') {
    return -1;
  }
  if (val && val.$meta != null) {
    return { $meta: val.$meta };
  }
  throw new TypeError('Invalid sort value: { ' + key + ': ' + val + ' }');
}