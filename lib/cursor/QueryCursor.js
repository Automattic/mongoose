/*!
 * Module dependencies.
 */

var PromiseProvider = require('../promise_provider');
var Readable = require('stream').Readable;
var helpers = require('../queryhelpers');
var util = require('util');

/**
 * A QueryCursor is a concurrency primitive for processing query results
 * one document at a time. A QueryCursor fulfills the [Node.js streams3 API](https://strongloop.com/strongblog/whats-new-io-js-beta-streams3/),
 * in addition to several other mechanisms for loading documents from MongoDB
 * one at a time.
 *
 * QueryCursors execute the model's pre find hooks, but **not** the model's
 * post find hooks.
 *
 * Unless you're an advanced user, do **not** instantiate this class directly.
 * Use [`Query#cursor()`](/docs/api.html#query_Query-cursor) instead.
 *
 * @param {Query} query
 * @param {Object} options query options passed to `.find()`
 * @inherits Readable
 * @event `cursor`: Emitted when the cursor is created
 * @event `error`: Emitted when an error occurred
 * @event `data`: Emitted when the stream is flowing and the next doc is ready
 * @event `end`: Emitted when the stream is exhausted
 * @api public
 */

function QueryCursor(query, options) {
  Readable.call(this, { objectMode: true });

  this.cursor = null;
  this.query = query;
  this._transforms = options.transform ? [options.transform] : [];
  var _this = this;
  var model = query.model;
  model.hooks.execPre('find', query, function() {
    model.collection.find(query._conditions, options, function(err, cursor) {
      if (_this._error) {
        cursor.close(function() {});
        _this.listeners('error').length > 0 && _this.emit('error', _this._error);
      }
      if (err) {
        return _this.emit('error', err);
      }
      _this.cursor = cursor;
      _this.emit('cursor', cursor);
    });
  });
}

util.inherits(QueryCursor, Readable);

/*!
 * Necessary to satisfy the Readable API
 */

QueryCursor.prototype._read = function() {
  var _this = this;
  _next(this, function(error, doc) {
    if (error) {
      return _this.emit('error', error);
    }
    if (!doc) {
      _this.push(null);
      _this.cursor.close(function(error) {
        if (error) {
          return _this.emit('error', error);
        }
        setTimeout(function() {
          _this.emit('close');
        }, 0);
      });
      return;
    }
    _this.push(doc);
  });
};

/**
 * Registers a transform function which subsequently maps documents retrieved
 * via the streams interface or `.next()`
 *
 * ####Example
 *
 *     // Map documents returned by `data` events
 *     Thing.
 *       find({ name: /^hello/ }).
 *       cursor().
 *       map(function (doc) {
 *        doc.foo = "bar";
 *        return doc;
 *       })
 *       on('data', function(doc) { console.log(doc.foo); });
 *
 *     // Or map documents returned by `.next()`
 *     var cursor = Thing.find({ name: /^hello/ }).
 *       cursor().
 *       map(function (doc) {
 *         doc.foo = "bar";
 *         return doc;
 *       });
 *     cursor.next(function(error, doc) {
 *       console.log(doc.foo);
 *     });
 *
 * @param {Function} fn
 * @return {QueryCursor}
 * @api public
 * @method map
 */

QueryCursor.prototype.map = function(fn) {
  this._transforms.push(fn);
  return this;
};

/*!
 * Marks this cursor as errored
 */

QueryCursor.prototype._markError = function(error) {
  this._error = error;
  return this;
};

/**
 * Marks this cursor as closed. Will stop streaming and subsequent calls to
 * `next()` will error.
 *
 * @param {Function} callback
 * @return {Promise}
 * @api public
 * @method close
 * @emits close
 * @see MongoDB driver cursor#close http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#close
 */

QueryCursor.prototype.close = function(callback) {
  var Promise = PromiseProvider.get();
  var _this = this;
  return new Promise.ES6(function(resolve, reject) {
    _this.cursor.close(function(error) {
      if (error) {
        callback && callback(error);
        reject(error);
        return _this.listeners('error').length > 0 &&
          _this.emit('error', error);
      }
      _this.emit('close');
      resolve();
      callback && callback();
    });
  });
};

/**
 * Get the next document from this cursor. Will return `null` when there are
 * no documents left.
 *
 * @param {Function} callback
 * @return {Promise}
 * @api public
 * @method next
 */

QueryCursor.prototype.next = function(callback) {
  var Promise = PromiseProvider.get();
  var _this = this;
  return new Promise.ES6(function(resolve, reject) {
    _next(_this, function(error, doc) {
      if (error) {
        callback && callback(error);
        return reject(error);
      }
      callback && callback(null, doc);
      resolve(doc);
    });
  });
};

/**
 * Execute `fn` for every document in the cursor. If `fn` returns a promise,
 * will wait for the promise to resolve before iterating on to the next one.
 * Returns a promise that resolves when done.
 *
 * @param {Function} fn
 * @param {Function} [callback] executed when all docs have been processed
 * @return {Promise}
 * @api public
 * @method eachAsync
 */

QueryCursor.prototype.eachAsync = function(fn, callback) {
  var Promise = PromiseProvider.get();
  var _this = this;

  var handleNextResult = function(doc, callback) {
    var promise = fn(doc);
    if (promise && typeof promise.then === 'function') {
      promise.then(
        function() { callback(null); },
        function(error) { callback(error); });
    } else {
      callback(null);
    }
  };

  var iterate = function(callback) {
    return _next(_this, function(error, doc) {
      if (error) {
        return callback(error);
      }
      if (!doc) {
        return callback(null);
      }
      handleNextResult(doc, function(error) {
        if (error) {
          return callback(error);
        }
        // Make sure to clear the stack re: gh-4697
        setTimeout(function() {
          iterate(callback);
        }, 0);
      });
    });
  };

  return new Promise.ES6(function(resolve, reject) {
    iterate(function(error) {
      if (error) {
        callback && callback(error);
        return reject(error);
      }
      callback && callback(null);
      return resolve();
    });
  });
};

/*!
 * Get the next doc from the underlying cursor and mongooseify it
 * (populate, etc.)
 */

function _next(ctx, cb) {
  var callback = cb;
  if (ctx._transforms.length) {
    callback = function(err, doc) {
      if (err || doc === null) {
        return cb(err, doc);
      }
      cb(err, ctx._transforms.reduce(function(doc, fn) {
        return fn(doc);
      }, doc));
    };
  }

  if (ctx._error) {
    return process.nextTick(function() {
      callback(ctx._error);
    });
  }

  if (ctx.cursor) {
    return ctx.cursor.next(function(error, doc) {
      if (error) {
        return callback(error);
      }
      if (!doc) {
        return callback(null, null);
      }

      var opts = ctx.query._mongooseOptions;
      if (!opts.populate) {
        return opts.lean === true ?
                callback(null, doc) :
                _create(ctx, doc, null, callback);
      }

      var pop = helpers.preparePopulationOptionsMQ(ctx.query,
        ctx.query._mongooseOptions);
      pop.__noPromise = true;
      ctx.query.model.populate(doc, pop, function(err, doc) {
        if (err) {
          return callback(err);
        }
        return opts.lean === true ?
          callback(null, doc) :
          _create(ctx, doc, pop, callback);
      });
    });
  } else {
    ctx.once('cursor', function() {
      _next(ctx, cb);
    });
  }
}

/*!
 * Convert a raw doc into a full mongoose doc.
 */

function _create(ctx, doc, populatedIds, cb) {
  var instance = helpers.createModel(ctx.query.model, doc, ctx.query._fields);
  var opts = populatedIds ?
    { populated: populatedIds } :
    undefined;

  instance.init(doc, opts, function(err) {
    if (err) {
      return cb(err);
    }
    cb(null, instance);
  });
}

module.exports = QueryCursor;
