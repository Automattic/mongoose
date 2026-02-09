'use strict';

const trustedSymbol = Symbol('mongoose#trustedSymbol');

exports.trustedSymbol = trustedSymbol;

exports.trusted = function trusted(obj) {
  if (obj == null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return obj;
  }
  obj[trustedSymbol] = true;
  return obj;
};
