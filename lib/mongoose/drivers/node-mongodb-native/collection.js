
/**
 * Module dependencies.
 */

var Collection = require('../../collection')
  , MongoCollection = require('../../../../support/node-mongodb-native').Collection;

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
      if (!this.buffer)
        (function(collection, args){
          // we force a different stack so that errors are not caught by the
          // collection callback
          process.nextTick(function(){
            collection[i].apply(collection, args);
          });
        })(this.collection, arguments);
      else
        this.addQueue(i, arguments);
    };
  })(i);


/**
 * Module exports.
 */

module.exports = NativeCollection;
