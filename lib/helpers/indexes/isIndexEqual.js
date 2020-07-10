'use strict';

const get = require('../get');
const utils = require('../../utils');

/**
 * Given a Mongoose index definition (key + options objects) and a MongoDB server
 * index definition, determine if the two indexes are equal.
 *
 * @param {Object} key the Mongoose index spec
 * @param {Object} options the Mongoose index definition's options
 * @param {Object} dbIndex the index in MongoDB as returned by `listIndexes()`
 * @api private
 */

module.exports = function isIndexEqual(key, options, dbIndex) {
  // If these options are different, need to rebuild the index
  const optionKeys = [
    'unique',
    'partialFilterExpression',
    'sparse',
    'expireAfterSeconds',
    'collation'
  ];
  for (const key of optionKeys) {
    if (!(key in options) && !(key in dbIndex)) {
      continue;
    }
    if (key === 'collation') {
      if (options[key] == null || dbIndex[key] == null) {
        return options[key] == null && dbIndex[key] == null;
      }
      const definedKeys = Object.keys(options.collation);
      const schemaCollation = options.collation;
      const dbCollation = dbIndex.collation;
      for (const opt of definedKeys) {
        if (get(schemaCollation, opt) !== get(dbCollation, opt)) {
          return false;
        }
      }
    } else if (!utils.deepEqual(options[key], dbIndex[key])) {
      return false;
    }
  }

  const schemaIndexKeys = Object.keys(key);
  const dbIndexKeys = Object.keys(dbIndex.key);
  if (schemaIndexKeys.length !== dbIndexKeys.length) {
    return false;
  }
  for (let i = 0; i < schemaIndexKeys.length; ++i) {
    if (schemaIndexKeys[i] !== dbIndexKeys[i]) {
      return false;
    }
    if (!utils.deepEqual(key[schemaIndexKeys[i]], dbIndex.key[dbIndexKeys[i]])) {
      return false;
    }
  }

  return true;
};
