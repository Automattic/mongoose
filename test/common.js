
/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , should = require('should')
  , Mongoose = mongoose.Mongoose
  , Assertion = should.Assertion
  , startTime = Date.now()
  , queryCount = 0
  , connections = 0
  , disconnections = 0;

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

module.exports = function(){
  return mongoose.createConnection(
    process.env.MONGOOSE_TEST_URI || 'mongodb://localhost/mongoose_test'
  );
};

/**
 * Provide stats for tests
 */

//process.on('beforeExit', function(){
  //console.log('Queries run', queryCount);
  //console.log('Time ellapsed', Date.now() - startTime);
  //console.log('Connections opened', connections);
  //console.log('Connections closed', closed);
//});

/**
 * Module exports.
 */

module.exports.mongoose = mongoose;
