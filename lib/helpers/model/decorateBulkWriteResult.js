'use strict';

module.exports = function decorateBulkWriteResult(resultOrError, validationErrors, results) {
  resultOrError.mongoose = resultOrError.mongoose || {};
  resultOrError.mongoose.validationErrors = validationErrors;
  resultOrError.mongoose.results = results;
  return resultOrError;
};
