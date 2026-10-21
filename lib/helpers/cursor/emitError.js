'use strict';

module.exports = function emitError(cursor, error) {
  // Node will emit the error passed to the destruction callback on its next tick.
  if (error && cursor._destroyErrorToEmit === error) {
    return false;
  }
  // Destruction may receive an earlier error after another operation has failed.
  cursor._emittedErrors = cursor._emittedErrors || new Set();
  cursor._emittedErrors.add(error);
  return cursor.emit('error', error);
};
