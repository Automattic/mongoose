/*!
 * Module dependencies.
 */

'use strict';

const Readable = require('stream').Readable;
const eachAsync = require('../helpers/cursor/eachAsync');
const util = require('util');
const utils = require('../utils');

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
 * @param {Object} options
 * @inherits Readable
 * @event `cursor`: Emitted when the cursor is created
 * @event `error`: Emitted when an error occurred
 * @event `data`: Emitted when the stream is flowing and the next doc is ready
 * @event `end`: Emitted when the stream is exhausted
 * @api public
 */

function AggregationCursor(agg) {
  Readable.call(this, { objectMode: true });

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
 * @return {AggregationCursor}
 * @api public
 * @method map
 */

AggregationCursor.prototype.map = function(fn) {
  this._transforms.push(fn);
  return this;
};

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
 * @see MongoDB driver cursor#close http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#close
 */

AggregationCursor.prototype.close = function(callback) {
  return utils.promiseOrCallback(callback, cb => {
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
  return utils.promiseOrCallback(callback, cb => {
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

/**
 * Adds a [cursor flag](http://mongodb.github.io/node-mongodb-native/2.2/api/Cursor.html#addCursorFlag).
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

      callback(null, doc);
    });
  } else {
    ctx.once('cursor', function() {
      _next(ctx, cb);
    });
  }
}

module.exports = AggregationCursor;
