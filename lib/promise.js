
/*!
 * Module dependencies.
 */

var util = require('./utils');
var EventEmitter = util.EventEmitter;

/**
 * Promise constructor.
 *
 * @param {Function} back a callback+errback that accepts `fn(err, ...){}` as signature
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `err`: Emits when the promise resolves to an error.
 * @event `complete`: Emits when the promise resolves sucessfully.
 * @api public
 */

function Promise (back) {
  this.emitted = {};
  if ('function' == typeof back)
    this.addBack(back);
};

/*!
 * Inherits from EventEmitter.
 */

Promise.prototype.__proto__ = EventEmitter.prototype;

/**
 * Adds `listener` to the `event`.
 *
 * If `event` is either `error` or `complete` and the event has already been emitted, the`listener` is called immediately and passed the results of the original emitted event.
 *
 * @param {String} event
 * @param {Function} callback
 * @return {Promise} this
 * @api public
 */

Promise.prototype.on = function (event, callback) {
  if (this.emitted[event])
    callback.apply(this, this.emitted[event]);
  else
    EventEmitter.prototype.on.call(this, event, callback);

  return this;
};

/**
 * Keeps track of emitted events to run them on `on`.
 *
 * @api private
 */

Promise.prototype.emit = function (event) {
  // ensures a promise can't be complete() or error() twice
  if (event == 'err' || event == 'complete'){
    if (this.emitted.err || this.emitted.complete) {
      return this;
    }
    this.emitted[event] = util.args(arguments, 1);
  }

  return EventEmitter.prototype.emit.apply(this, arguments);
};

/**
 * Shortcut for emitting the `complete` event.
 *
 * @api public
 */

Promise.prototype.complete = function () {
  var args = util.args(arguments);
  return this.emit.apply(this, ['complete'].concat(args));
};

/**
 * Shortcut for emitting the `err` event.
 *
 * If `err` is not instanceof Error, it is cast to Error before rejecting.
 *
 * @api public
 * @return {Promise}
 */

Promise.prototype.error = function (err) {
  if (!(err instanceof Error)) err = new Error(err);
  return this.reject(err);
}

/**
 * Rejects this promise with `reason`.
 * Differs from `promise#error` by not casting the argument to an error.
 *
 * @api public
 * @param {Object|String} reason
 * @return {Promise}
 */

Promise.prototype.reject = function (reason) {
  return this.emit('err', reason);
}

/**
 * Adds a listener to the `complete` (success) event.
 *
 * @return {Promise} this
 * @api public
 */

Promise.prototype.addCallback = function (fn) {
  return this.on('complete', fn);
};

/**
 * Adds a listener to the `err` (rejected) event.
 *
 * @return {Promise} this
 * @api public
 */

Promise.prototype.addErrback = function (fn) {
  return this.on('err', fn);
};

/**
 * Adds a single function as both a callback and errback.
 *
 * It will be executed with traditional node.js argument position:
 * function (err, args...) {}
 *
 * @param {Function} fn
 * @return {Promise} this
 */

Promise.prototype.addBack = function (fn) {
  this.on('err', function(err){
    fn.call(this, err);
  });

  this.on('complete', function(){
    var args = util.args(arguments);
    fn.apply(this, [null].concat(args));
  });

  return this;
};

/**
 * Resolves this promise to an error state if `err` is passed or success state when no `err` is passed.
 *
 * `err` will be cast to an Error if not already instanceof Error.
 *
 * @param {Error} [err] error or null
 * @param {Object} [val] value to complete the promise with
 * @api public
 */

Promise.prototype.resolve = function (err, val) {
  if (err) return this.error(err);
  return this.complete(val);
};

/**
 * Creates a new promise and returns it. If `onFulfill` or
 * `onReject` are passed, they are added as success/error callbacks
 * to this promise after the nextTick.
 *
 * Conforms to [promises/A+](https://github.com/promises-aplus/promises-spec) specification. Read for more detail how to use this method.
 *
 * ####Example:
 *
 *     var p = new Promise;
 *     p.then(function (arg) {
 *       return arg + 1;
 *     }).then(function (arg) {
 *       throw new Error(arg + ' is an error!');
 *     }).then(null, function (err) {
 *       assert.ok(err instanceof Error);
 *       assert.equal('2 is an error');
 *     });
 *     p.complete(1);
 *
 * @see promises-A+ https://github.com/promises-aplus/promises-spec
 * @param {Function} onFulFill
 * @param {Function} onReject
 * @return {Promise} newPromise
 */

Promise.prototype.then = function (onFulfill, onReject) {
  var self = this
    , retPromise = new Promise;

  function handler (fn) {
    return function handle (arg) {
      try {
        var val = fn(arg);
        if (val && val.then) {
          val.then(
              retPromise.complete.bind(retPromise)
            , retPromise.reject.bind(retPromise))
        } else {
          retPromise.complete(val);
        }
      } catch (err) {
        retPromise.reject(err);
      }
    }
  }

  process.nextTick(function () {
    if ('function' == typeof onReject) {
      self.addErrback(handler(onReject));
    } else {
      self.addErrback(retPromise.reject.bind(retPromise));
    }

    if ('function' == typeof onFulfill) {
      self.addCallback(handler(onFulfill));
    } else {
      self.addCallback(retPromise.complete.bind(retPromise));
    }
  })

  return retPromise;
}

/*!
 * Module exports.
 */

module.exports = Promise;
