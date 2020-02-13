'use strict';

const specialKeys = new Set([
  '$ref',
  '$id',
  '$db'
]);

module.exports = function isOperator(path) {
  return path.startsWith('$') && !specialKeys.has(path);
};