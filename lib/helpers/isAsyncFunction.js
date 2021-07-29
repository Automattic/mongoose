'use strict';

const { inspect } = require('util');

module.exports = function isAsyncFunction(v) {
  if (typeof v !== 'function') {
    return;
  }

  return inspect(v).startsWith('[AsyncFunction:');
};