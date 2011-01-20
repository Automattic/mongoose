
/**
 * Module dependencies.
 */

var Collection = require('../../collection')
  , MongoCollection = require('../../../../support/node-mongodb-native/lib/mongodb/').Collection;

/**
 * Native collection
 *
 * @api private
 */

function NativeCollection () {
  Collection.apply(this, arguments);
}

/**
 * Inherit from Collection.
 */

NativeCollection.prototype.__proto__ = Collection.prototype;

/**
 * Called when the connection opens
 *
 * @api private
 */

NativeCollection.prototype.onOpen = function () {
  var self = this;
  this.conn.db.collection(this.name, function(err, collection){
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

NativeCollection.prototype.onClose = function () {
  Collection.prototype.onClose.call(this);
};

/**
 * Copy the collection methods and make them subject to queues
 */

for (var i in MongoCollection.prototype)
  (function(i){
    NativeCollection.prototype[i] = function () {
      // BENCHMARKME: is it worth caching the prototype methods? probably
      if (!this.buffer){
        var collection = this.collection
          , args = arguments;

        process.nextTick(function(){
          collection[i].apply(collection, args);
        });
      } else
        this.addQueue(i, arguments);
    };
  })(i);

/**
 * Override signature of ensureIndex. -native one is not standard.
 *
 * @param {Object} spec
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */

var oldEnsureIndex = NativeCollection.prototype.ensureIndex;

NativeCollection.prototype.ensureIndex = function(fields, options, fn){
  if (options && Object.keys(options).length){
    if (options.unique)
      return oldEnsureIndex.call(fields, true, fn);
    else if (fn)
      fn(new Error('This driver only implements unique indexes'));
  } else {
    oldEnsureIndex.call(fields, undefined, fn);
  }
};

/**
 * Implement getIndexes
 *
 * @param {Function} callback
 * @api private
 */

NativeCollection.prototype.getIndexes = NativeCollection.prototype.indexInformation;

/**
 * Module exports.
 */

module.exports = NativeCollection;
