'use strict';

const hasDollarKeys = require('./hasDollarKeys');
const { querySelectorSymbol } = require('./querySelector');

module.exports = function sanitizeFilter(filter) {
  if (filter == null || typeof filter !== 'object') {
    return;
  }
  if (Array.isArray(filter)) {
    for (const subfilter of filter) {
      sanitizeFilter(subfilter);
    }
    return;
  }

  const filterKeys = Object.keys(filter);
  for (const key of filterKeys) {
    const value = filter[key];
    if (value != null && value[querySelectorSymbol]) {
      continue;
    }
    if (key === '$and' || key === '$or') {
      sanitizeFilter(value);
      continue;
    }

    if (hasDollarKeys(value)) {
      const keys = Object.keys(value);
      if (keys.length === 1 && keys[0] === '$eq') {
        continue;
      }
      filter[key] = { $eq: filter[key] };
    }
  }
};