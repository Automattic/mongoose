'use strict';

const querySelectorSymbol = Symbol('mongoose#querySelectorSymbol');

exports.querySelectorSymbol = querySelectorSymbol;

exports.querySelector = function querySelector(obj) {
  if (obj == null || typeof obj !== 'object') {
    return obj;
  }
  obj[querySelectorSymbol] = true;
  return obj;
};