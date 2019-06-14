'use strict';

/*!
 * Module dependencies.
 */

const MongooseError = require('./mongooseError');
const util = require('util');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function CastError(type, value, path, reason) {
  let stringValue = util.inspect(value);
  stringValue = stringValue.replace(/^'/, '"').replace(/'$/, '"');
  if (!stringValue.startsWith('"')) {
    stringValue = '"' + stringValue + '"';
  }
  MongooseError.call(this, 'Cast to ' + type + ' failed for value ' +
    stringValue + ' at path "' + path + '"');
  this.name = 'CastError';
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.stringValue = stringValue;
  this.kind = type;
  this.value = value;
  this.path = path;
  this.reason = reason;
}

/*!
 * Inherits from MongooseError.
 */

CastError.prototype = Object.create(MongooseError.prototype);
CastError.prototype.constructor = MongooseError;

/*!
 * ignore
 */

CastError.prototype.setModel = function(model) {
  this.model = model;
  this.message = 'Cast to ' + this.kind + ' failed for value ' +
    this.stringValue + ' at path "' + this.path + '"' + ' for model "' +
    model.modelName + '"';
};

/*!
 * exports
 */

module.exports = CastError;
