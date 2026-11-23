'use strict';

/**
 * Returns the value of `key` on `obj`'s prototype chain, ignoring any own
 * property `key` on `obj`.
 *
 * Use this to check markers that Mongoose defines on prototypes, like
 * `MongooseMap.prototype.$isMongooseMap`. User data, like parsed JSON, BSON, or
 * query strings, can only set own properties, so it can't spoof these markers.
 * Don't use `obj.constructor.prototype` instead: user data can have an own
 * `constructor` property.
 *
 * Getters on the prototype run with the prototype as `this`, so only use this
 * for data properties.
 *
 * @param {any} obj
 * @param {string} key
 * @return {any}
 * @api private
 */

module.exports = function getInheritedProperty(obj, key) {
  if (obj == null) {
    return undefined;
  }
  const proto = Object.getPrototypeOf(obj);
  return proto == null ? undefined : proto[key];
};
