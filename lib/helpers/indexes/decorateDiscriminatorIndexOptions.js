'use strict';

module.exports = function decorateDiscriminatorIndexOptions(discriminatorMapping, indexOptions) {
  // If the model is a discriminator and has an index, add a
  // partialFilterExpression by default so the index will only apply
  // to that discriminator.

  const discriminatorValue = discriminatorMapping && discriminatorMapping.value;
  if (discriminatorValue && !('sparse' in indexOptions)) {
    const discriminatorKey = discriminatorMapping.key;
    indexOptions.partialFilterExpression = indexOptions.partialFilterExpression || {};
    indexOptions.partialFilterExpression[discriminatorKey] = discriminatorValue;
  }
  return indexOptions;
};