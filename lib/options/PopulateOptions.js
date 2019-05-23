'use strict';

const utils = require('../utils');

class PopulateOptions {
  constructor(obj) {
    this._docs = {};

    if (obj == null) {
      return;
    }
    obj = utils.clone(obj);
    Object.assign(this, obj);
    if (typeof obj.subPopulate === 'object') {
      this.populate = obj.subPopulate;
    }
  }
}

/**
 * The connection used to look up models by name. If not specified, Mongoose
 * will default to using the connection associated with the model in
 * `PopulateOptions#model`.
 *
 * @memberOf PopulateOptions
 * @property {Connection} connection
 * @api public
 */

module.exports = PopulateOptions;