'use strict';

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
        return function set(i, val, skipModified) {
          if (skipModified) {
            arr[i] = val;
            return arr;
          }
          const value = arr._cast(val, i);
          arr[i] = value;
          arr._markModified(i);
          return arr;
        };
      }

      return target[prop];
    },
    set: function(target, prop, value) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        // console.log('Set', prop, value, new Error().stack);
        target.set(prop, value);
      } else {
        target[prop] = value;
      }

      return true;
    }
  });

  return proxy;
};