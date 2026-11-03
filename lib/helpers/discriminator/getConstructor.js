'use strict';

const getDiscriminatorByKey = require('./getDiscriminatorByKey');
const getDiscriminatorByValue = require('./getDiscriminatorByValue');

/**
 * Find the correct constructor, taking into account discriminators
 * @api private
 */

module.exports = function getConstructor(Constructor, value, defaultDiscriminatorValue) {
  const discriminatorKey = Constructor.schema.options.discriminatorKey;
  let discriminatorValue = value?.[discriminatorKey];
  if (discriminatorValue == null) {
    discriminatorValue = defaultDiscriminatorValue;
  }
  if (Constructor.discriminators &&
      discriminatorValue != null) {
    const discriminator = getDiscriminatorByKey(Constructor.discriminators, discriminatorValue);
    if (discriminator) {
      Constructor = discriminator;
    } else {
      const constructorByValue = getDiscriminatorByValue(Constructor.discriminators, discriminatorValue);
      if (constructorByValue) {
        Constructor = constructorByValue;
      }
    }
  }

  return Constructor;
};
