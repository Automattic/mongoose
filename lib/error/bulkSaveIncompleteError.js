/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./mongooseError');


/**
 * If the underwriting `bulkWrite()` for `bulkSave()` succeeded, but wasn't able to update or
 * insert all documents, we throw this error.
 *
 * @api private
 */

class MongooseBulkSaveIncompleteError extends MongooseError {
  constructor(modelName, documents, bulkWriteResult) {
    const matchedCount = bulkWriteResult?.matchedCount ?? 0;
    const insertedCount = bulkWriteResult?.insertedCount ?? 0;
    let preview = documents.map(doc => doc._id).join(', ');
    if (preview.length > 100) {
      preview = preview.slice(0, 100) + '...';
    }

    const numDocumentsNotUpdated = documents.length - matchedCount - insertedCount;
    super(`${modelName}.bulkSave() was not able to update ${numDocumentsNotUpdated} of the given documents due to incorrect version or optimistic concurrency, document ids: ${preview}`);

    this.modelName = modelName;
    this.documents = documents;
    this.bulkWriteResult = bulkWriteResult;
    this.numDocumentsNotUpdated = numDocumentsNotUpdated;
  }
}

Object.defineProperty(MongooseBulkSaveIncompleteError.prototype, 'name', {
  value: 'MongooseBulkSaveIncompleteError'
});

/*!
 * exports
 */

module.exports = MongooseBulkSaveIncompleteError;
