'use strict';

const once = require('../once');

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
    if (!this.options.suppressExecutionWarning && this._executionCount > 0) {
      printWarning(this);
    }
    ++this._executionCount;

    fn.call(this, cb);
  };
};

const printWarning = once(function printMultipleExecutionWarning(q) {
  const msg = 'You\'re executing query ' + q.model.modelName + '.' +
    q.op + '() ' + (q._executionCount + 1) + ' times. If this is ' +
    'intentional, use ' +
    '`query.setOptions({ suppressExecutionWarning: true })`. See ' +
    'http://bit.ly/mongoose-dup-query';
  console.warn(msg);
});