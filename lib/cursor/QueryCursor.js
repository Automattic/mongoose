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
 * QueryCursors execute the model's pre `find` hooks before loading any documents
 * from MongoDB, and the model's post `find` hooks after loading each document.
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
        if (cursor != null) {
          cursor.close(function() {});
        }
        _this.emit('cursor', null);
        _this.listeners('error').length > 0 && _this.emit('error', _this._error);
        return;
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
          // on node >= 14 streams close automatically (gh-8834)
          const isNotClosedAutomatically = !_this.destroyed;
          if (isNotClosedAutomatically) {
            _this.emit('close');
          }
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
 * ####Example
 *
 *     // Iterate over documents asynchronously
 *     Thing.
 *       find({ name: /^hello/ }).
 *       cursor().
 *       eachAsync(async function (doc, i) {
 *         doc.foo = doc.bar + i;
 *         await doc.save();
 *       })
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
 * ignore
 */

QueryCursor.prototype._transformForAsyncIterator = function() {
  if (this._transforms.indexOf(_transformForAsyncIterator) === -1) {
    this.map(_transformForAsyncIterator);
  }
  return this;
};

/**
 * Returns an asyncIterator for use with [`for/await/of` loops](https://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js).
 * You do not need to call this function explicitly, the JavaScript runtime
 * will call it for you.
 *
 * ####Example
 *
 *     // Works without using `cursor()`
 *     for await (const doc of Model.find([{ $sort: { name: 1 } }])) {
 *       console.log(doc.name);
 *     }
 *
 *     // Can also use `cursor()`
 *     for await (const doc of Model.find([{ $sort: { name: 1 } }]).cursor()) {
 *       console.log(doc.name);
 *     }
 *
 * Node.js 10.x supports async iterators natively without any flags. You can
 * enable async iterators in Node.js 8.x using the [`--harmony_async_iteration` flag](https://github.com/tc39/proposal-async-iteration/issues/117#issuecomment-346695187).
 *
 * **Note:** This function is not if `Symbol.asyncIterator` is undefined. If
 * `Symbol.asyncIterator` is undefined, that means your Node.js version does not
 * support async iterators.
 *
 * @method Symbol.asyncIterator
 * @memberOf Query
 * @instance
 * @api public
 */

if (Symbol.asyncIterator != null) {
  QueryCursor.prototype[Symbol.asyncIterator] = function() {
    return this.transformNull()._transformForAsyncIterator();
  };
}

/*!
 * ignore
 */

function _transformForAsyncIterator(doc) {
  return doc == null ? { done: true } : { value: doc, done: false };
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
    if (ctx.query._mongooseOptions.populate && !ctx._pop) {
      ctx._pop = helpers.preparePopulationOptionsMQ(ctx.query,
        ctx.query._mongooseOptions);
      ctx._pop.__noPromise = true;
    }
    if (ctx.query._mongooseOptions.populate && ctx.options.batchSize > 1) {
      if (ctx._batchDocs && ctx._batchDocs.length) {
        // Return a cached populated doc
        return _nextDoc(ctx, ctx._batchDocs.shift(), ctx._pop, callback);
      } else if (ctx._batchExhausted) {
        // Internal cursor reported no more docs. Act the same here
        return callback(null, null);
      } else {
        // Request as many docs as batchSize, to populate them also in batch
        ctx._batchDocs = [];
        return ctx.cursor.next(_onNext.bind({ ctx, callback }));
      }
    } else {
      return ctx.cursor.next(function(error, doc) {
        if (error) {
          return callback(error);
        }
        if (!doc) {
          return callback(null, null);
        }

        if (!ctx.query._mongooseOptions.populate) {
          return _nextDoc(ctx, doc, null, callback);
        }

        ctx.query.model.populate(doc, ctx._pop, function(err, doc) {
          if (err) {
            return callback(err);
          }
          return _nextDoc(ctx, doc, ctx._pop, callback);
        });
      });
    }
  } else {
    ctx.once('cursor', function(cursor) {
      if (cursor == null) {
        return;
      }
      _next(ctx, cb);
    });
  }
}

/*!
 * ignore
 */

function _onNext(error, doc) {
  if (error) {
    return this.callback(error);
  }
  if (!doc) {
    this.ctx._batchExhausted = true;
    return _populateBatch.call(this);
  }

  this.ctx._batchDocs.push(doc);

  if (this.ctx._batchDocs.length < this.ctx.options.batchSize) {
    this.ctx.cursor.next(_onNext.bind(this));
  } else {
    _populateBatch.call(this);
  }
}

/*!
 * ignore
 */

function _populateBatch() {
  if (!this.ctx._batchDocs.length) {
    return this.callback(null, null);
  }
  const _this = this;
  this.ctx.query.model.populate(this.ctx._batchDocs, this.ctx._pop, function(err) {
    if (err) {
      return _this.callback(err);
    }

    _nextDoc(_this.ctx, _this.ctx._batchDocs.shift(), _this.ctx._pop, _this.callback);
  });
}

/*!
 * ignore
 */

function _nextDoc(ctx, doc, pop, callback) {
  if (ctx.query._mongooseOptions.lean) {
    return ctx.model.hooks.execPost('find', ctx.query, [[doc]], err => {
      if (err != null) {
        return callback(err);
      }
      callback(null, doc);
    });
  }

  _create(ctx, doc, pop, (err, doc) => {
    if (err != null) {
      return callback(err);
    }
    ctx.model.hooks.execPost('find', ctx.query, [[doc]], err => {
      if (err != null) {
        return callback(err);
      }
      callback(null, doc);
    });
  });
}

/*!
 * ignore
 */

function _waitForCursor(ctx, cb) {
  if (ctx.cursor) {
    return cb();
  }
  ctx.once('cursor', function(cursor) {
    if (cursor == null) {
      return;
    }
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
