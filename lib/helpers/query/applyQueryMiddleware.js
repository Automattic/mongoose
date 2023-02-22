'use strict';

/*!
 * ignore
 */

module.exports = applyQueryMiddleware;

const validOps = require('./validOps');

/*!
 * ignore
 */

applyQueryMiddleware.middlewareFunctions = validOps.concat([
  'validate'
]);

/**
 * Apply query middleware
 *
 * @param {Query} Query constructor
 * @param {Model} model
 * @api private
 */

function applyQueryMiddleware(Query, model) {
  const queryMiddleware = model.schema.s.hooks.filter(hook => {
    const contexts = _getContexts(hook);
    if (hook.name === 'validate') {
      return !!contexts.query;
    }
    if (hook.name === 'deleteOne' || hook.name === 'updateOne') {
      return !!contexts.query || Object.keys(contexts).length === 0;
    }
    if (hook.query != null || hook.document != null) {
      return !!hook.query;
    }
    return true;
  });

  Query.prototype._queryMiddleware = queryMiddleware;
}

function _getContexts(hook) {
  const ret = {};
  if (hook.hasOwnProperty('query')) {
    ret.query = hook.query;
  }
  if (hook.hasOwnProperty('document')) {
    ret.document = hook.document;
  }
  return ret;
}
