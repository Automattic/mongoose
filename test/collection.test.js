
var start = require('./common')
  , mongoose = start.mongoose
  , Collection = require('../lib/mongoose/connection');

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

    process.nextTick(function(){
      var uri = 'mongodb://localhost/mongoose_test';
      db.open(process.env.MONGOOSE_TEST_URI || uri, function(err){
        connected = !err;
      });
    });

    beforeExit(function(){
      connected.should.be.true;
      inserted.should.be.true;
    });
  }

};
