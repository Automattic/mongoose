'use strict';

const utils = require('../../utils');

/**
 * Using spread operator on a Mongoose document gives you a
 * POJO that has a tendency to cause infinite recursion. So
 * we use this function on `set()` to prevent that.
 */

module.exports = function handleSpreadDoc(v) {
  if (utils.isPOJO(v) && v.$__ != null && v._doc != null) {
    return v._doc;
  }

  return v;
};