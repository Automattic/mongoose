'use strict';

/**
 * Check if middleware should be skipped for a given phase.
 *
 * @param {Object} options - The options object
 * @param {String} phase - Either 'pre' or 'post'
 * @returns {Boolean} - True if middleware should be skipped
 */

module.exports = function shouldSkipMiddleware(options, phase) {
  if (options?.middleware === false) {
    return true;
  }
  if (typeof options?.middleware === 'object') {
    return options.middleware[phase] === false;
  }
  return false;
};
