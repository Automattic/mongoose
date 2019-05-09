'use strict';

const utils = require('../utils');

class RemoveOptions {
  constructor(obj) {
    if (obj == null) {
      return;
    }
    Object.assign(this, utils.clone(obj));
  }
}

module.exports = RemoveOptions;