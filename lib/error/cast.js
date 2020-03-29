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

function CastError(type, value, path, reason, schemaType) {
  // If no args, assume we'll `init()` later.
  if (arguments.length > 0) {
    this.init(type, value, path, reason, schemaType);
  }

  MongooseError.call(this, this.formatMessage());
  this.name = 'CastError';
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
}

/*!
 * Inherits from MongooseError.
 */

CastError.prototype = Object.create(MongooseError.prototype);
CastError.prototype.constructor = MongooseError;

/*!
 * ignore
 */

CastError.prototype.init = function init(type, value, path, reason, schemaType) {
  let stringValue = util.inspect(value);
  stringValue = stringValue.replace(/^'/, '"').replace(/'$/, '"');
  if (!stringValue.startsWith('"')) {
    stringValue = '"' + stringValue + '"';
  }

  const messageFormat = get(schemaType, 'options.cast', null);
  if (typeof messageFormat === 'string') {
    this.messageFormat = schemaType.options.cast;
  }
  this.stringValue = stringValue;
  this.kind = type;
  this.value = value;
  this.path = path;
  this.reason = reason;
};

/*!
 * ignore
 */

CastError.prototype.copy = function copy(other) {
  this.messageFormat = other.messageFormat;
  this.stringValue = other.stringValue;
  this.kind = other.type;
  this.value = other.value;
  this.path = other.path;
  this.reason = other.reason;
  this.message = other.message;
};

/*!
 * ignore
 */

CastError.prototype.setModel = function(model) {
  this.model = model;
  this.message = this.formatMessage(model);
};

/*!
 * ignore
 */

CastError.prototype.formatMessage = function(model) {
  if (this.messageFormat != null) {
    let ret = this.messageFormat.
      replace('{KIND}', this.kind).
      replace('{VALUE}', this.stringValue).
      replace('{PATH}', this.path);
    if (model != null) {
      ret = ret.replace('{MODEL}', model.modelName);
    }

    return ret;
  } else {
    let ret = 'Cast to ' + this.kind + ' failed for value ' +
      this.stringValue + ' at path "' + this.path + '"';
    if (model != null) {
      ret += ' for model "' + model.modelName + '"';
    }

    return ret;
  }
};

/*!
 * exports
 */

module.exports = CastError;
