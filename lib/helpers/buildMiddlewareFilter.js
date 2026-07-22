'use strict';

const isPOJO = require('./isPOJO');
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

/**
 * kareem `getOptions` implementation for custom statics and methods: reads the
 * `middleware` option from the call's trailing plain-object argument.
 *
 * @param {Array} args - Arguments the custom static or method was called with
 * @returns {object} - Per-call kareem options with pre/post filters
 */
function middlewareFiltersFromLastArg(args) {
  const lastArg = args[args.length - 1];
  const options = isPOJO(lastArg) ? lastArg : null;
  return {
    pre: { filter: buildMiddlewareFilter(options, 'pre') },
    post: { filter: buildMiddlewareFilter(options, 'post') }
  };
}

module.exports = {
  buildMiddlewareFilter,
  middlewareFiltersFromLastArg
};
