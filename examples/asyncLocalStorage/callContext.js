
'use strict';

const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

const enter = (contextData) => {
  asyncLocalStorage.enterWith(contextData);
};

const get = (defaultValue) => {
  let obj = asyncLocalStorage.getStore();
  if (!obj && defaultValue) {
    obj = defaultValue;
  }
  return obj;
};

module.exports.enter = enter;
module.exports.get = get;
