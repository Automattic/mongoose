'use strict';

const PopulateOptions = require('../../options/populateOptions');
const clone = require('../clone');
const specialProperties = require('../specialProperties');

/*!
 * Deep clone a query's `_mongooseOptions` so a cloned query doesn't share state with the
 * original. `clone()` returns class instances as-is, so explicitly copy `PopulateOptions`,
 * including nested populate: populate options are mutable, and executing a query writes
 * per-execution state like `session` and `lean` into them.
 */

module.exports = function cloneMongooseOptions(mongooseOptions) {
  const { populate, ...rest } = mongooseOptions;
  const ret = clone(rest);
  if (populate != null) {
    ret.populate = {};
    for (const path of Object.keys(populate)) {
      if (specialProperties.has(path)) {
        continue;
      }
      ret.populate[path] = clonePopulate(populate[path]);
    }
  }
  return ret;
};

function clonePopulate(pop) {
  if (Array.isArray(pop)) {
    return pop.map(clonePopulate);
  }
  if (pop == null || typeof pop !== 'object') {
    return pop;
  }

  // Skip `_docs` and `_childDocs`: they hold results of previous executions, see gh-11641
  const { populate, _docs, _childDocs, ...rest } = pop;
  const ret = pop instanceof PopulateOptions ? new PopulateOptions(rest) : clone(rest);
  if (populate !== undefined) {
    ret.populate = clonePopulate(populate);
  }
  return ret;
}
