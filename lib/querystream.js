
/**
 * Module dependencies.
 */

var Stream = require('stream').Stream
var utils = require('./utils')

/**
 * QueryStream
 *
 * Returns a stream interface for the `query`.
 *
 * @param {Query} query
 * @return {Stream}
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

/**
 * Inherit from Stream
 * @private
 */

QueryStream.prototype.__proto__ = Stream.prototype;

/**
 * Flag stating whether or not this stream is readable.
 */

QueryStream.prototype.readable;

/**
 * Flag stating whether or not this stream is paused.
 */

QueryStream.prototype.paused;

// trampoline flags
var T_INIT = 0;
var T_IDLE = 1;
var T_CONT = 2;

/**
 * Initialize the query.
 * @private
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
 * _next
 *
 * Trampoline for pulling the next doc from cursor.
 *
 * @see __next
 * @api private
 */

QueryStream.prototype._next = function () {
  // avoid stack overflows with large result sets.
  // trampoline instead of recursion.
  var fn;
  while (fn = this.__next()) fn.call(this);
}

/**
 * __next
 *
 * Pull the next doc from the cursor.
 *
 * @see _next
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
 * Handle each document as its returned from the cursor
 * transforming the raw `doc` from -native into a model
 * instance.
 *
 * @private
 */

QueryStream.prototype._onNextObject = function (err, doc) {
  if (err) return this.destroy(err);

  // when doc is null we hit the end of the cursor
  if (!doc) {
    return this.destroy();
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
 */

QueryStream.prototype.pause = function () {
  this.paused = true;
}

/**
 * Resumes this stream.
 */

QueryStream.prototype.resume = function () {
  this.paused = false;
  this._next();
}

/**
 * Destroys the stream, closing the underlying
 * cursor. No more events will be emitted.
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

// TODO - maybe implement the -native raw option to pass binary?
//QueryStream.prototype.setEncoding = function () {
//}

module.exports = exports = QueryStream;
