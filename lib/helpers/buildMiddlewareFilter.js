'use strict';

const symbols = require('../schema/symbols');

/**
 * Filter predicate that returns true for built-in middleware (marked with `builtInMiddleware` symbol).
 */
const isBuiltInMiddleware = hook => hook.fn[symbols.builtInMiddleware];

/**
 * Builds a filter for kareem's execPre/execPost based on middleware options.
 *
 * @param {object} options - Options object that may contain `middleware` setting
 * @param {string} phase - Either 'pre' or 'post'
 * @returns {Function|null} - null runs all middleware, isBuiltInMiddleware skips user middleware
 */
function buildMiddlewareFilter(options, phase) {
  const shouldSkip = options?.middleware === false || options?.middleware?.[phase] === false;
  return shouldSkip ? isBuiltInMiddleware : null;
}

module.exports = {
  buildMiddlewareFilter
};
