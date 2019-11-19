'use strict';

/*!
* returns discriminator by discriminatorMapping.value
*
* @param {Model} model
* @param {string} value
*/

module.exports = function getDiscriminatorByValue(model, value) {
  let discriminator = null;
  if (!model.discriminators) {
    return discriminator;
  }
  for (const name in model.discriminators) {
    const it = model.discriminators[name];
    if (
      it.schema &&
     it.schema.discriminatorMapping &&
     it.schema.discriminatorMapping.value == value
    ) {
      discriminator = it;
      break;
    }
  }
  return discriminator;
};