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
        return set;
      }
      if (CoreMongooseArray.prototype.hasOwnProperty(prop)) {
        return CoreMongooseArray.prototype[prop];
      }

      return target[prop];
    },
    set: function(target, prop, value) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        set(prop, value);
      } else {
        target[prop] = value;
      }

      return true;
    }
  });

  function set(i, val, skipModified) {
    if (skipModified) {
      arr[i] = val;
      return arr;
    }
    const value = CoreMongooseArray.prototype._cast.call(arr, val, i);
    arr[i] = value;
    CoreMongooseArray.prototype._markModified.call(arr, i);
    return arr;
  }

  return proxy;
};