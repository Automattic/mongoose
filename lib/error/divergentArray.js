
/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/*!
 * DivergentArrayError constructor.
 *
 * @inherits MongooseError
 */

function DivergentArrayError (paths) {
  var msg = 'For your own good, using `document.save()` to update an array '
          + 'which was selected using an $elemMatch projection OR '
          + 'populated using skip, limit, query conditions, or exclusion of '
          + 'the _id field when the operation results in a $pop or $set of '
          + 'the entire array is not supported. The following '
          + 'path(s) would have been modified unsafely:\n'
          + '  ' + paths.join('\n  ') + '\n'
          + 'Use Model.update() to update these arrays instead.'
          // TODO write up a docs page (FAQ) and link to it

  MongooseError.call(this, msg);
  Error.captureStackTrace && Error.captureStackTrace(this, arguments.callee);
  this.name = 'DivergentArrayError';
};

/*!
 * Inherits from MongooseError.
 */

DivergentArrayError.prototype = Object.create(MongooseError.prototype);
DivergentArrayError.prototype.constructor = MongooseError;


/*!
 * exports
 */

module.exports = DivergentArrayError;
