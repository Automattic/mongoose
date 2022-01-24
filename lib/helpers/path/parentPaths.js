'use strict';

module.exports = function parentPaths(path) {
  if (path.indexOf('.') === -1) {
    return [path];
  }
  let pos = path.indexOf('.')
  const ret = [];
  let i = 0;
  while (pos !== -1) {
    ret[i++] = (path.substring(0, pos));
    pos = path.indexOf('.', pos + 1);
  }
  ret[i] = path.substring(0);
  return ret;
};