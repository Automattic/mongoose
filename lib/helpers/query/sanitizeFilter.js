'use strict';

const MongooseError = require('../../error/mongooseError');
const hasDollarKeys = require('./hasDollarKeys');
const { trustedSymbol } = require('./trusted');

module.exports = function sanitizeFilter(filter) {
  if (filter == null || typeof filter !== 'object') {
    return filter;
  }
  if (Array.isArray(filter)) {
    for (const subfilter of filter) {
      sanitizeFilter(subfilter);
    }
    return filter;
  }

  const filterKeys = Object.keys(filter);
  for (const key of filterKeys) {
    const value = filter[key];
    if (value?.[trustedSymbol]) {
      continue;
    }
    if (key === '$and' || key === '$or' || key === '$nor') {
      sanitizeFilter(value);
      continue;
    } else if (key === '$jsonSchema' || key === '$where' || key === '$expr' || key === '$text') {
      throw new MongooseError(key + ' is not allowed with sanitizeFilter');
    }

    if (hasDollarKeys(value)) {
      const keys = Object.keys(value);
      if (keys.length === 1 && keys[0] === '$eq') {
        continue;
      }
      filter[key] = { $eq: filter[key] };
    }
  }

  return filter;
};
