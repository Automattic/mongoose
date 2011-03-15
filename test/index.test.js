
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
  },

  'test connecting to a replica set': function () {
    var uri = process.env.MONGOOSE_SET_TEST_URI;

    if (!uri) {
      console.log('\033[31m', '\n', 'You\'re not testing for replica sets!'
                , '\n', 'Please set the MONGOOSE_SET_TEST_URI env variable.', '\n'
                , 'e.g: `mongodb://localhost:27017/db,mongodb://localhost…`', '\n'
                , '\033[39m');
      return;
    }

    var mong = new Mongoose();

    mong.connectSet(uri, function (err) {
      should.strictEqual(err, null);

      mong.model('Test', new mongoose.Schema({
          test: String
      }));

      var Test = mong.model('Test')
        , test = new Test();

      test.test = 'aa';
      test.save(function (err) {
        should.strictEqual(err, null);

        Test.findById(test._id, function (err, doc) {
          should.strictEqual(err, null);
          
          doc.test.should.eql('aa');

          mong.connection.close();
        });
      });
    });
  },

  'test initializing a new Connection to a replica set': function () {
    var uri = process.env.MONGOOSE_SET_TEST_URI;

    if (!uri) return;

    var mong = new Mongoose(true);

    var conn = mong.createSetConnection(uri, function (err) {
      should.strictEqual(err, null);

      mong.model('ReplSetTwo', new mongoose.Schema({
          test: String
      }));

      var Test = conn.model('ReplSetTwo')
        , test = new Test();

      test.test = 'aa';
      test.save(function (err) {
        should.strictEqual(err, null);

        Test.findById(test._id, function (err, doc) {
          should.strictEqual(err, null);
          
          doc.test.should.eql('aa');

          conn.close();
        });
      });
    });
  },

  'test public exports': function () {
    mongoose.version.should.be.a('string');
    mongoose.Collection.should.be.a('function');
    mongoose.Connection.should.be.a('function');
    mongoose.Schema.should.be.a('function');
    mongoose.SchemaType.should.be.a('function');
    mongoose.Query.should.be.a('function');
    mongoose.Promise.should.be.a('function');
    mongoose.Model.should.be.a('function');
    mongoose.Document.should.be.a('function');
  }

};
