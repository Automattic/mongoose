
var url = require('url')
  , start = require('./common')
  , should = require('should')
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
    
    mong.connect(process.env.MONGOOSE_TEST_URI || uri);
    var db = mong.connection;

    db.on('open', function(){
      connections++;
    });

    db.on('close', function () {
      disconnections++;
    });

    var db2 = mong.createConnection(process.env.MONGOOSE_TEST_URI || uri);

    db2.on('open', function () {
      connections++;
    });

    db2.on('close', function () {
      disconnections++;
    });

    mong.disconnect();

    beforeExit(function () {
      connections.should.eql(2);
      disconnections.should.eql(2);
    });
  },

  'test disconnection of all connections callback': function (beforeExit) {
    var mong = new Mongoose()
      , uri = 'mongodb://localhost/mongoose_test'
      , called = false;

    mong.connect(process.env.MONGOOSE_TEST_URI || uri);

    mong.connection.on('open', function () {
      mong.disconnect(function () {
        called = true;
      });
    });

    beforeExit(function () {
      called.should.be.true;
    });
  },

  'try accessing a model that hasn\'t been defined': function () {
    var mong = new Mongoose()
      , thrown = false;

    try {
      mong.model('Test');
    } catch (e) {
      /hasn't been registered/.test(e.message).should.be.true;
      thrown = true;
    }

    thrown.should.be.true;
  },

  'test connecting with a signature of host, database, function': function (){
    var mong = new Mongoose()
      , uri = process.env.MONGOOSE_TEST_URI || 'mongodb://localhost/mongoose_test';

    uri = url.parse(uri);

    mong.connect(uri.hostname, uri.pathname.substr(1), function (err) {
      should.strictEqual(err, null);
      mong.connection.close();
    });
  }

};
