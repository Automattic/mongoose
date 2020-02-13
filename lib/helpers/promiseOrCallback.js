'use strict';

const PromiseProvider = require('../promise_provider');

const emittedSymbol = Symbol.for('mongoose:emitted');

module.exports = function promiseOrCallback(callback, fn, ee) {
  if (typeof callback === 'function') {
    return fn(function(error) {
      if (error != null) {
        if (ee != null && ee.listeners('error').length > 0 && !error[emittedSymbol]) {
          error[emittedSymbol] = true;
          ee.emit('error', error);
        }
        try {
          callback(error);
        } catch (error) {
          return process.nextTick(() => {
            throw error;
          });
        }
        return;
      }
      callback.apply(this, arguments);
    });
  }

  const Promise = PromiseProvider.get();

  return new Promise((resolve, reject) => {
    fn(function(error, res) {
      if (error != null) {
        if (ee != null && ee.listeners('error').length > 0 && !error[emittedSymbol]) {
          error[emittedSymbol] = true;
          ee.emit('error', error);
        }
        return reject(error);
      }
      if (arguments.length > 2) {
        return resolve(Array.prototype.slice.call(arguments, 1));
      }
      resolve(res);
    });
  });
};