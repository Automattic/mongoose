/* eslint no-empty: 1 */

/*!
 * Module dependencies.
 */

var Stream = require('stream').Stream;
var utils = require('./utils');
var helpers = require('./queryhelpers');
var K = function(k) { return k; };

/**
 * Provides a Node.js 0.8 style [ReadStream](http://nodejs.org/docs/v0.8.21/api/stream.html#stream_readable_stream) interface for Queries.
 *
 *     var stream = Model.find().stream();
 *
 *     stream.on('data', function (doc) {
 *       // do something with the mongoose document
 *     }).on('error', function (err) {
 *       // handle the error
 *     }).on('close', function () {
 *       // the stream is closed
 *     });
 *
 *
 * The stream interface allows us to simply "plug-in" to other _Node.js 0.8_ style write streams.
 *
 *     Model.where('created').gte(twoWeeksAgo).stream().pipe(writeStream);
 *
 * ####Valid options
 *
 *   - `transform`: optional function which accepts a mongoose document. The return value of the function will be emitted on `data`.
 *
 * ####Example
 *
 *     // JSON.stringify all documents before emitting
 *     var stream = Thing.find().stream({ transform: JSON.stringify });
 *     stream.pipe(writeStream);
 *
 * _NOTE: plugging into an HTTP response will *not* work out of the box. Those streams expect only strings or buffers to be emitted, so first formatting our documents as strings/buffers is necessary._
 *
 * _NOTE: these streams are Node.js 0.8 style read streams which differ from Node.js 0.10 style. Node.js 0.10 streams are not well tested yet and are not guaranteed to work._
 *
 * @param {Query} query
 * @param {Object} [options]
 * @inherits NodeJS Stream http://nodejs.org/docs/v0.8.21/api/stream.html#stream_readable_stream
 * @event `data`: emits a single Mongoose document
 * @event `error`: emits when an error occurs during streaming. This will emit _before_ the `close` event.
 * @event `close`: emits when the stream reaches the end of the cursor or an error occurs, or the stream is manually `destroy`ed. After this event, no more events are emitted.
 * @api public
 */

function QueryStream(query, options) {
  Stream.call(this);

  this.query = query;
  this.readable = true;
  this.paused = false;
  this._cursor = null;
  this._destroyed = null;
  this._fields = null;
  this._buffer = null;
  this._inline = T_INIT;
  this._running = false;
  this._transform = options && 'function' == typeof options.transform
    ? options.transform
    : K;

  // give time to hook up events
  var self = this;
  process.nextTick(function() {
    self._init();
  });
}

/*!
 * Inherit from Stream
 */

QueryStream.prototype.__proto__ = Stream.prototype;

/**
 * Flag stating whether or not this stream is readable.
 *
 * @property readable
 * @api public
 */

QueryStream.prototype.readable;

/**
 * Flag stating whether or not this stream is paused.
 *
 * @property paused
 * @api public
 */

QueryStream.prototype.paused;

// trampoline flags
var T_INIT = 0;
var T_IDLE = 1;
var T_CONT = 2;

/**
 * Initializes the query.
 *
 * @api private
 */

QueryStream.prototype._init = function() {
  if (this._destroyed) return;

  var query = this.query,
      model = query.model,
      options = query._optionsForExec(model),
      self = this;

  try {
    query.cast(model);
  } catch (err) {
    return self.destroy(err);
  }

  self._fields = utils.clone(query._fields);
  options.fields = query._castFields(self._fields);

  model.collection.find(query._conditions, options, function(err, cursor) {
    if (err) return self.destroy(err);
    self._cursor = cursor;
    self._next();
  });
};

/**
 * Trampoline for pulling the next doc from cursor.
 *
 * @see QueryStream#__next #querystream_QueryStream-__next
 * @api private
 */

QueryStream.prototype._next = function _next() {
  if (this.paused || this._destroyed) {
    return this._running = false;
  }

  this._running = true;

  if (this._buffer && this._buffer.length) {
    var arg;
    while (!this.paused && !this._destroyed && (arg = this._buffer.shift())) {
      this._onNextObject.apply(this, arg);
    }
  }

  // avoid stack overflows with large result sets.
  // trampoline instead of recursion.
  while (this.__next()) {}
};

/**
 * Pulls the next doc from the cursor.
 *
 * @see QueryStream#_next #querystream_QueryStream-_next
 * @api private
 */

QueryStream.prototype.__next = function() {
  if (this.paused || this._destroyed)
    return this._running = false;

  var self = this;
  self._inline = T_INIT;

  self._cursor.nextObject(function cursorcb(err, doc) {
    self._onNextObject(err, doc);
  });

  // if onNextObject() was already called in this tick
  // return ourselves to the trampoline.
  if (T_CONT === this._inline) {
    return true;
  } else {
    // onNextObject() hasn't fired yet. tell onNextObject
    // that its ok to call _next b/c we are not within
    // the trampoline anymore.
    this._inline = T_IDLE;
  }
};

/**
 * Transforms raw `doc`s returned from the cursor into a model instance.
 *
 * @param {Error|null} err
 * @param {Object} doc
 * @api private
 */

QueryStream.prototype._onNextObject = function _onNextObject(err, doc) {
  if (this._destroyed) return;

  if (this.paused) {
    this._buffer || (this._buffer = []);
    this._buffer.push([err, doc]);
    return this._running = false;
  }

  if (err) return this.destroy(err);

  // when doc is null we hit the end of the cursor
  if (!doc) {
    this.emit('end');
    return this.destroy();
  }

  var opts = this.query._mongooseOptions;

  if (!opts.populate) {
    return true === opts.lean ?
      emit(this, doc) :
      createAndEmit(this, null, doc);
  }

  var self = this;
  var pop = helpers.preparePopulationOptionsMQ(self.query, self.query._mongooseOptions);

  // Hack to work around gh-3108
  pop.forEach(function(option) {
    delete option.model;
  });

  self.query.model.populate(doc, pop, function(err, doc) {
    if (err) return self.destroy(err);
    return true === opts.lean ?
      emit(self, doc) :
      createAndEmit(self, pop, doc);
  });
};

function createAndEmit(self, populatedIds, doc) {
  var instance = helpers.createModel(self.query.model, doc, self._fields);
  var opts = populatedIds ?
    { populated: populatedIds } :
    undefined;

  instance.init(doc, opts, function(err) {
    if (err) return self.destroy(err);
    emit(self, instance);
  });
}

/*!
 * Emit a data event and manage the trampoline state
 */

function emit(self, doc) {
  self.emit('data', self._transform(doc));

  // trampoline management
  if (T_IDLE === self._inline) {
    // no longer in trampoline. restart it.
    self._next();
  } else {
    // in a trampoline. tell __next that its
    // ok to continue jumping.
    self._inline = T_CONT;
  }
}

/**
 * Pauses this stream.
 *
 * @api public
 */

QueryStream.prototype.pause = function() {
  this.paused = true;
};

/**
 * Resumes this stream.
 *
 * @api public
 */

QueryStream.prototype.resume = function() {
  this.paused = false;

  if (!this._cursor) {
    // cannot start if not initialized
    return;
  }

  // are we within the trampoline?
  if (T_INIT === this._inline) {
    return;
  }

  if (!this._running) {
    // outside QueryStream control, need manual restart
    return this._next();
  }
};

/**
 * Destroys the stream, closing the underlying cursor. No more events will be emitted.
 *
 * @param {Error} [err]
 * @api public
 */

QueryStream.prototype.destroy = function(err) {
  if (this._destroyed) return;
  this._destroyed = true;
  this._running = false;
  this.readable = false;

  if (this._cursor) {
    this._cursor.close();
  }

  if (err) {
    this.emit('error', err);
  }

  this.emit('close');
};

/**
 * Pipes this query stream into another stream. This method is inherited from NodeJS Streams.
 *
 * ####Example:
 *
 *     query.stream().pipe(writeStream [, options])
 *
 * @method pipe
 * @memberOf QueryStream
 * @see NodeJS http://nodejs.org/api/stream.html
 * @api public
 */

/*!
 * Module exports
 */

module.exports = exports = QueryStream;
