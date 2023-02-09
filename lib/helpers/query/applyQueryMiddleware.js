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
  const kareemOptions = {
    useErrorHandlers: true,
    numCallbackParams: 1,
    nullResultByDefault: true
  };

  const middleware = model.hooks.filter(hook => {
    const contexts = _getContexts(hook);
    if (hook.name === 'validate') {
      return !!contexts.query;
    }
    return true;
  });

  // `validate()` doesn't have a thunk because it doesn't execute a query.
  Query.prototype.validate = middleware.createWrapper('validate',
    Query.prototype.validate, null, kareemOptions);
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
