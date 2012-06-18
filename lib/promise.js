
/**
 * Module dependencies.
 */

var util = require('./utils');
var EventEmitter = util.EventEmitter;

/**
 * Promise constructor.
 *
 * @param {Function} a callback+errback that takes err, ... as signature
 * @api public
 */

function Promise (back) {
  this.emitted = {};
  if ('function' == typeof back)
    this.addBack(back);
};

/**
 * Inherits from EventEmitter.
 */

Promise.prototype.__proto__ = EventEmitter.prototype;

/**
 * Adds an event or fires the callback right away.
 *
 * @return promise
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
 * Keeps track of emitted events to run them on `on`
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
 * Shortcut for emitting complete event
 *
 * @api public
 */

Promise.prototype.complete = function () {
  var args = util.args(arguments);
  return this.emit.apply(this, ['complete'].concat(args));
};

/**
 * Shortcut for emitting err event
 *
 * @api public
 */

Promise.prototype.error = function (err) {
  if (!(err instanceof Error)) err = new Error(err);
  return this.emit('err', err);
};

/**
 * Shortcut for `.on('complete', fn)`
 *
 * @return promise
 * @api public
 */

Promise.prototype.addCallback = function (fn) {
  return this.on('complete', fn);
};

/**
 * Shortcut for `.on('err', fn)`
 *
 * @return promise
 * @api public
 */

Promise.prototype.addErrback = function (fn) {
  return this.on('err', fn);
};

/**
 * Adds a single function that's both callback and errback
 *
 * @return promise
 * @api private
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
 * Sugar for handling cases where you may be
 * resolving to either an error condition or a 
 * success condition.
 *
 * @param {Error} optional error or null
 * @param {Object} value to complete the promise with
 * @api public
 */

Promise.prototype.resolve = function (err, val) {
  if (err) return this.error(err);
  return this.complete(val);
};

/**
 * Module exports.
 */

module.exports = Promise;
