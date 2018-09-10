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
  'estimatedDocumentCount',
  'find',
  'findOne',
  'findOneAndDelete',
  'findOneAndRemove',
  'findOneAndUpdate',
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

  // `update()` thunk has a different name because `_update` was already taken
  Query.prototype._execUpdate = model.hooks.createWrapper('update',
    Query.prototype._execUpdate, null, kareemOptions);

  applyQueryMiddleware.middlewareFunctions.
    filter(v => v !== 'update').
    forEach(fn => {
      Query.prototype[`_${fn}`] = model.hooks.createWrapper(fn,
        Query.prototype[`_${fn}`], null, kareemOptions);
    });
}
