/*!
 * Module dependencies.
 */

var MongooseCollection = require('../../collection');
var Collection = require('mongodb').Collection;
var utils = require('../../utils');

/**
 * A [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) collection implementation.
 *
 * All methods methods from the [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) driver are copied and wrapped in queue management.
 *
 * @inherits Collection
 * @api private
 */

function NativeCollection() {
  this.collection = null;
  MongooseCollection.apply(this, arguments);
}

/*!
 * Inherit from abstract Collection.
 */

NativeCollection.prototype.__proto__ = MongooseCollection.prototype;

/**
 * Called when the connection opens.
 *
 * @api private
 */

NativeCollection.prototype.onOpen = function() {
  var _this = this;

  // always get a new collection in case the user changed host:port
  // of parent db instance when re-opening the connection.

  if (!_this.opts.capped.size) {
    // non-capped
    callback(null, _this.conn.db.collection(_this.name));
    return _this.collection;
  }

  // capped
  return _this.conn.db.collection(_this.name, function(err, c) {
    if (err) return callback(err);

    // discover if this collection exists and if it is capped
    _this.conn.db.listCollections({name: _this.name}).toArray(function(err, docs) {
      if (err) {
        return callback(err);
      }
      var doc = docs[0];
      var exists = !!doc;

      if (exists) {
        if (doc.options && doc.options.capped) {
          callback(null, c);
        } else {
          var msg = 'A non-capped collection exists with the name: ' + _this.name + '\n\n'
              + ' To use this collection as a capped collection, please '
              + 'first convert it.\n'
              + ' http://www.mongodb.org/display/DOCS/Capped+Collections#CappedCollections-Convertingacollectiontocapped';
          err = new Error(msg);
          callback(err);
        }
      } else {
        // create
        var opts = utils.clone(_this.opts.capped);
        opts.capped = true;
        _this.conn.db.createCollection(_this.name, opts, callback);
      }
    });
  });

  function callback(err, collection) {
    if (err) {
      // likely a strict mode error
      _this.conn.emit('error', err);
    } else {
      _this.collection = collection;
      MongooseCollection.prototype.onOpen.call(_this);
    }
  }
};

/**
 * Called when the connection closes
 *
 * @api private
 */

NativeCollection.prototype.onClose = function(force) {
  MongooseCollection.prototype.onClose.call(this, force);
};

/*!
 * Copy the collection methods and make them subject to queues
 */

function iter(i) {
  NativeCollection.prototype[i] = function() {
    // If user force closed, queueing will hang forever. See #5664
    if (this.opts.$wasForceClosed) {
      return this.conn.db.collection(this.name)[i].apply(collection, args);
    }
    if (this.buffer) {
      this.addQueue(i, arguments);
      return;
    }

    var collection = this.collection;
    var args = arguments;
    var _this = this;
    var debug = _this.conn.base.options.debug;

    if (debug) {
      if (typeof debug === 'function') {
        debug.apply(_this,
          [_this.name, i].concat(utils.args(args, 0, args.length - 1)));
      } else {
        this.$print(_this.name, i, args);
      }
    }

    try {
      return collection[i].apply(collection, args);
    } catch (error) {
      // Collection operation may throw because of max bson size, catch it here
      // See gh-3906
      if (args.length > 0 &&
          typeof args[args.length - 1] === 'function') {
        args[args.length - 1](error);
      } else {
        throw error;
      }
    }
  };
}

for (var i in Collection.prototype) {
  // Janky hack to work around gh-3005 until we can get rid of the mongoose
  // collection abstraction
  try {
    if (typeof Collection.prototype[i] !== 'function') {
      continue;
    }
  } catch (e) {
    continue;
  }

  iter(i);
}

/**
 * Debug print helper
 *
 * @api public
 * @method $print
 */

NativeCollection.prototype.$print = function(name, i, args) {
  var moduleName = '\x1B[0;36mMongoose:\x1B[0m ';
  var functionCall = [name, i].join('.');
  var _args = [];
  for (var j = args.length - 1; j >= 0; --j) {
    if (this.$format(args[j]) || _args.length) {
      _args.unshift(this.$format(args[j]));
    }
  }
  var params = '(' + _args.join(', ') + ')';

  console.error(moduleName + functionCall + params);
};

/**
 * Formatter for debug print args
 *
 * @api public
 * @method $format
 */

NativeCollection.prototype.$format = function(arg) {
  var type = typeof arg;
  if (type === 'function' || type === 'undefined') return '';
  return format(arg);
};

/*!
 * Debug print helper
 */

function map(o) {
  return format(o, true);
}
function formatObjectId(x, key) {
  var representation = 'ObjectId("' + x[key].toHexString() + '")';
  x[key] = {inspect: function() { return representation; }};
}
function formatDate(x, key) {
  var representation = 'new Date("' + x[key].toUTCString() + '")';
  x[key] = {inspect: function() { return representation; }};
}
function format(obj, sub) {
  if (obj && typeof obj.toBSON === 'function') {
    obj = obj.toBSON();
  }
  var x = utils.clone(obj, {transform: false});
  var representation;

  if (x != null) {
    if (x.constructor.name === 'Binary') {
      x = 'BinData(' + x.sub_type + ', "' + x.toString('base64') + '")';
    } else if (x.constructor.name === 'ObjectID') {
      representation = 'ObjectId("' + x.toHexString() + '")';
      x = {inspect: function() { return representation; }};
    } else if (x.constructor.name === 'Date') {
      representation = 'new Date("' + x.toUTCString() + '")';
      x = {inspect: function() { return representation; }};
    } else if (x.constructor.name === 'Object') {
      var keys = Object.keys(x);
      var numKeys = keys.length;
      var key;
      for (var i = 0; i < numKeys; ++i) {
        key = keys[i];
        if (x[key]) {
          if (typeof x[key].toBSON === 'function') {
            x[key] = x[key].toBSON();
          }
          if (x[key].constructor.name === 'Binary') {
            x[key] = 'BinData(' + x[key].sub_type + ', "' +
              x[key].buffer.toString('base64') + '")';
          } else if (x[key].constructor.name === 'Object') {
            x[key] = format(x[key], true);
          } else if (x[key].constructor.name === 'ObjectID') {
            formatObjectId(x, key);
          } else if (x[key].constructor.name === 'Date') {
            formatDate(x, key);
          } else if (Array.isArray(x[key])) {
            x[key] = x[key].map(map);
          }
        }
      }
    }
    if (sub) return x;
  }

  return require('util')
  .inspect(x, false, 10, true)
  .replace(/\n/g, '')
  .replace(/\s{2,}/g, ' ');
}

/**
 * Retreives information about this collections indexes.
 *
 * @param {Function} callback
 * @method getIndexes
 * @api public
 */

NativeCollection.prototype.getIndexes = NativeCollection.prototype.indexInformation;

/*!
 * Module exports.
 */

module.exports = NativeCollection;
