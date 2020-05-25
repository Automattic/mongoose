'use strict';

/*!
 * Module dependencies.
 */

const MongooseError = require('./mongooseError');
const get = require('../helpers/get');
const util = require('util');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

class CastError extends MongooseError {
  constructor(type, value, path, reason, schemaType) {
    // If no args, assume we'll `init()` later.
    if (arguments.length > 0) {
      const stringValue = getStringValue(value);
      const messageFormat = getMessageFormat(schemaType);
      const msg = formatMessage(null, type, stringValue, path, messageFormat);
      super(msg);
      this.init(type, value, path, reason, schemaType);
    } else {
      super(formatMessage());
    }
  }

  /*!
   * ignore
   */
  init(type, value, path, reason, schemaType) {
    this.stringValue = getStringValue(value);
    this.messageFormat = getMessageFormat(schemaType);
    this.kind = type;
    this.value = value;
    this.path = path;
    this.reason = reason;
  }

  /*!
   * ignore
   * @param {Readonly<CastError>} other
   */
  copy(other) {
    this.messageFormat = other.messageFormat;
    this.stringValue = other.stringValue;
    this.kind = other.kind;
    this.value = other.value;
    this.path = other.path;
    this.reason = other.reason;
    this.message = other.message;
  }

  /*!
   * ignore
   */
  setModel(model) {
    this.model = model;
    this.message = formatMessage(model, this.kind, this.stringValue, this.path,
      this.messageFormat);
  }
}

Object.defineProperty(CastError.prototype, 'name', {
  value: 'CastError'
});

function getStringValue(value) {
  let stringValue = util.inspect(value);
  stringValue = stringValue.replace(/^'|'$/g, '"');
  if (!stringValue.startsWith('"')) {
    stringValue = '"' + stringValue + '"';
  }
  return stringValue;
}

function getMessageFormat(schemaType) {
  const messageFormat = get(schemaType, 'options.cast', null);
  if (typeof messageFormat === 'string') {
    return messageFormat;
  }
}

/*!
 * ignore
 */

function formatMessage(model, kind, stringValue, path, messageFormat) {
  if (messageFormat != null) {
    let ret = messageFormat.
      replace('{KIND}', kind).
      replace('{VALUE}', stringValue).
      replace('{PATH}', path);
    if (model != null) {
      ret = ret.replace('{MODEL}', model.modelName);
    }

    return ret;
  } else {
    let ret = 'Cast to ' + kind + ' failed for value ' +
      stringValue + ' at path "' + path + '"';
    if (model != null) {
      ret += ' for model "' + model.modelName + '"';
    }

    return ret;
  }
}

/*!
 * exports
 */

module.exports = CastError;
