'use strict';

const symbols = require('../schema/symbols');

/**
 * Execute Kareem pre hooks, filtering out user-defined middleware based on `options.middleware`.
 * Built-in middleware (marked with `builtInMiddleware` symbol) will always run.
 *
 * @param {Kareem} kareem - The Kareem hooks instance
 * @param {String} hookName - The hook name to execute
 * @param {*} context - The `this` context for hooks
 * @param {Array} args - Arguments to pass to hooks
 * @param {Object} options - Options object that may contain `middleware` setting
 * @returns {Promise<Array>} - The potentially modified arguments
 */
async function execPreWithFilter(kareem, hookName, context, args, options) {
  if (kareem == null) {
    return args;
  }

  const shouldRunMiddleware = options?.middleware?.pre ?? options?.middleware ?? true;
  if (shouldRunMiddleware) {
    return kareem.execPre(hookName, context, args);
  }

  const filteredKareem = kareem.filter(hook => hook.fn[symbols.builtInMiddleware]);
  return filteredKareem.execPre(hookName, context, args);
}

/**
 * Execute Kareem post hooks, filtering out user-defined middleware when `options.middleware` is false.
 * Built-in middleware (marked with `builtInMiddleware` symbol) will always run.
 *
 * @param {Kareem} kareem - The Kareem hooks instance
 * @param {String} hookName - The hook name to execute
 * @param {*} context - The `this` context for hooks
 * @param {Array} args - Arguments to pass to hooks
 * @param {Object} execOptions - Options to pass to execPost (e.g., { error: err })
 * @param {Object} middlewareOptions - Options object that may contain `middleware` setting
 * @returns {Promise<Array>} - The result from post hooks
 */
async function execPostWithFilter(kareem, hookName, context, args, execOptions, middlewareOptions) {
  if (kareem == null) {
    if (execOptions?.error) {
      throw execOptions.error;
    }
    return args;
  }

  const shouldRunMiddleware = middlewareOptions?.middleware?.post ?? middlewareOptions?.middleware ?? true;
  if (shouldRunMiddleware) {
    return kareem.execPost(hookName, context, args, execOptions);
  }

  const filteredKareem = kareem.filter(hook => hook.fn[symbols.builtInMiddleware]);
  return filteredKareem.execPost(hookName, context, args, execOptions);
}


module.exports = {
  execPreWithFilter,
  execPostWithFilter
};
