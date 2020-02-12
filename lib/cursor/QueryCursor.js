/*!
 * Module dependencies.
 */

'use strict';

const Readable = require('stream').Readable;
const promiseOrCallback = require('../helpers/promiseOrCallback');
const eachAsync = require('../helpers/cursor/eachAsync');
const helpers = require('../queryhelpers');
const util = require('util');

/**
 * A QueryCursor is a concurrency primitive for processing query results
 * one document at a time. A QueryCursor fulfills the Node.js streams3 API,
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
  const _this = this;
  const model = query.model;
  this._mongooseOptions = {};
  this._transforms = [];
  this.model = model;
  this.options = options || {};

  model.hooks.execPre('find', query, () => {
    this._transforms = this._transforms.concat(query._transforms.slice());
    if (this.options.transform) {
      this._transforms.push(options.transform);
    }
    // Re: gh-8039, you need to set the `cursor.batchSize` option, top-level
    // `batchSize` option doesn't work.
    if (this.options.batchSize) {
      this.options.cursor = options.cursor || {};
      this.options.cursor.batchSize = options.batchSize;
    }
    model.collection.find(query._conditions, this.options, function(err, cursor) {
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
  return promiseOrCallback(callback, cb => {
    this.cursor.close(error => {
      if (error) {
        cb(error);
        return this.listeners('error').length > 0 && this.emit('error', error);
      }
      this.emit('close');
      cb(null);
    });
  }, this.model.events);
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
  return promiseOrCallback(callback, cb => {
    _next(this, function(error, doc) {
      if (error) {
        return cb(error);
      }
      cb(null, doc);
    });
  }, this.model.events);
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

QueryCursor.prototype.eachAsync = function(fn, opts, callback) {
  const _this = this;
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  opts = opts || {};

  return eachAsync(function(cb) { return _next(_this, cb); }, fn, opts, callback);
};

/**
 * The `options` passed in to the `QueryCursor` constructor.
 *
 * @api public
 * @property options
 */

QueryCursor.prototype.options;

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

QueryCursor.prototype.addCursorFlag = function(flag, value) {
  const _this = this;
  _waitForCursor(this, function() {
    _this.cursor.addCursorFlag(flag, value);
  });
  return this;
};

/*!
 * ignore
 */

QueryCursor.prototype.transformNull = function(val) {
  if (arguments.length === 0) {
    val = true;
  }
  this._mongooseOptions.transformNull = val;
  return this;
};

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
        return fn.call(ctx, doc);
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

      const opts = ctx.query._mongooseOptions;
      if (!opts.populate) {
        return opts.lean ?
          callback(null, doc) :
          _create(ctx, doc, null, callback);
      }

      const pop = helpers.preparePopulationOptionsMQ(ctx.query,
        ctx.query._mongooseOptions);
      pop.__noPromise = true;
      ctx.query.model.populate(doc, pop, function(err, doc) {
        if (err) {
          return callback(err);
        }
        return opts.lean ?
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
 * Convert a raw doc into a full mongoose doc.
 */

function _create(ctx, doc, populatedIds, cb) {
  const instance = helpers.createModel(ctx.query.model, doc, ctx.query._fields);
  const opts = populatedIds ?
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
