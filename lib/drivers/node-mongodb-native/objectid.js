
/*!
 * [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) ObjectId
 * @constructor NodeMongoDbObjectId
 * @see ObjectId
 */

var ObjectId = require('mongodb').BSONPure.ObjectID;

/*!
 * ignore
 */

var ObjectIdToString = ObjectId.toString.bind(ObjectId);
module.exports = exports = ObjectId;

ObjectId.fromString = function(str){
  // patch native driver bug in V0.9.6.4
  if (!('string' === typeof str && 24 === str.length)) {
    throw new Error("Invalid ObjectId");
  }

  return ObjectId.createFromHexString(str);
};

ObjectId.toString = function(oid){
  if (!arguments.length) return ObjectIdToString();
  return oid.toHexString();
};
