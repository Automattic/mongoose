/*!
 * Module dependencies
 */

var MPromise = require('mpromise');
var util = require('util');

/**
 * Promise constructor.
 *
 * Promises are returned from executed queries. Example:
 *
 *     var query = Candy.find({ bar: true });
 *     var promise = query.exec();
 *
 * DEPRECATED. Mongoose 5.0 will use native promises by default (or bluebird,
 * if native promises are not present) but still
 * support plugging in your own ES6-compatible promises library. Mongoose 5.0
 * will **not** support mpromise.
 *
 * @param {Function} fn a function which will be called when the promise is resolved that accepts `fn(err, ...){}` as signature
 * @inherits mpromise https://github.com/aheckmann/mpromise
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `err`: Emits when the promise is rejected
 * @event `complete`: Emits when the promise is fulfilled
 * @api public
 * @deprecated
 */

function Promise(fn) {
  MPromise.call(this, fn);
}

/**
 * ES6-style promise constructor wrapper around mpromise.
 *
 * @param {Function} resolver
 * @return {Promise} new promise
 * @api public
 */
Promise.ES6 = function(resolver) {
  var promise = new Promise();

  // No try/catch for backwards compatibility
  resolver(
    function() {
      promise.complete.apply(promise, arguments);
    },
    function(e) {
      promise.error(e);
    });

  return promise;
};

/*!
 * Inherit from mpromise
 */

Promise.prototype = Object.create(MPromise.prototype, {
  constructor: {
    value: Promise,
    enumerable: false,
    writable: true,
    configurable: true
  }
});

/*!
 * ignore
 */

Promise.prototype.then = util.deprecate(Promise.prototype.then,
  'Mongoose: mpromise (mongoose\'s default promise library) is deprecated, ' +
  'plug in your own promise library instead: ' +
  'http://mongoosejs.com/docs/promises.html');

/**
 * ES6-style `.catch()` shorthand
 *
 * @method catch
 * @memberOf Promise
 * @param {Function} onReject
 * @return {Promise}
 * @api public
 */

Promise.prototype.catch = function(onReject) {
  return this.then(null, onReject);
};

/*!
 * Override event names for backward compatibility.
 */

Promise.SUCCESS = 'complete';
Promise.FAILURE = 'err';

/**
 * Adds `listener` to the `event`.
 *
 * If `event` is either the success or failure event and the event has already been emitted, the`listener` is called immediately and passed the results of the original emitted event.
 *
 * @see mpromise#on https://github.com/aheckmann/mpromise#on
 * @method on
 * @memberOf Promise
 * @param {String} event
 * @param {Function} listener
 * @return {Promise} this
 * @api public
 */

/**
 * Rejects this promise with `reason`.
 *
 * If the promise has already been fulfilled or rejected, not action is taken.
 *
 * @see mpromise#reject https://github.com/aheckmann/mpromise#reject
 * @method reject
 * @memberOf Promise
 * @param {Object|String|Error} reason
 * @return {Promise} this
 * @api public
 */

/**
 * Rejects this promise with `err`.
 *
 * If the promise has already been fulfilled or rejected, not action is taken.
 *
 * Differs from [#reject](#promise_Promise-reject) by first casting `err` to an `Error` if it is not `instanceof Error`.
 *
 * @api public
 * @param {Error|String} err
 * @return {Promise} this
 */

Promise.prototype.error = function(err) {
  if (!(err instanceof Error)) {
    if (err instanceof Object) {
      err = util.inspect(err);
    }
    err = new Error(err);
  }
  return this.reject(err);
};

/**
 * Resolves this promise to a rejected state if `err` is passed or a fulfilled state if no `err` is passed.
 *
 * If the promise has already been fulfilled or rejected, not action is taken.
 *
 * `err` will be cast to an Error if not already instanceof Error.
 *
 * _NOTE: overrides [mpromise#resolve](https://github.com/aheckmann/mpromise#resolve) to provide error casting._
 *
 * @param {Error} [err] error or null
 * @param {Object} [val] value to fulfill the promise with
 * @api public
 * @deprecated
 */

Promise.prototype.resolve = function(err) {
  if (err) return this.error(err);
  return this.fulfill.apply(this, Array.prototype.slice.call(arguments, 1));
};

/**
 * Adds a single function as a listener to both err and complete.
 *
 * It will be executed with traditional node.js argument position when the promise is resolved.
 *
 *     promise.addBack(function (err, args...) {
 *       if (err) return handleError(err);
 *       console.log('success');
 *     })
 *
 * Alias of [mpromise#onResolve](https://github.com/aheckmann/mpromise#onresolve).
 *
 * _Deprecated. Use `onResolve` instead._
 *
 * @method addBack
 * @param {Function} listener
 * @return {Promise} this
 * @deprecated
 */

Promise.prototype.addBack = Promise.prototype.onResolve;

/**
 * Fulfills this promise with passed arguments.
 *
 * @method fulfill
 * @receiver Promise
 * @see https://github.com/aheckmann/mpromise#fulfill
 * @param {any} args
 * @api public
 * @deprecated
 */

/**
 * Fulfills this promise with passed arguments.
 *
 * Alias of [mpromise#fulfill](https://github.com/aheckmann/mpromise#fulfill).
 *
 * _Deprecated. Use `fulfill` instead._
 *
 * @method complete
 * @receiver Promise
 * @param {any} args
 * @api public
 * @deprecated
 */

Promise.prototype.complete = MPromise.prototype.fulfill;

/**
 * Adds a listener to the `complete` (success) event.
 *
 * Alias of [mpromise#onFulfill](https://github.com/aheckmann/mpromise#onfulfill).
 *
 * _Deprecated. Use `onFulfill` instead._
 *
 * @method addCallback
 * @param {Function} listener
 * @return {Promise} this
 * @api public
 * @deprecated
 */

Promise.prototype.addCallback = Promise.prototype.onFulfill;

/**
 * Adds a listener to the `err` (rejected) event.
 *
 * Alias of [mpromise#onReject](https://github.com/aheckmann/mpromise#onreject).
 *
 * _Deprecated. Use `onReject` instead._
 *
 * @method addErrback
 * @param {Function} listener
 * @return {Promise} this
 * @api public
 * @deprecated
 */

Promise.prototype.addErrback = Promise.prototype.onReject;

/**
 * Creates a new promise and returns it. If `onFulfill` or `onReject` are passed, they are added as SUCCESS/ERROR callbacks to this promise after the nextTick.
 *
 * Conforms to [promises/A+](https://github.com/promises-aplus/promises-spec) specification.
 *
 * ####Example:
 *
 *     var promise = Meetups.find({ tags: 'javascript' }).select('_id').exec();
 *     promise.then(function (meetups) {
 *       var ids = meetups.map(function (m) {
 *         return m._id;
 *       });
 *       return People.find({ meetups: { $in: ids }).exec();
 *     }).then(function (people) {
 *       if (people.length < 10000) {
 *         throw new Error('Too few people!!!');
 *       } else {
 *         throw new Error('Still need more people!!!');
 *       }
 *     }).then(null, function (err) {
 *       assert.ok(err instanceof Error);
 *     });
 *
 * @see promises-A+ https://github.com/promises-aplus/promises-spec
 * @see mpromise#then https://github.com/aheckmann/mpromise#then
 * @method then
 * @memberOf Promise
 * @param {Function} onFulFill
 * @param {Function} onReject
 * @return {Promise} newPromise
 * @deprecated
 */

/**
 * Signifies that this promise was the last in a chain of `then()s`: if a handler passed to the call to `then` which produced this promise throws, the exception will go uncaught.
 *
 * ####Example:
 *
 *     var p = new Promise;
 *     p.then(function(){ throw new Error('shucks') });
 *     setTimeout(function () {
 *       p.fulfill();
 *       // error was caught and swallowed by the promise returned from
 *       // p.then(). we either have to always register handlers on
 *       // the returned promises or we can do the following...
 *     }, 10);
 *
 *     // this time we use .end() which prevents catching thrown errors
 *     var p = new Promise;
 *     var p2 = p.then(function(){ throw new Error('shucks') }).end(); // <--
 *     setTimeout(function () {
 *       p.fulfill(); // throws "shucks"
 *     }, 10);
 *
 * @api public
 * @see mpromise#end https://github.com/aheckmann/mpromise#end
 * @method end
 * @memberOf Promise
 * @deprecated
 */

/*!
 * expose
 */

module.exports = Promise;
