'use strict';

module.exports = function waitForInitialization(cursor) {
  if (cursor._initializationComplete) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const onInitialized = () => {
      // A casting error can be emitted while cursor creation is still pending.
      if (!cursor._initializationComplete) {
        return;
      }
      cursor.removeListener('cursor', onInitialized);
      cursor.removeListener('error', onInitialized);
      resolve();
    };
    cursor.on('cursor', onInitialized);
    cursor.on('error', onInitialized);
  });
};
