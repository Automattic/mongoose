'use strict';

/**
 * Returns the handler for query operator `$conditional` from `handlers`, a
 * SchemaType's `$conditionalHandlers`. Looks through `handlers`' full
 * prototype chain, so custom SchemaTypes can build handlers with
 * `Object.create(SchemaType.prototype.$conditionalHandlers)`, but stops at
 * `Object.prototype` so keys like `valueOf` or `toString` aren't handlers.
 *
 * @param {object} handlers
 * @param {string} $conditional
 * @return {Function|undefined}
 * @api private
 */

module.exports = function getConditionalHandler(handlers, $conditional) {
  for (let obj = handlers; obj != null && obj !== Object.prototype; obj = Object.getPrototypeOf(obj)) {
    if (Object.hasOwn(obj, $conditional)) {
      return obj[$conditional];
    }
  }
  return undefined;
};
