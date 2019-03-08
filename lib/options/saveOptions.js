'use strict';

const utils = require('../utils');

class SaveOptions {
  constructor(obj) {
    if (obj == null) {
      return;
    }
    Object.assign(this, utils.clone(obj));
  }
}

module.exports = SaveOptions;