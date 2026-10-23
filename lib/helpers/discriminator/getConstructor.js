'use strict';

const getDiscriminatorByKey = require('./getDiscriminatorByKey');
const getDiscriminatorByValue = require('./getDiscriminatorByValue');

/**
 * Find the correct constructor, taking into account discriminators
 * @api private
 */

module.exports = function getConstructor(Constructor, value) {
  const discriminatorKey = Constructor.schema.options.discriminatorKey;
  if (value != null &&
      Constructor.discriminators &&
      value[discriminatorKey] != null) {
    const discriminator = getDiscriminatorByKey(Constructor.discriminators, value[discriminatorKey]);
    if (discriminator) {
      Constructor = discriminator;
    } else {
      const constructorByValue = getDiscriminatorByValue(Constructor.discriminators, value[discriminatorKey]);
      if (constructorByValue) {
        Constructor = constructorByValue;
      }
    }
  }

  return Constructor;
};
