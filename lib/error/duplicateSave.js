'use strict';

/*!
 * Module dependencies.
 */

var MongooseError = require('./');

/**
 * DuplicateSave Error constructor.
 *
 * @inherits MongooseError
 * @api private
 */

function DuplicateSaveError(doc) {
  let msg = 'Can\'t save() the same doc multiple times in parallel. Document:';
  MongooseError.call(this, msg + doc.id);
  this.name = 'DuplicateSaveError';
}

/*!
 * Inherits from MongooseError.
 */

DuplicateSaveError.prototype = Object.create(MongooseError.prototype);
DuplicateSaveError.prototype.constructor = MongooseError;

/*!
 * exports
 */

module.exports = DuplicateSaveError;
