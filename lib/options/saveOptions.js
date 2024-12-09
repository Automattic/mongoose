'use strict';

const clone = require('../helpers/clone');

class SaveOptions {
  constructor(obj) {
    if (obj == null) {
      return;
    }
    Object.assign(this, clone(obj));
  }
}

SaveOptions.prototype.__subdocs = null;

module.exports = SaveOptions;
