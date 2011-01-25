
var start = require('./common')
  , mongoose = start.mongoose
  , Mongoose = mongoose.Mongoose
  , Schema = mongoose.Schema;

module.exports = {

  'test connecting to the demo database': function(beforeExit){
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

  'test default connection': function(beforeExit){
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

  'test setting options': function(){
    var mongoose = new Mongoose();

    mongoose.set('a', 'b');
    mongoose.set('long option', 'c');

    mongoose.get('a').should.eql('b');
    mongoose.set('a').should.eql('b');
    mongoose.get('long option').should.eql('c');
  },

  'test declaring global plugins': function (beforeExit) {
    var mong = new Mongoose()
      , schema = new Schema()
      , called = 0;

    mong.plugin(function (s) {
      s.should.equal(schema);
      called++;
    });

    schema.plugin(function (s) {
      s.should.equal(schema);
      called++;
    });

    mong.model('GlobalPlugins', schema);

    beforeExit(function () {
      called.should.eql(2);
    });
  },

  'test disconnection of all connections': function (beforeExit) {
    var mong = new Mongoose()
      , uri = 'mongodb://localhost/mongoose_test'
      , connections = 0
      , disconnections = 0;

    var db = mongoose.createConnection(process.env.MONGOOSE_TEST_URI || uri);

    db.on('open', function(){
      connections++;

      process.nextTick(function () {
        db.close();
      });
    });

    db.on('close', function () {
      disconnections++;
    });


    var db2 = mongoose.createConnection(process.env.MONGOOSE_TEST_URI || uri);

    db2.on('open', function () {
      connections++;

      process.nextTick(function () {
        db2.close();
      });
    });

    db2.on('close', function () {
      disconnections++;
    });

    beforeExit(function () {
      connections.should.eql(2);
      disconnections.should.eql(2);
    });
  }

};
