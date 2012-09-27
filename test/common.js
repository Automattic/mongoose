
/**
 * Module dependencies.
 */

var mongoose = require('../')
  , Mongoose = mongoose.Mongoose
  , Collection = mongoose.Collection
  , assert = require('assert')
  , startTime = Date.now()
  , queryCount = 0
  , opened = 0
  , closed = 0;

if (process.env.D === '1')
  mongoose.set('debug', true);

/**
 * Override all Collection related queries to keep count
 */

[   'ensureIndex'
  , 'findAndModify'
  , 'findOne'
  , 'find'
  , 'insert'
  , 'save'
  , 'update'
  , 'remove'
  , 'count'
  , 'distinct'
  , 'isCapped'
  , 'options'
].forEach(function (method) {

  var oldMethod = Collection.prototype[method];

  Collection.prototype[method] = function () {
    queryCount++;
    return oldMethod.apply(this, arguments);
  };

});

/**
 * Override Collection#onOpen to keep track of connections
 */

var oldOnOpen = Collection.prototype.onOpen;

Collection.prototype.onOpen = function(){
  opened++;
  return oldOnOpen.apply(this, arguments);
};

/**
 * Override Collection#onClose to keep track of disconnections
 */

var oldOnClose = Collection.prototype.onClose;

Collection.prototype.onClose = function(){
  closed++;
  return oldOnClose.apply(this, arguments);
};

/**
 * Create a connection to the test database.
 * You can set the environmental variable MONGOOSE_TEST_URI to override this.
 *
 * @api private
 */

module.exports = function (options) {
  options || (options = {});
  var uri;

  if (options.uri) {
    uri = options.uri;
    delete options.uri;
  } else {
    uri = process.env.MONGOOSE_TEST_URI ||
          'mongodb://localhost/mongoose_test'
  }

  var noErrorListener = !! options.noErrorListener;
  delete options.noErrorListener;

  var conn = mongoose.createConnection(uri, options);

  if (noErrorListener) return conn;

  conn.on('error', function (err) {
    assert.ok(err);
  });

  return conn;
};

/**
 * Module exports.
 */

module.exports.mongoose = mongoose;
