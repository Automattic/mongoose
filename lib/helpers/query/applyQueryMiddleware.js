'use strict';

/*!
 * ignore
 */

module.exports = applyQueryMiddleware;

/*!
 * ignore
 */

applyQueryMiddleware.middlewareFunctions = [
  'count',
  'countDocuments',
  'deleteMany',
  'deleteOne',
  'distinct',
  'estimatedDocumentCount',
  'find',
  'findOne',
  'findOneAndDelete',
  'findOneAndRemove',
  'findOneAndReplace',
  'findOneAndUpdate',
  'remove',
  'replaceOne',
  'update',
  'updateMany',
  'updateOne',
  'validate'
];

/*!
 * Apply query middleware
 *
 * @param {Query} query constructor
 * @param {Model} model
 */

function applyQueryMiddleware(Query, model) {
  const kareemOptions = {
    useErrorHandlers: true,
    numCallbackParams: 1,
    nullResultByDefault: true
  };

  const middleware = model.hooks.filter(hook => {
    const contexts = _getContexts(hook);
    if (hook.name === 'updateOne') {
      return contexts.query == null || !!contexts.query;
    }
    if (hook.name === 'deleteOne') {
      return !!contexts.query || Object.keys(contexts).length === 0;
    }
    if (hook.name === 'validate' || hook.name === 'remove') {
      return !!contexts.query;
    }
    if (hook.query != null || hook.document != null) {
      return !!hook.query;
    }
    return true;
  });

  // `update()` thunk has a different name because `_update` was already taken
  Query.prototype._execUpdate = middleware.createWrapper('update',
    Query.prototype._execUpdate, null, kareemOptions);
  // `distinct()` thunk has a different name because `_distinct` was already taken
  Query.prototype.__distinct = middleware.createWrapper('distinct',
    Query.prototype.__distinct, null, kareemOptions);

  // `validate()` doesn't have a thunk because it doesn't execute a query.
  Query.prototype.validate = middleware.createWrapper('validate',
    Query.prototype.validate, null, kareemOptions);

  applyQueryMiddleware.middlewareFunctions.
    filter(v => v !== 'update' && v !== 'distinct' && v !== 'validate').
    forEach(fn => {
      Query.prototype[`_${fn}`] = middleware.createWrapper(fn,
        Query.prototype[`_${fn}`], null, kareemOptions);
    });
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