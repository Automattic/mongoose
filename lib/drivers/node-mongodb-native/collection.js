
/*!
 * Module dependencies.
 */

var Collection = require('../../collection')
  , NativeCollection = require('mongodb').Collection
  , STATES = require('../../connectionstate')
  , utils = require('../../utils')
  , assert = require('assert')

/**
 * Native collection
 *
 * @api private
 */

function MongooseCollection () {
  this.collection = null;
  Collection.apply(this, arguments);
};

/*!
 * Inherit from abstract Collection.
 */

MongooseCollection.prototype.__proto__ = Collection.prototype;

/**
 * onOpen
 *
 * Called when the connection opens.
 *
 * @api private
 */

MongooseCollection.prototype.onOpen = function () {
  var self = this;

  if (this.collection) {
    return Collection.prototype.onOpen.call(self);
  }

  if (!self.opts.size) {
    // non-capped
    return self.conn.db.collection(self.name, callback);
  }

  // capped
  return self.conn.db.collection(self.name, function (err, c) {
    if (err) return callback(err);

    // discover if this collection exists and if it is capped
    c.options(function (err, exists) {
      if (err) return callback(err);

      if (exists) {
        if (exists.capped) {
          callback(null, c);
        } else {
          var msg = 'A non-capped collection exists with this name.\n\n'
                  + ' To use this collection as a capped collection, please '
                  + 'first convert it.\n'
                  + ' http://www.mongodb.org/display/DOCS/Capped+Collections#CappedCollections-Convertingacollectiontocapped'
          err = new Error(msg);
          callback(err);
        }
      } else {
        // create
        var opts = utils.clone(self.opts);
        opts.capped = true;
        self.conn.db.createCollection(self.name, opts, callback);
      }
    });
  });

  function callback (err, collection) {
    if (err) {
      // likely a strict mode error
      self.conn.emit('error', err);
    } else {
      self.collection = collection;
      Collection.prototype.onOpen.call(self);
    }
  };
};

/**
 * onClose
 *
 * Called when the connection closes
 *
 * @api private
 */

MongooseCollection.prototype.onClose = function () {
  Collection.prototype.onClose.call(this);
};

/*!
 * Copy the collection methods and make them subject to queues
 */

for (var i in NativeCollection.prototype)
  (function(i){
    MongooseCollection.prototype[i] = function () {
      if (this.buffer) {
        this.addQueue(i, arguments);
        return;
      }

      var collection = this.collection
        , args = arguments
        , self = this
        , debug = self.conn.base.options.debug;

      if (debug) {
        if ('function' === typeof debug) {
          debug.apply(debug
            , [self.name, i].concat(utils.args(args, 0, args.length-1)));
        } else {
          console.error('\x1B[0;36mMongoose:\x1B[0m %s.%s(%s) %s %s %s'
            , self.name
            , i
            , print(args[0])
            , print(args[1])
            , print(args[2])
            , print(args[3]))
        }
      }

      collection[i].apply(collection, args);
    };
  })(i);

/*!
 * Debug print helper
 */

function print (arg) {
  var type = typeof arg;
  if ('function' === type || 'undefined' === type) return '';
  return format(arg);
}

/*!
 * Debug print helper
 */

function format (obj, sub) {
  var x = utils.clone(obj);
  if (x) {
    if ('Binary' === x.constructor.name) {
      x = '[object Buffer]';
    } else if ('Object' === x.constructor.name) {
      var keys = Object.keys(x)
        , i = keys.length
        , key
      while (i--) {
        key = keys[i];
        if (x[key]) {
          if ('Binary' === x[key].constructor.name) {
            x[key] = '[object Buffer]';
          } else if ('Object' === x[key].constructor.name) {
            x[key] = format(x[key], true);
          } else if (Array.isArray(x[key])) {
            x[key] = x[key].map(function (o) {
              return format(o, true)
            });
          }
        }
      }
    }
    if (sub) return x;
  }

  return require('util')
    .inspect(x, false, 10, true)
    .replace(/\n/g, '')
    .replace(/\s{2,}/g, ' ')
}

/**
 * getIndexes
 *
 * Retreives information about this collections
 * indexes.
 *
 * @param {Function} callback
 */

MongooseCollection.prototype.getIndexes =
MongooseCollection.prototype.indexInformation;

/**
 * Module exports.
 */

module.exports = MongooseCollection;
