/*!
 * Module requirements
 */

'use strict';

const MongooseError = require('./mongooseError');
// const getConstructorName = require('../helpers/getConstructorName');
const util = require('util');

class SetOptionError extends MongooseError {
  /**
   * Mongoose.set Error
   *
   * @api private
   * @inherits MongooseError
   */
  constructor() {
    super('');

    this.errors = {};
  }

  /**
   * Console.log helper
   */
  toString() {
    return _generateMessage(this);
  }

  /**
   * inspect helper
   * @api private
   */
  inspect() {
    return Object.assign(new Error(this.message), this);
  }

  /**
  * add message
  * @param {String} key
  * @param {String|Error} error
  * @api private
  */
  addError(key, error) {
    if (error instanceof SetOptionError) {
      const { errors } = error;
      for (const optionKey of Object.keys(errors)) {
        this.addError(optionKey, errors[optionKey]);
      }

      return;
    }

    this.errors[key] = error;
    this.message = _generateMessage(this);
  }
}


if (util.inspect.custom) {
  // Avoid Node deprecation warning DEP0079
  SetOptionError.prototype[util.inspect.custom] = SetOptionError.prototype.inspect;
}

/**
 * Helper for JSON.stringify
 * Ensure `name` and `message` show up in toJSON output re: gh-9847
 * @api private
 */
Object.defineProperty(SetOptionError.prototype, 'toJSON', {
  enumerable: false,
  writable: false,
  configurable: true,
  value: function() {
    return Object.assign({}, this, { name: this.name, message: this.message });
  }
});


Object.defineProperty(SetOptionError.prototype, 'name', {
  value: 'SetOptionError'
});

/*!
 * ignore
 */

function _generateMessage(err) {
  const keys = Object.keys(err.errors || {});
  const len = keys.length;
  const msgs = [];
  let key;

  for (let i = 0; i < len; ++i) {
    key = keys[i];
    if (err === err.errors[key]) {
      continue;
    }
    msgs.push(key + ': ' + err.errors[key].message);
  }

  return msgs.join(', ');
}

class SetOptionInnerError extends MongooseError {
  /**
   * Error for the "errors" array in "SetOptionError" with consistent message
   * @param {String} key
   */
  constructor(key) {
    super(`"${key}" is not a valid option to set`);
  }
}

SetOptionError.SetOptionInnerError = SetOptionInnerError;

/*!
 * Module exports
 */

module.exports = SetOptionError;
