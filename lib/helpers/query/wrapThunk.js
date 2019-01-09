'use strict';

/*!
 * A query thunk is the function responsible for sending the query to MongoDB,
 * like `Query#_findOne()` or `Query#_execUpdate()`. The `Query#exec()` function
 * calls a thunk. The term "thunk" here is the traditional Node.js definition:
 * a function that takes exactly 1 parameter, a callback.
 *
 * This function defines common behavior for all query thunks.
 */

module.exports = function wrapThunk(fn) {
  return function _wrappedThunk(cb) {
    ++this._executionCount;

    fn.call(this, cb);
  };
};