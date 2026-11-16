'use strict';

/**
 * Returns `obj[key]` if `key` is an own property of `obj`, `undefined` otherwise.
 *
 * Use this instead of `obj[key]` when `key` may come from user input and `obj`
 * is a plain object lookup table, like `schema.nested` or `schema.virtuals`.
 * Otherwise keys like `toString` or `valueOf` resolve to functions inherited
 * from `Object.prototype`.
 *
 * @param {object} obj
 * @param {string} key
 * @return {any}
 * @api private
 */

module.exports = function getOwnProperty(obj, key) {
  return obj != null && Object.hasOwn(obj, key) ? obj[key] : undefined;
};
