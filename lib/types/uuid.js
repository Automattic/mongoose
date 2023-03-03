/**
 * UUID type constructor
 *
 * #### Example:
 *
 *     const id = new mongoose.Types.UUID;
 *
 * @constructor UUID
 */

'use strict';

const UUID = require('mongodb').BSON.UUID;
const uuidSymbol = require('../helpers/symbols').UUIDSymbol;

/**
 * Getter for convenience with populate, see gh-6115
 * @api private
 */

Object.defineProperty(UUID.prototype, '_uuid', {
  enumerable: false,
  configurable: true,
  get: function() {
    return this;
  }
});

/*!
 * Convenience `valueOf()` to allow comparing uuids using double equals re: gh-7299
 */

if (!UUID.prototype.hasOwnProperty('valueOf')) {
  UUID.prototype.valueOf = function uuidValueOf() {
    return this.toString();
  };
}

UUID.prototype[uuidSymbol] = true;

module.exports = UUID;
