'use strict';

/*!
 * Apply query middleware
 *
 * @param {Query} query constructor
 * @param {Model} model
 */

module.exports = function applyQueryMiddleware(Query, model) {
  const kareemOptions = {
    useErrorHandlers: true,
    numCallbackParams: 1,
    nullResultByDefault: true
  };

  // `update()` thunk has a different name because `_update` was already taken
  Query.prototype._execUpdate = model.hooks.createWrapper('update',
    Query.prototype._execUpdate, null, kareemOptions);

  [
    'count',
    'countDocuments',
    'estimatedDocumentCount',
    'find',
    'findOne',
    'findOneAndDelete',
    'findOneAndRemove',
    'findOneAndUpdate',
    'replaceOne',
    'updateMany',
    'updateOne'
  ].forEach(fn => {
    Query.prototype[`_${fn}`] = model.hooks.createWrapper(fn,
      Query.prototype[`_${fn}`], null, kareemOptions);
  });
};
