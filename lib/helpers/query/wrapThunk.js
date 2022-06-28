'use strict';

const MongooseError = require('../../error/mongooseError');

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
    if (this._executionStack != null) {
      let str = this.toString();
      if (str.length > 60) {
        str = str.slice(0, 60) + '...';
      }
      const err = new MongooseError('Query was already executed: ' + str);
      err.originalStack = this._executionStack.stack;
      return cb(err);
    }
    this._executionStack = new Error();

    fn.call(this, cb);
  };
};
