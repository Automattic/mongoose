'use strict';

const CoreMongooseArray = require('./core_array');

module.exports = function arrayProxy(arr) {
  const proxy = new Proxy(arr, {
    get: function(target, prop) {
      if (prop === 'isMongooseArray' || prop === 'isMongooseArrayProxy') {
        return true;
      }
      if (prop === '__array') {
        return arr;
      }
      if (prop === 'set') {
        return __set;
      }
      if (CoreMongooseArray.prototype.hasOwnProperty(prop)) {
        return CoreMongooseArray.prototype[prop];
      }

      return arr[prop];
    },
    set: function(target, prop, value) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        set(arr, prop, value);
      } else {
        arr[prop] = value;
      }

      return true;
    }
  });

  return proxy;
};

/*!
 * Used as a method by array instances
 */
function __set(i, val, skipModified) {
  const arr = this.__array;
  if (skipModified) {
    arr[i] = val;
    return arr;
  }
  const value = CoreMongooseArray.prototype._cast.call(arr, val, i);
  arr[i] = value;
  CoreMongooseArray.prototype._markModified.call(arr, i);
  return arr;
}

/**
 * Internal `set()` logic for proxies
 */
function set(arr, i, val, skipModified) {
  if (skipModified) {
    arr[i] = val;
    return arr;
  }
  const value = CoreMongooseArray.prototype._cast.call(arr, val, i);
  arr[i] = value;
  CoreMongooseArray.prototype._markModified.call(arr, i);
  return arr;
}