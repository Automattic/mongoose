'use strict';

/**
 * Returns `true` if the given index matches the schema's `timestamps` options
 */

module.exports = function isTimeseriesIndex(dbIndex, schemaOptions) {
  if (schemaOptions.timeseries == null) {
    return false;
  }
  const { timeField, metaField } = schemaOptions.timeseries;
  if (typeof timeField !== 'string' || typeof metaField !== 'string') {
    return false;
  }
  return Object.keys(dbIndex.key).length === 2 && dbIndex.key[timeField] === 1 && dbIndex.key[metaField] === 1;
};
