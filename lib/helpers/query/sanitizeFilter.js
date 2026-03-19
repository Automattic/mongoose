'use strict';

const hasDollarKeys = require('./hasDollarKeys');
const isOperator = require('./isOperator');
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
    if (value != null && value[trustedSymbol]) {
      continue;
    }
    if (key === '$and' || key === '$or' || key === '$nor') {
      sanitizeFilter(value);
      continue;
    }

    if (hasDollarKeys(value)) {
      const keys = Object.keys(value);
      if (keys.length === 1 && keys[0] === '$eq') {
        continue;
      }
      filter[key] = { $eq: filter[key] };
    } else if (
      value != null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !isOperator(key)
    ) {
      // Recursively sanitize nested plain objects (e.g. { nested: { pwd: { $ne: null } } })
      sanitizeFilter(value);
    }
  }

  return filter;
};
