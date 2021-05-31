'use strict';

module.exports = function parentPaths(path) {
  const pieces = path.split('.');
  let cur = '';
  const ret = [];
  for (let i = 0; i < pieces.length; ++i) {
    cur += (cur.length > 0 ? '.' : '') + pieces[i];
    ret.push(cur);
  }

  return ret;
};