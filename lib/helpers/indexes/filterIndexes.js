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
  const discriminatorMapping = model.schema.discriminatorMapping;

  const discriminatorKey = discriminatorMapping && discriminatorMapping.key;
  const discriminatorValue = discriminatorMapping && discriminatorMapping.value;

  const isBaseModel = !model.baseModelName;
  const hasOrIsDiscriminator = discriminatorKey && discriminatorValue;

  if (isBaseModel && !hasOrIsDiscriminator) {
    return indexes;
  } else if (isBaseModel && hasOrIsDiscriminator) {
    return indexes.filter(index => {
      const partialFilterExpression = getPartialFilterExpression(index, { isSchemaIndexes });
      return !partialFilterExpression || !partialFilterExpression[discriminatorKey];
    });
  }

  const result = indexes.filter(index => {
    const partialFilterExpression = getPartialFilterExpression(index, { isSchemaIndexes });
    return partialFilterExpression && partialFilterExpression[discriminatorKey] === discriminatorValue;
  });

  return result;
}

function getPartialFilterExpression(index, { isSchemaIndexes }) {
  if (isSchemaIndexes) {
    const options = index[1];
    return options && options.partialFilterExpression;
  }
  return index.partialFilterExpression;
}
