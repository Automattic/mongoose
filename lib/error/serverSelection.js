/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./mongooseError');
const allServersUnknown = require('../helpers/topology/allServersUnknown');
const isAtlas = require('../helpers/topology/isAtlas');

/*!
 * ignore
 */

const atlasMessage = 'Could not connect to any servers in your MongoDB Atlas cluster. ' +
  'One common reason is that you\'re trying to access the database from ' +
  'an IP that isn\'t whitelisted. Make sure your current IP address is on your Atlas ' +
  'cluster\'s IP whitelist: https://docs.atlas.mongodb.com/security-whitelist/';

class MongooseServerSelectionError extends MongooseError {
  /**
   * MongooseServerSelectionError constructor
   *
   * @api private
   */
  assimilateError(err) {
    const reason = err.reason;
    // Special message for a case that is likely due to IP whitelisting issues.
    const isAtlasWhitelistError = isAtlas(reason) && allServersUnknown(reason);
    this.message = isAtlasWhitelistError ?
      atlasMessage :
      err.message;
    for (const key in err) {
      if (key !== 'name') {
        this[key] = err[key];
      }
    }

    return this;
  }
}

Object.defineProperty(MongooseServerSelectionError.prototype, 'name', {
  value: 'MongooseServerSelectionError'
});

module.exports = MongooseServerSelectionError;
