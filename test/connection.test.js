
/**
 * Module dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose;

/**
 * Test.
 */

module.exports = {
  
  'test closing a connection that\'s already closed': function (beforeExit) {
    var db = mongoose.createConnection()
      , called = false;

    db.readyState.should.eql(0);
    db.close(function (err) {
      should.strictEqual(err, null);
      called = true;
    });

    beforeExit(function () {
      called.should.be.true;
    });
  }

};
