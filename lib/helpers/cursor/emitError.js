'use strict';

module.exports = function emitError(cursor, error) {
  // A stream consumer may destroy the cursor with the error we just emitted.
  cursor._emittedError = error;
  return cursor.emit('error', error);
};
