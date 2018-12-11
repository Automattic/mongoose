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
  'updateOne'
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
    if (hook.name === 'updateOne') {
      return hook.query == null || !!hook.query;
    }
    if (hook.name === 'remove') {
      return !!hook.query;
    }
    return true;
  });

  // `update()` thunk has a different name because `_update` was already taken
  Query.prototype._execUpdate = middleware.createWrapper('update',
    Query.prototype._execUpdate, null, kareemOptions);

  applyQueryMiddleware.middlewareFunctions.
    filter(v => v !== 'update').
    forEach(fn => {
      Query.prototype[`_${fn}`] = middleware.createWrapper(fn,
        Query.prototype[`_${fn}`], null, kareemOptions);
    });
}
