
var start = require('./common')
  , mongoose = start.mongoose;

module.exports = {

  'try connecting to the demo database': function(beforeExit){
    var db = start()
      , connected = false;

    db.on('open', function(){
      connected = true;
      db.close();
    });

    beforeExit(function(){
      connected.should.be.true;
    });
  },

  'try default connection': function(beforeExit){
    var db = mongoose.connection
      , uri = 'mongodb://localhost/mongoose_test'
      , connected = false;

    mongoose.connect(process.env.MONGOOSE_TEST_URI || uri);
    db.on('open', function(){
      connected = true;
      db.close();
    });

    beforeExit(function(){
      connected.should.be.true;
    });
  },

  'try setting options': function(){
    mongoose.set('a', 'b');
    mongoose.set('long option', 'c');

    mongoose.get('a').should.eql('b');
    mongoose.set('a').should.eql('b');
    mongoose.get('long option').should.eql('c');
  }

};
