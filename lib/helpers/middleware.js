'use strict';

const symbols = require('../schema/symbols');

/**
 * Filter predicate that returns true for built-in middleware (marked with `builtInMiddleware` symbol).
 */
const isBuiltInMiddleware = hook => hook.fn[symbols.builtInMiddleware];

/**
 * Determines if middleware should run based on options.
 *
 * @param {Object} options - Options object that may contain `middleware` setting
 * @param {String} phase - Either 'pre' or 'post'
 * @returns {Boolean} - true if middleware should run, false if it should be skipped
 */
function shouldRunMiddleware(options, phase) {
  return options?.middleware?.[phase] ?? options?.middleware ?? true;
}

module.exports = {
  isBuiltInMiddleware,
  shouldRunMiddleware
};
