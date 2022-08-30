/*!
 * Module requirements
 */

'use strict';

const MongooseError = require('./mongooseError');
const getConstructorName = require('../helpers/getConstructorName');
const util = require('util');

class ValidationError extends MongooseError {
  /**
   * Document Validation Error
   *
   * @api private
   * @param {Document} [instance]
   * @inherits MongooseError
   */
  constructor(instance) {
    let _message;
    if (getConstructorName(instance) === 'model') {
      _message = instance.constructor.modelName + ' validation failed';
    } else {
      _message = 'Validation failed';
    }

    super(_message);

    this.errors = {};
    this._message = _message;

    if (instance) {
      instance.$errors = this.errors;
    }
  }

  /**
   * Console.log helper
   */
  toString() {
    return this.name + ': ' + _generateMessage(this);
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
  * @param {String} path
  * @param {String|Error} error
  * @api private
  */
  addError(path, error) {
    if (error instanceof ValidationError) {
      const { errors } = error;
      for (const errorPath of Object.keys(errors)) {
        this.addError(`${path}.${errorPath}`, errors[errorPath]);
      }

      return;
    }

    this.errors[path] = error;
    this.message = this._message + ': ' + _generateMessage(this);
  }
}


if (util.inspect.custom) {
  // Avoid Node deprecation warning DEP0079
  ValidationError.prototype[util.inspect.custom] = ValidationError.prototype.inspect;
}

/**
 * Helper for JSON.stringify
 * Ensure `name` and `message` show up in toJSON output re: gh-9847
 * @api private
 */
Object.defineProperty(ValidationError.prototype, 'toJSON', {
  enumerable: false,
  writable: false,
  configurable: true,
  value: function() {
    return Object.assign({}, this, { name: this.name, message: this.message });
  }
});


Object.defineProperty(ValidationError.prototype, 'name', {
  value: 'ValidationError'
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

/*!
 * Module exports
 */

module.exports = ValidationError;
