'use strict';

module.exports = function sanitizeProjection(projection) {
  if (projection == null) {
    return;
  }

  const keys = Object.keys(projection);
  for (let i = 0; i < keys.length; ++i) {
    const value = projection[keys[i]];
    if (typeof value === 'string') {
      projection[keys[i]] = 1;
      continue;
    }
    if (value == null || typeof value !== 'object') {
      continue;
    }
    // Only allow `$meta: 'textScore'`, `$elemMatch`, and numeric `$slice`. Nested sub-projections, arrays, and
    // expressions like `{ name: { $concat: ['$password'] } }` become `1`. Note that
    // `{ $slice: ['$otherArray', 1] }` is an expression that can read another field, and
    // `$meta: 'indexKey'` and `$meta: 'sortKey'` can return values of `select: false` paths.
    const slice = value.$slice;
    const isAllowedProjectionOperator = value.$meta === 'textScore' ||
      value.$elemMatch != null ||
      typeof slice === 'number' ||
      (Array.isArray(slice) && slice.every(v => typeof v === 'number'));
    if (!isAllowedProjectionOperator) {
      projection[keys[i]] = 1;
    }
  }
};
