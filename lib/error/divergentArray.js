
/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./mongooseError');

/**
 * DivergentArrayError constructor.
 * @param {Array<String>} paths
 * @api private
 */

class DivergentArrayError extends MongooseError {

  constructor(paths) {
    const msg = 'For your own good, using `document.save()` to update an array '
            + 'which was selected using an $elemMatch projection OR '
            + 'populated using skip, limit, query conditions, or exclusion of '
            + 'the _id field when the operation results in a $pop or $set of '
            + 'the entire array is not supported. The following '
            + 'path(s) would have been modified unsafely:\n'
            + '  ' + paths.join('\n  ') + '\n'
            + 'Use Model.updateOne() to update these arrays instead. '
            + 'See https://mongoosejs.com/docs/faq.html#divergent-array-error for more information.';
    super(msg);
  }
}

Object.defineProperty(DivergentArrayError.prototype, 'name', {
  value: 'DivergentArrayError'
});

/*!
 * exports
 */

module.exports = DivergentArrayError;
