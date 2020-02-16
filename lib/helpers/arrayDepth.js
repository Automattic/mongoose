'use strict';

module.exports = arrayDepth;

function arrayDepth(arr) {
  if (!Array.isArray(arr)) {
    return { min: 0, max: 0 };
  }
  if (arr.length === 0) {
    return { min: 1, max: 1 };
  }

  const res = arrayDepth(arr[0]);
  for (let i = 1; i < arr.length; ++i) {
    const _res = arrayDepth(arr[i]);
    if (_res.min < res.min) {
      res.min = _res.min;
    }
    if (_res.max > res.max) {
      res.max = _res.max;
    }
  }

  res.min = res.min + 1;
  res.max = res.max + 1;

  return res;
}