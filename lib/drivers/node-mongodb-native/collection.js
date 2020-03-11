'use strict';

/*!
 * Module dependencies.
 */

const MongooseCollection = require('../../collection');
const MongooseError = require('../../error/mongooseError');
const Collection = require('mongodb').Collection;
const get = require('../../helpers/get');
const sliced = require('sliced');
const stream = require('stream');
const util = require('util');

/**
 * A [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) collection implementation.
 *
 * All methods methods from the [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) driver are copied and wrapped in queue management.
 *
 * @inherits Collection
 * @api private
 */

function NativeCollection(name, options) {
  this.collection = null;
  this.Promise = options.Promise || Promise;
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
  const _this = this;

  // always get a new collection in case the user changed host:port
  // of parent db instance when re-opening the connection.

  if (!_this.opts.capped.size) {
    // non-capped
    callback(null, _this.conn.db.collection(_this.name));
    return _this.collection;
  }

  if (_this.opts.autoCreate === false) {
    _this.collection = _this.conn.db.collection(_this.name);
    return _this.collection;
  }

  // capped
  return _this.conn.db.collection(_this.name, function(err, c) {
    if (err) return callback(err);

    // discover if this collection exists and if it is capped
    _this.conn.db.listCollections({ name: _this.name }).toArray(function(err, docs) {
      if (err) {
        return callback(err);
      }
      const doc = docs[0];
      const exists = !!doc;

      if (exists) {
        if (doc.options && doc.options.capped) {
          callback(null, c);
        } else {
          const msg = 'A non-capped collection exists with the name: ' + _this.name + '\n\n'
              + ' To use this collection as a capped collection, please '
              + 'first convert it.\n'
              + ' http://www.mongodb.org/display/DOCS/Capped+Collections#CappedCollections-Convertingacollectiontocapped';
          err = new Error(msg);
          callback(err);
        }
      } else {
        // create
        const opts = Object.assign({}, _this.opts.capped);
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
 * ignore
 */

const syncCollectionMethods = { watch: true };

/*!
 * Copy the collection methods and make them subject to queues
 */

function iter(i) {
  NativeCollection.prototype[i] = function() {
    const collection = this.collection;
    const args = Array.from(arguments);
    const _this = this;
    const debug = get(_this, 'conn.base.options.debug');
    const lastArg = arguments[arguments.length - 1];

    // If user force closed, queueing will hang forever. See #5664
    if (this.conn.$wasForceClosed) {
      const error = new MongooseError('Connection was force closed');
      if (args.length > 0 &&
          typeof args[args.length - 1] === 'function') {
        args[args.length - 1](error);
        return;
      } else {
        throw error;
      }
    }
    if (this.buffer) {
      if (syncCollectionMethods[i]) {
        throw new Error('Collection method ' + i + ' is synchronous');
      }
      if (typeof lastArg === 'function') {
        this.addQueue(i, args);
        return;
      }
      return new this.Promise((resolve, reject) => {
        this.addQueue(i, [].concat(args).concat([(err, res) => {
          if (err != null) {
            return reject(err);
          }
          resolve(res);
        }]));
      });
    }

    if (debug) {
      if (typeof debug === 'function') {
        debug.apply(_this,
          [_this.name, i].concat(sliced(args, 0, args.length - 1)));
      } else if (debug instanceof stream.Writable) {
        this.$printToStream(_this.name, i, args, debug);
      } else {
        this.$print(_this.name, i, args, typeof debug.color === 'undefined' ? true : debug.color);
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

for (const key of Object.keys(Collection.prototype)) {
  // Janky hack to work around gh-3005 until we can get rid of the mongoose
  // collection abstraction
  const descriptor = Object.getOwnPropertyDescriptor(Collection.prototype, key);
  // Skip properties with getters because they may throw errors (gh-8528)
  if (descriptor.get !== undefined) {
    continue;
  }
  if (typeof Collection.prototype[key] !== 'function') {
    continue;
  }

  iter(key);
}

/**
 * Debug print helper
 *
 * @api public
 * @method $print
 */

NativeCollection.prototype.$print = function(name, i, args, color) {
  const moduleName = color ? '\x1B[0;36mMongoose:\x1B[0m ' : 'Mongoose: ';
  const functionCall = [name, i].join('.');
  const _args = [];
  for (let j = args.length - 1; j >= 0; --j) {
    if (this.$format(args[j]) || _args.length) {
      _args.unshift(this.$format(args[j], color));
    }
  }
  const params = '(' + _args.join(', ') + ')';

  console.info(moduleName + functionCall + params);
};

/**
 * Debug print helper
 *
 * @api public
 * @method $print
 */

NativeCollection.prototype.$printToStream = function(name, i, args, stream) {
  const functionCall = [name, i].join('.');
  const _args = [];
  for (let j = args.length - 1; j >= 0; --j) {
    if (this.$format(args[j]) || _args.length) {
      _args.unshift(this.$format(args[j]));
    }
  }
  const params = '(' + _args.join(', ') + ')';

  stream.write(functionCall + params, 'utf8');
};

/**
 * Formatter for debug print args
 *
 * @api public
 * @method $format
 */

NativeCollection.prototype.$format = function(arg, color) {
  const type = typeof arg;
  if (type === 'function' || type === 'undefined') return '';
  return format(arg, false, color);
};

/*!
 * Debug print helper
 */

function inspectable(representation) {
  const ret = {
    inspect: function() { return representation; }
  };
  if (util.inspect.custom) {
    ret[util.inspect.custom] = ret.inspect;
  }
  return ret;
}
function map(o) {
  return format(o, true);
}
function formatObjectId(x, key) {
  x[key] = inspectable('ObjectId("' + x[key].toHexString() + '")');
}
function formatDate(x, key) {
  x[key] = inspectable('new Date("' + x[key].toUTCString() + '")');
}
function format(obj, sub, color) {
  if (obj && typeof obj.toBSON === 'function') {
    obj = obj.toBSON();
  }
  if (obj == null) {
    return obj;
  }

  const clone = require('../../helpers/clone');
  let x = clone(obj, { transform: false });

  if (x.constructor.name === 'Binary') {
    x = 'BinData(' + x.sub_type + ', "' + x.toString('base64') + '")';
  } else if (x.constructor.name === 'ObjectID') {
    x = inspectable('ObjectId("' + x.toHexString() + '")');
  } else if (x.constructor.name === 'Date') {
    x = inspectable('new Date("' + x.toUTCString() + '")');
  } else if (x.constructor.name === 'Object') {
    const keys = Object.keys(x);
    const numKeys = keys.length;
    let key;
    for (let i = 0; i < numKeys; ++i) {
      key = keys[i];
      if (x[key]) {
        let error;
        if (typeof x[key].toBSON === 'function') {
          try {
            // `session.toBSON()` throws an error. This means we throw errors
            // in debug mode when using transactions, see gh-6712. As a
            // workaround, catch `toBSON()` errors, try to serialize without
            // `toBSON()`, and rethrow if serialization still fails.
            x[key] = x[key].toBSON();
          } catch (_error) {
            error = _error;
          }
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
        } else if (x[key].constructor.name === 'ClientSession') {
          x[key] = inspectable('ClientSession("' +
            get(x[key], 'id.id.buffer', '').toString('hex') + '")');
        } else if (Array.isArray(x[key])) {
          x[key] = x[key].map(map);
        } else if (error != null) {
          // If there was an error with `toBSON()` and the object wasn't
          // already converted to a string representation, rethrow it.
          // Open to better ideas on how to handle this.
          throw error;
        }
      }
    }
  }
  if (sub) {
    return x;
  }

  return util.
    inspect(x, false, 10, color).
    replace(/\n/g, '').
    replace(/\s{2,}/g, ' ');
}

/**
 * Retrieves information about this collections indexes.
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
