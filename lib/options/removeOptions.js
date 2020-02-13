'use strict';

const clone = require('../helpers/clone');

class RemoveOptions {
  constructor(obj) {
    if (obj == null) {
      return;
    }
    Object.assign(this, clone(obj));
  }
}

module.exports = RemoveOptions;