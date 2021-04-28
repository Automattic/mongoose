'use strict';

const areDiscriminatorValuesEqual = require('./areDiscriminatorValuesEqual');

/*!
* returns discriminator by discriminatorMapping.value
*
* @param {Model} model
* @param {string} value
*/

module.exports = function getDiscriminatorByValue(model, value) {
  if (!model.discriminators) {
    return null;
  }
  for (const name in model.discriminators) {
    const it = model.discriminators[name];
    if (
      it.schema &&
      it.schema.discriminatorMapping &&
      areDiscriminatorValuesEqual(it.schema.discriminatorMapping.value, value)
    ) {
      return it;
    }
  }
  return null;
};