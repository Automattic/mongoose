
/*!
 * [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) ObjectId
 * @constructor NodeMongoDbObjectId
 * @see ObjectId
 */

var ObjectId = require('bson').ObjectID;

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

/*!
 * ignore
 */

module.exports = exports = ObjectId;
