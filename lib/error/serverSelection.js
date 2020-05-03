/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./mongooseError');
const allServersUnknown = require('../helpers/topology/allServersUnknown');
const isAtlas = require('../helpers/topology/isAtlas');

/**
 * MongooseServerSelectionError constructor
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function MongooseServerSelectionError(message) {
  MongooseError.call(this, message);
  this.name = 'MongooseServerSelectionError';
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
}

/*!
 * Inherits from MongooseError.
 */

MongooseServerSelectionError.prototype = Object.create(MongooseError.prototype);
MongooseServerSelectionError.prototype.constructor = MongooseError;

/*!
 * ignore
 */

const atlasMessage = 'Could not connect to any servers in your MongoDB Atlas ' +
  'cluster. Make sure your current IP address is on your Atlas cluster\'s IP ' +
  'whitelist: https://docs.atlas.mongodb.com/security-whitelist/.';

MongooseServerSelectionError.prototype.assimilateError = function(err) {
  const reason = err.reason;
  // Special message for a case that is likely due to IP whitelisting issues.
  const isAtlasWhitelistError = isAtlas(reason) && allServersUnknown(reason);
  this.message = isAtlasWhitelistError ?
    atlasMessage :
    err.message;
  Object.assign(this, err, {
    name: 'MongooseServerSelectionError'
  });

  return this;
};

module.exports = MongooseServerSelectionError;
