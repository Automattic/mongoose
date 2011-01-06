
/**
 * Module requirements.
 *
 */

//var ;

/**
 * Query writer constructor
 *
 * @api private
 */

function Writer () {

};

/**
 * Promise constructor
 *
 * @api public
 */

function Promise () {

};

/**
 * Query constructor
 *
 * @api private
 */

function Query () {

};

/**
 * Extend from Writer.
 *
 */

Query.prototype.__proto__ = Writer.prototype;

/**
 * Module exports
 *
 */

module.exports = Query;
module.exports.Writer = Writer;
module.exports.Promise = Promise;

