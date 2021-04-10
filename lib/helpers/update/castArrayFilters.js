'use strict';

const castFilterPath = require('../query/castFilterPath');
const cleanPositionalOperators = require('../schema/cleanPositionalOperators');
const getPath = require('../schema/getPath');
const updatedPathsByArrayFilter = require('./updatedPathsByArrayFilter');

module.exports = function castArrayFilters(query) {
  const arrayFilters = query.options.arrayFilters;
  if (!Array.isArray(arrayFilters)) {
    return;
  }

  const update = query.getUpdate();
  const schema = query.schema;
  const strictQuery = schema.options.strictQuery;

  const updatedPathsByFilter = updatedPathsByArrayFilter(update);

  for (const filter of arrayFilters) {
    if (filter == null) {
      throw new Error(`Got null array filter in ${arrayFilters}`);
    }
    for (const key of Object.keys(filter)) {
      if (filter[key] == null) {
        continue;
      }

      const dot = key.indexOf('.');
      let filterPath = dot === -1 ?
        updatedPathsByFilter[key] + '.0' :
        updatedPathsByFilter[key.substr(0, dot)] + '.0' + key.substr(dot);

      if (filterPath == null) {
        throw new Error(`Filter path not found for ${key}`);
      }

      // If there are multiple array filters in the path being updated, make sure
      // to replace them so we can get the schema path.
      filterPath = cleanPositionalOperators(filterPath);

      const schematype = getPath(schema, filterPath);
      if (schematype == null) {
        if (!strictQuery) {
          return;
        }
        // For now, treat `strictQuery = true` and `strictQuery = 'throw'` as
        // equivalent for casting array filters. `strictQuery = true` doesn't
        // quite work in this context because we never want to silently strip out
        // array filters, even if the path isn't in the schema.
        throw new Error(`Could not find path "${filterPath}" in schema`);
      }
      if (typeof filter[key] === 'object') {
        filter[key] = castFilterPath(query, schematype, filter[key]);
      } else {
        filter[key] = schematype.castForQuery(filter[key]);
      }
    }
  }
};