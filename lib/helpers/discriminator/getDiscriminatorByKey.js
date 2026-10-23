'use strict';

/**
 * Returns the discriminator registered under `key`, ignoring inherited properties
 * like `constructor` or `toString`, because `key` may come from user data.
 *
 * @param {object} discriminators
 * @param {string} key
 * @api private
 */

module.exports = function getDiscriminatorByKey(discriminators, key) {
  if (discriminators == null || key == null) {
    return null;
  }
  return Object.prototype.hasOwnProperty.call(discriminators, key) ? discriminators[key] : null;
};
