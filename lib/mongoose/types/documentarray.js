
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
 * @param {Array} values
 * @api private
 */

function MongooseDocumentArray (values) {
  var arr = [];
  arr.__proto__ = MongooseDocumentArray.prototype;
  arr.push.apply(arr, values);
  arr.atomics = [];
  return arr;
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
