/*!
 * Module-specific global state
 */

var _promise;

/**
 * ES6 Promise wrapper constructor.
 *
 * Promises are returned from executed queries. Example:
 *
 *     var query = Candy.find({ bar: true });
 *     var promise = query.exec();
 *
 * DEPRECATED. Mongoose 5.0 will use native promises by default but still
 * support plugging in your own ES6-compatible promises library. Mongoose 5.0
 * will **not** support mpromise.
 *
 * @param {Function} fn a function which will be called when the promise is resolved that accepts `fn(err, ...){}` as signature
 * @event `err`: Emits when the promise is rejected
 * @event `complete`: Emits when the promise is fulfilled
 * @api public
 */

function ES6Promise(fn) {
  var _this = this;

  this._callback = fn;

  _promise.call(this, function(resolve, reject) {
    _this.resolve = _this.fulfill = _this.complete = function() {
      if (_this.callback) {
        _this.callback.apply(null, [null].concat(arguments));
      }
      resolve.apply(_this, arguments);
    };
    _this.error = function(e) {
      if (_this.callback) {
        _this.callback(e);
      }
      reject(e);
    };
  });
}

ES6Promise.use = function(Promise) {
  _promise = Promise;
  ES6Promise.prototype = Promise.prototype;
};

ES6Promise.addBack = function(callback) {
  this._callback = fn;
}
