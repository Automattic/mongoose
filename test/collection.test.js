
var start = require('./common')
  , mongoose = start.mongoose
  , Collection = require('../lib/collection');

module.exports = {

  'test buffering of commands until connection is established': function(beforeExit){
    var db = mongoose.createConnection()
      , collection = db.collection('test-buffering-collection')
      , connected = false
      , inserted = false;

    collection.insert({ }, function(){
      connected.should.be.true;
      inserted = true;
      db.close();
    });

    var uri = 'mongodb://localhost/mongoose_test';
    db.open(process.env.MONGOOSE_TEST_URI || uri, function(err){
      connected = !err;
    });

    beforeExit(function(){
      connected.should.be.true;
      inserted.should.be.true;
    });
  },

  'test methods that should throw (unimplemented)': function () {
    var collection = new Collection('test', mongoose.connection)
      , thrown = false;

    try {
      collection.getIndexes();
    } catch (e) {
      /unimplemented/.test(e.message).should.be.true;
      thrown = true;
    }

    thrown.should.be.true;
    thrown = false;

    try {
      collection.update();
    } catch (e) {
      /unimplemented/.test(e.message).should.be.true;
      thrown = true;
    }

    thrown.should.be.true;
    thrown = false;

    try {
      collection.save();
    } catch (e) {
      /unimplemented/.test(e.message).should.be.true;
      thrown = true;
    }

    thrown.should.be.true;
    thrown = false;

    try {
      collection.insert();
    } catch (e) {
      /unimplemented/.test(e.message).should.be.true;
      thrown = true;
    }

    thrown.should.be.true;
    thrown = false;

    try {
      collection.find();
    } catch (e) {
      /unimplemented/.test(e.message).should.be.true;
      thrown = true;
    }

    thrown.should.be.true;
    thrown = false;

    try {
      collection.findOne();
    } catch (e) {
      /unimplemented/.test(e.message).should.be.true;
      thrown = true;
    }

    thrown.should.be.true;
    thrown = false;

    try {
      collection.findAndModify();
    } catch (e) {
      /unimplemented/.test(e.message).should.be.true;
      thrown = true;
    }

    thrown.should.be.true;
    thrown = false;

    try {
      collection.ensureIndex();
    } catch (e) {
      /unimplemented/.test(e.message).should.be.true;
      thrown = true;
    }

    thrown.should.be.true;
    thrown = false;
  }

};
