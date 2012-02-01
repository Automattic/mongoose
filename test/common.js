
/**
 * Module dependencies.
 */

var mongoose = require('../')
  , should = require('should')
  , Table = require('cli-table')
  , Mongoose = mongoose.Mongoose
  , Collection = mongoose.Collection
  , Assertion = should.Assertion
  , startTime = Date.now()
  , queryCount = 0
  , opened = 0
  , closed = 0;

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
 * Assert that a connection is open or that mongoose connections are open.
 * Examples:
 *    mongoose.should.be.connected;
 *    db.should.be.connected;
 *
 * @api public
 */

Assertion.prototype.__defineGetter__('connected', function(){
  if (this.obj instanceof Mongoose)
    this.obj.connections.forEach(function(connected){
      c.should.be.connected;
    });
  else
    this.obj.readyState.should.eql(1);
});

/**
 * Assert that a connection is closed or that a mongoose connections are closed.
 * Examples:
 *    mongoose.should.be.disconnected;
 *    db.should.be.disconnected;
 *
 * @api public
 */

Assertion.prototype.__defineGetter__('disconnected', function(){
  if (this.obj instanceof Mongoose)
    this.obj.connections.forEach(function(){
      c.should.be.disconnected;
    });
  else
    this.obj.readyState.should.eql(0);
});

/**
 * Create a connection to the test database.
 * You can set the environmental variable MONGOOSE_TEST_URI to override this.
 *
 * @api private
 */

module.exports = function (options) {
  var uri;

  if (options && options.uri) {
    uri = options.uri;
    delete options.uri;
  } else {
    uri = process.env.MONGOOSE_TEST_URI ||
          'mongodb://localhost/mongoose_test'
  }

  return mongoose.createConnection(uri, options);
};

/**
 * Provide stats for tests
 */

process.on('beforeExit', function(){
  var table = new Table({
      head: ['Stat', 'Time (ms)']
    , colWidths: [23, 15]
  });

  table.push(
      ['Queries run', queryCount]
    , ['Time ellapsed', Date.now() - startTime]
    , ['Connections opened', opened]
    , ['Connections closed', closed]
  );

  console.error(table.toString());
});

/**
 * Module exports.
 */

module.exports.mongoose = mongoose;
