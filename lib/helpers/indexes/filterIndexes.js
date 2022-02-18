'use strict';

function filterOutNonDiscriminatorSchemaIndexes(model, schemaIndexes) {
  return filterOutNonDiscriminatorIndexes(model, schemaIndexes, { isSchemaIndexes: true });
}

function filterOutNonDiscriminatorDBIndexes(model, dbIndexes) {
  return filterOutNonDiscriminatorIndexes(model, dbIndexes, { isSchemaIndexes: false });
}

module.exports = {
  filterOutNonDiscriminatorSchemaIndexes,
  filterOutNonDiscriminatorDBIndexes
};

function filterOutNonDiscriminatorIndexes(model, indexes, { isSchemaIndexes }) {
  if (!model.baseModelName) {
    return indexes;
  }
  const discriminatorNameKey = model.schema.discriminatorMapping.key;
  const discriminatorNameValue = model.schema.discriminatorMapping.value;


  return indexes.filter(index => {
    const partialFilterExpression = getPartialFilterExpression(index, { isSchemaIndexes });
    if (!partialFilterExpression) {
      return false;
    }
    return partialFilterExpression[discriminatorNameKey] === discriminatorNameValue;
  });
}

function getPartialFilterExpression(indexObject, { isSchemaIndexes }) {
  if (isSchemaIndexes) {
    return indexObject.options && indexObject.options.partialFilterExpression;
  }
  return indexObject.partialFilterExpression;
}