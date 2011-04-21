
/**
 * Module dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema

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
  },

  'connection.model allows passing a schema': function () {
    var db = start();
    var MyModel = db.model('MyModelasdf', new Schema({
        name: String
    }));

    MyModel.schema.should.be.an.instanceof(Schema);
    MyModel.prototype.schema.should.be.an.instanceof(Schema);

    var m = new MyModel({name:'aaron'});
    m.name.should.eql('aaron');
    db.close();
  }

};
