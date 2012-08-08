
/*!
 * Module dependencies.
 */

var Stream = require('stream').Stream
var utils = require('./utils')

/**
 * Provides a [ReadStream](http://nodejs.org/api/stream.html#stream_readable_stream) interface for Queries.
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
 * The stream interface allows us to simply "plug-in" to other Node streams such as http responses and write streams so everything "just works" out of the box.
 *
 *     Model.where('created').gte(twoWeeksAgo).stream().pipe(writeStream);
 *
 * @param {Query} query
 * @inherits NodeJS Stream http://nodejs.org/api/stream.html
 * @event `data`: emits a single Mongoose document
 * @event `error`: emits when an error occurs during streaming. This will emit _before_ the `close` event.
 * @event `close`: emits when the stream reaches the end of the cursor or an error occurs, or the stream is manually `destroy`ed. After this event, no more events are emitted.
 * @api public
 */

function QueryStream (query) {
  Stream.call(this);

  this.query = query;
  this.readable = true;
  this.paused = false;
  this._cursor = null;
  this._destroyed = null;
  this._fields = null;
  this._ticks = 0;
  this._inline = T_INIT;

  // give time to hook up events
  var self = this;
  process.nextTick(function () {
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

QueryStream.prototype._init = function () {
  if (this._destroyed) return;

  var query = this.query
    , model = query.model
    , options = query._optionsForExec(model)
    , self = this

  try {
    query.cast(model);
  } catch (err) {
    return self.destroy(err);
  }

  self._fields = utils.clone(options.fields = query._fields);

  model.collection.find(query._conditions, options, function (err, cursor) {
    if (err) return self.destroy(err);
    self._cursor = cursor;
    self._next();
  });
}

/**
 * Trampoline for pulling the next doc from cursor.
 *
 * @see QueryStream#__next #querystream_QueryStream-__next
 * @api private
 */

QueryStream.prototype._next = function () {
  // avoid stack overflows with large result sets.
  // trampoline instead of recursion.
  var fn;
  while (fn = this.__next()) fn.call(this);
}

/**
 * Pulls the next doc from the cursor.
 *
 * @see QueryStream#_next #querystream_QueryStream-_next
 * @api private
 */

QueryStream.prototype.__next = function () {
  if (this.paused || this._destroyed) return;

  var self = this;
  self._inline = T_INIT;

  self._cursor.nextObject(function (err, doc) {
    self._onNextObject(err, doc);
  });

  // if onNextObject() was already called in this tick
  // return ourselves to the trampoline.
  if (T_CONT === this._inline) {
    return this.__next;
  } else {
    // onNextObject() hasn't fired yet. tell onNextObject
    // that its ok to call _next b/c we are not within
    // the trampoline anymore.
    this._inline = T_IDLE;
  }
}

/**
 * Transforms raw `doc`s returned from the cursor into a model instance.
 *
 * @param {Error|null} err
 * @param {Object} doc
 * @api private
 */

QueryStream.prototype._onNextObject = function (err, doc) {
  if (err) return this.destroy(err);

  // when doc is null we hit the end of the cursor
  if (!doc) {
    return this.destroy();
  }

  if (this.query.options && this.query.options.lean === true)  {
    this.emit('data', doc);
    this._next();
    return;
  }

  var instance = new this.query.model(undefined, this._fields);

  // skip _id for pre-init hooks
  delete instance._doc._id;

  var self = this;
  instance.init(doc, this.query, function (err) {
    if (err) return self.destroy(err);
    self.emit('data', instance);

    // trampoline management
    if (T_IDLE === self._inline) {
      // no longer in trampoline. restart it.
      self._next();
    } else
      // in a trampoline. tell __next that its
      // ok to continue jumping.
      self._inline = T_CONT;
  });
}

/**
 * Pauses this stream.
 *
 * @api public
 */

QueryStream.prototype.pause = function () {
  this.paused = true;
}

/**
 * Resumes this stream.
 *
 * @api public
 */

QueryStream.prototype.resume = function () {
  this.paused = false;
  this._next();
}

/**
 * Destroys the stream, closing the underlying cursor. No more events will be emitted.
 *
 * @param {Error} [err]
 * @api public
 */

QueryStream.prototype.destroy = function (err) {
  if (this._destroyed) return;
  this._destroyed = true;
  this.readable = false;

  if (this._cursor) {
    this._cursor.close();
  }

  if (err) {
    this.emit('error', err);
  }

  this.emit('close');
}

/**
 * Pipes this query stream into another stream. This method is inherited from NodeJS Streams.
 *
 * ####Example:
 *
 *     query.stream().pipe(writeStream [, options])
 *
 * This could be particularily useful if you are, for example, setting up an API for a service and want to stream out the docs based on some criteria. We could first pipe the QueryStream into a sort of filter that formats the stream as an array before passing on the document to an http response.
 *
 *     var format = new ArrayFormatter;
 *     Events.find().stream().pipe(format).pipe(res);
 *
 * As long as ArrayFormat implements the WriteStream API we can stream large formatted result sets out to the client. See this [gist](https://gist.github.com/1403797) for a hacked example.
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
