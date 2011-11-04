
/**
 * Module dependencies.
 */

var Collection = require('../../collection')
  , NativeCollection = require('mongodb').Collection;

/**
 * Native collection
 *
 * @api private
 */

function MongooseCollection () {
  Collection.apply(this, arguments);
};

/**
 * Inherit from abstract Collection.
 */

MongooseCollection.prototype.__proto__ = Collection.prototype;

/**
 * Called when the connection opens
 *
 * @api private
 */

MongooseCollection.prototype.onOpen = function () {
  var self = this;
  this.conn.db.collection(this.name, function (err, collection) {
    // TODO handle err
    if (!err){
      self.collection = collection;
      Collection.prototype.onOpen.call(self);
    }
  });
};

/**
 * Called when the connection closes
 *
 * @api private
 */

MongooseCollection.prototype.onClose = function () {
  Collection.prototype.onClose.call(this);
};

/**
 * Copy the collection methods and make them subject to queues
 */

for (var i in NativeCollection.prototype)
  (function(i){
    MongooseCollection.prototype[i] = function () {
      // BENCHMARKME: is it worth caching the prototype methods? probably
      if (!this.buffer){
        var collection = this.collection
          , args = arguments
          , self = this;

        process.nextTick(function(){
          collection[i].apply(collection, args);
        });
      } else {
        this.addQueue(i, arguments);
      }
    };
  })(i);

/**
 * Implement getIndexes
 *
 * @param {Function} callback
 * @api private
 */

MongooseCollection.prototype.getIndexes =
MongooseCollection.prototype.indexInformation;

/**
 * Override signature of ensureIndex. -native one is not standard.
 *
 * @param {Object} spec
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */

var oldEnsureIndex = NativeCollection.prototype.ensureIndex;

function noop () {};

NativeCollection.prototype.ensureIndex = function(fields, options, fn){
  if (!this.buffer) {
    return oldEnsureIndex.apply(this, arguments);
  }
};

/**
 * Module exports.
 */

module.exports = MongooseCollection;
