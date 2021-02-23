'use strict';

const SanitizeFilterError = require('../../error/sanitizeFilterError');
const hasDollarKeys = require('./hasDollarKeys');

module.exports = function sanitize(filter) {
  if (filter == null || typeof filter !== 'object') {
    return;
  }
  if (Array.isArray(filter)) {
    for (const subfilter of filter) {
      sanitize(subfilter);
    }
    return;
  }

  const filterKeys = Object.keys(filter);
  for (const key of filterKeys) {
    const value = filter[key];
    if (key === '$and' || key === '$or') {
      sanitize(value);
      continue;
    }

    if (hasDollarKeys(value)) {
      throw new SanitizeFilterError(filter, key);
    }
  }
};