
/**
 * Module dependencies.
 */

var EventEmitter = require('./utils').EventEmitter;

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
    if (this.emitted.err || this.emitted.complete)
      return this;
    this.emitted[event] = Array.prototype.slice.call(arguments, 1);
  }

  return EventEmitter.prototype.emit.apply(this, arguments);
};

/**
 * Shortcut for emitting complete event
 *
 * @api public
 */

Promise.prototype.complete = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.emit.apply(this, ['complete'].concat(args));
};

/**
 * Shortcut for emitting err event
 *
 * @api public
 */

Promise.prototype.error = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.emit.apply(this, ['err'].concat(args));
};

/**
 * Shortcut for `.on('complete', fn)`
 *
 * @api public
 */

Promise.prototype.addCallback = function (fn) {
  return this.on('complete', fn);
};

/**
 * Shortcut for `.on('err', fn)`
 *
 * @api public
 */

Promise.prototype.addErrback = function (fn) {
  return this.on('err', fn);
};

/**
 * Adds a single function that's both callback and errback
 *
 * @api private
 */

Promise.prototype.addBack = function (fn) {
  var self = this;

  this.on('err', function(err){
    fn.call(this, err);
  });

  this.on('complete', function(){
    var args = Array.prototype.slice.call(arguments);
    fn.apply(this, [null].concat(args));
  });
};

/**
 * Module exports.
 */

module.exports = Promise;
