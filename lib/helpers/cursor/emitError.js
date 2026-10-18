'use strict';

module.exports = function emitError(cursor, error) {
  // Destruction may receive an earlier error after another operation has failed.
  cursor._emittedErrors = cursor._emittedErrors || new Set();
  cursor._emittedErrors.add(error);
  return cursor.emit('error', error);
};
