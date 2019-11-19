'use strict';

const getDiscriminatorByValue = require('./getDiscriminatorByValue');

/*!
 * Find the correct constructor, taking into account discriminators
 */

module.exports = function getConstructor(Constructor, value) {
  const discriminatorKey = Constructor.schema.options.discriminatorKey;
  if (value != null &&
      Constructor.discriminators &&
      value[discriminatorKey] != null) {
    if (Constructor.discriminators[value[discriminatorKey]]) {
      Constructor = Constructor.discriminators[value[discriminatorKey]];
    } else {
      const constructorByValue = getDiscriminatorByValue(Constructor, value[discriminatorKey]);
      if (constructorByValue) {
        Constructor = constructorByValue;
      }
    }
  }

  return Constructor;
};