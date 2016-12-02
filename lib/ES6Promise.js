/**
 * ES6 Promise wrapper constructor.
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
 * @api public
 */

function ES6Promise() {
  throw new Error('Can\'t use ES6 promise with mpromise style constructor');
}

ES6Promise.use = function(Promise) {
  ES6Promise.ES6 = Promise;
};

module.exports = ES6Promise;
