
/*!
 * Module dependencies.
 */

var MongooseError = require('../error');

/*!
 * ElemMatch Error constructor.
 *
 * @inherits MongooseError
 */

function ElemMatchError (paths) {
  var msg = 'Using `document.save()` to update an array which was selected '
          + 'using an $elemMatch projection is not supported. The following '
          + 'path(s) were were selected with an $elemMatch projection:\n'
          + '  ' + paths.join('\n  ') + '\n'
          + 'Use Model.update() to update these arrays instead.'

  MongooseError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ElemMatchError';
};

/*!
 * Inherits from MongooseError.
 */

ElemMatchError.prototype.__proto__ = MongooseError.prototype;

/*!
 * exports
 */

module.exports = ElemMatchError;
