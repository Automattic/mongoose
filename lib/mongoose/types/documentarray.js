
/**
 * Module dependencies.
 */

var MongooseArray = require('./array')
  , driver = global.MONGOOSE_DRIVER_PATH || '../drivers/node-mongodb-native'
  , ObjectId = require(driver + '/objectid')
  , ObjectIdSchema = require('../schema/objectid');

/**
 * Array of embedded documents
 *
 * @param {Object} value to pass to Number
 * @param {Key} key in the owner document
 * @param {Document} owner document
 * @api private
 */

function MongooseDocumentArray (size, key, ownerDoc) {
  MongooseArray.apply(this, arguments);
};

/**
 * Inherits from MongooseArray
 */

MongooseDocumentArray.prototype.__proto__ = MongooseArray.prototype;

/**
 * Adds an item (pushes) and commits the array.
 *
 * @api public
 */

MongooseDocumentArray.prototype.__defineGetter__('isDirty', function () {
  return this.some(function(v){
    return v.isNew || v.willRemove || v.isDirty;
  });
});

/**
 * Filters items by id
 *
 * @param {Object} id
 * @api public
 */

MongooseDocumentArray.prototype.id = function(id) {
  var casted = ObjectIdSchema.prototype.cast.apply(null, id);
  for (var i = 0, l = this.length; i < l; i++)
    if (ObjectId.toString(casted) == ObjectId.toString(this[i]._doc._id))
      return this[i];
};

/**
 * Module exports.
 */

module.exports = MongooseDocumentArray;
