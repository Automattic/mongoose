
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
 * Pull the next document from the cursor.
 * @private
 */

QueryStream.prototype._next = function () {
  if (this.paused || this._destroyed) return;

  var self = this;

  // nextTick is necessary to avoid stack overflows when
  // dealing with large result sets. yield occasionally.
  if (!(++this._ticks % 20)) {
    process.nextTick(function () {
      self._cursor.nextObject(function (err, doc) {
        self._onNextObject(err, doc);
      });
    });
  } else {
    self._cursor.nextObject(function (err, doc) {
      self._onNextObject(err, doc);
    });
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
    self._next();
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
