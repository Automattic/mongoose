/**
 * ObjectId type constructor
 *
 * ####Example
 *
 *     var id = new mongoose.Types.ObjectId;
 *
 * @constructor ObjectId
 */

'use strict';

const ObjectId = require('../driver').get().ObjectId;

/*!
 * Getter for convenience with populate, see gh-6115
 */

Object.defineProperty(ObjectId.prototype, '_id', {
  enumerable: false,
  configurable: true,
  get: function() {
    return this;
  }
});

module.exports = ObjectId;
