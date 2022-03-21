/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('../error/mongooseError');
const Readable = require('stream').Readable;
const promiseOrCallback = require('../helpers/promiseOrCallback');
const eachAsync = require('../helpers/cursor/eachAsync');
const immediate = require('../helpers/immediate');
const util = require('util');

/**
 * An AggregationCursor is a concurrency primitive for processing aggregation
 * results one document at a time. It is analogous to QueryCursor.
 *
 * An AggregationCursor fulfills the Node.js streams3 API,
 * in addition to several other mechanisms for loading documents from MongoDB
 * one at a time.
 *
 * Creating an AggregationCursor executes the model's pre aggregate hooks,
 * but **not** the model's post aggregate hooks.
 *
 * Unless you're an advanced user, do **not** instantiate this class directly.
 * Use [`Aggregate#cursor()`](/docs/api.html#aggregate_Aggregate-cursor) instead.
 *
 * @param {Aggregate} agg
 * @inherits Readable
 * @event `cursor`: Emitted when the cursor is created
 * @event `error`: Emitted when an error occurred
 * @event `data`: Emitted when the stream is flowing and the next doc is ready
 * @event `end`: Emitted when the stream is exhausted
 * @api public
 */

function AggregationCursor(agg) {
  // set autoDestroy=true because on node 12 it's by default false
  // gh-10902 need autoDestroy to destroy correctly and emit 'close' event
  Readable.call(this, { autoDestroy: true, objectMode: true });

  this.cursor = null;
  this.agg = agg;
  this._transforms = [];
  const model = agg._model;
  delete agg.options.cursor.useMongooseAggCursor;
  this._mongooseOptions = {};

  _init(model, this, agg);
}

util.inherits(AggregationCursor, Readable);

/*!
 * ignore
 */

function _init(model, c, agg) {
  if (!model.collection.buffer) {
    model.hooks.execPre('aggregate', agg, function() {
      c.cursor = model.collection.aggregate(agg._pipeline, agg.options || {});
      c.emit('cursor', c.cursor);
    });
  } else {
    model.collection.emitter.once('queue', function() {
      model.hooks.execPre('aggregate', agg, function() {
        c.cursor = model.collection.aggregate(agg._pipeline, agg.options || {});
        c.emit('cursor', c.cursor);
      });
    });
  }
}

/*!
 * Necessary to satisfy the Readable API
 */

AggregationCursor.prototype._read = function() {
  const _this = this;
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
      });
      return;
    }
    _this.push(doc);
  });
};

if (Symbol.asyncIterator != null) {
  const msg = 'Mongoose does not support using async iterators with an ' +
    'existing aggregation cursor. See https://bit.ly/mongoose-async-iterate-aggregation';

  AggregationCursor.prototype[Symbol.asyncIterator] = function() {
    throw new MongooseError(msg);
  };
}

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
 *     const cursor = Thing.find({ name: /^hello/ }).
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
 * @return {AggregationCursor}
 * @api public
 * @method map
 */

Object.defineProperty(AggregationCursor.prototype, 'map', {
  value: function(fn) {
    this._transforms.push(fn);
    return this;
  },
  enumerable: true,
  configurable: true,
  writable: true
});

/*!
 * Marks this cursor as errored
 */

AggregationCursor.prototype._markError = function(error) {
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
 * @see MongoDB driver cursor#close https://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#close
 */

AggregationCursor.prototype.close = function(callback) {
  return promiseOrCallback(callback, cb => {
    this.cursor.close(error => {
      if (error) {
        cb(error);
        return this.listeners('error').length > 0 && this.emit('error', error);
      }
      this.emit('close');
      cb(null);
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

AggregationCursor.prototype.next = function(callback) {
  return promiseOrCallback(callback, cb => {
    _next(this, cb);
  });
};

/**
 * Execute `fn` for every document in the cursor. If `fn` returns a promise,
 * will wait for the promise to resolve before iterating on to the next one.
 * Returns a promise that resolves when done.
 *
 * @param {Function} fn
 * @param {Object} [options]
 * @param {Number} [options.parallel] the number of promises to execute in parallel. Defaults to 1.
 * @param {Function} [callback] executed when all docs have been processed
 * @return {Promise}
 * @api public
 * @method eachAsync
 */

AggregationCursor.prototype.eachAsync = function(fn, opts, callback) {
  const _this = this;
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  opts = opts || {};

  return eachAsync(function(cb) { return _next(_this, cb); }, fn, opts, callback);
};

/**
 * Returns an asyncIterator for use with [`for/await/of` loops](https://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js
 * You do not need to call this function explicitly, the JavaScript runtime
 * will call it for you.
 *
 * ####Example
 *
 *     // Async iterator without explicitly calling `cursor()`. Mongoose still
 *     // creates an AggregationCursor instance internally.
 *     const agg = Model.aggregate([{ $match: { age: { $gte: 25 } } }]);
 *     for await (const doc of agg) {
 *       console.log(doc.name);
 *     }
 *
 *     // You can also use an AggregationCursor instance for async iteration
 *     const cursor = Model.aggregate([{ $match: { age: { $gte: 25 } } }]).cursor();
 *     for await (const doc of cursor) {
 *       console.log(doc.name);
 *     }
 *
 * Node.js 10.x supports async iterators natively without any flags. You can
 * enable async iterators in Node.js 8.x using the [`--harmony_async_iteration` flag](https://github.com/tc39/proposal-async-iteration/issues/117#issuecomment-346695187).
 *
 * **Note:** This function is not set if `Symbol.asyncIterator` is undefined. If
 * `Symbol.asyncIterator` is undefined, that means your Node.js version does not
 * support async iterators.
 *
 * @method Symbol.asyncIterator
 * @memberOf AggregationCursor
 * @instance
 * @api public
 */

if (Symbol.asyncIterator != null) {
  AggregationCursor.prototype[Symbol.asyncIterator] = function() {
    return this.transformNull()._transformForAsyncIterator();
  };
}

/*!
 * ignore
 */

AggregationCursor.prototype._transformForAsyncIterator = function() {
  if (this._transforms.indexOf(_transformForAsyncIterator) === -1) {
    this.map(_transformForAsyncIterator);
  }
  return this;
};

/*!
 * ignore
 */

AggregationCursor.prototype.transformNull = function(val) {
  if (arguments.length === 0) {
    val = true;
  }
  this._mongooseOptions.transformNull = val;
  return this;
};

/*!
 * ignore
 */

function _transformForAsyncIterator(doc) {
  return doc == null ? { done: true } : { value: doc, done: false };
}

/**
 * Adds a [cursor flag](https://mongodb.github.io/node-mongodb-native/2.2/api/Cursor.html#addCursorFlag).
 * Useful for setting the `noCursorTimeout` and `tailable` flags.
 *
 * @param {String} flag
 * @param {Boolean} value
 * @return {AggregationCursor} this
 * @api public
 * @method addCursorFlag
 */

AggregationCursor.prototype.addCursorFlag = function(flag, value) {
  const _this = this;
  _waitForCursor(this, function() {
    _this.cursor.addCursorFlag(flag, value);
  });
  return this;
};

/*!
 * ignore
 */

function _waitForCursor(ctx, cb) {
  if (ctx.cursor) {
    return cb();
  }
  ctx.once('cursor', function() {
    cb();
  });
}

/*!
 * Get the next doc from the underlying cursor and mongooseify it
 * (populate, etc.)
 */

function _next(ctx, cb) {
  let callback = cb;
  if (ctx._transforms.length) {
    callback = function(err, doc) {
      if (err || (doc === null && !ctx._mongooseOptions.transformNull)) {
        return cb(err, doc);
      }
      cb(err, ctx._transforms.reduce(function(doc, fn) {
        return fn(doc);
      }, doc));
    };
  }

  if (ctx._error) {
    return immediate(function() {
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

      callback(null, doc);
    });
  } else {
    ctx.once('cursor', function() {
      _next(ctx, cb);
    });
  }
}

module.exports = AggregationCursor;
