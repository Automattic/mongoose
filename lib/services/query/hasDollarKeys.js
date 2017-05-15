'use strict';

module.exports = function(obj) {
  var keys = Object.keys(obj);
  var len = keys.length;
  for (var i = 0; i < len; ++i) {
    if (keys[i].charAt(0) === '$') {
      return true;
    }
  }
  return false;
};
