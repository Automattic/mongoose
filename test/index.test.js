
var url = require('url')
  , start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , Mongoose = mongoose.Mongoose
  , Schema = mongoose.Schema
  , random = require('../lib/utils').random
  , collection = 'blogposts_' + random();

mongoose.set('dep warnings', false)
describe('mongoose module:', function(){
  it('default connection works', function(done){
    var db = mongoose.connection
      , uri = 'mongodb://localhost/mongoose_test'

    mongoose.connect(process.env.MONGOOSE_TEST_URI || uri);

    db.on('open', function(){
      db.close(function () {
        done();
      });
    });
  });

  it('{g,s}etting options', function(){
    var mongoose = new Mongoose();

    mongoose.set('a', 'b');
    mongoose.set('long option', 'c');

    assert.equal('b', mongoose.get('a'));
    assert.equal('b', mongoose.set('a'));
    assert.equal('c', mongoose.get('long option'));
  });

  it('declaring global plugins', function(){
    var mong = new Mongoose()
      , schema = new Schema()
      , called = 0;

    mong.plugin(function (s) {
      assert.equal(s, schema);
      called++;
    });

    schema.plugin(function (s) {
      assert.equal(s, schema);
      called++;
    });

    mong.model('GlobalPlugins', schema);

    assert.equal(2, called);
  })

  describe('disconnection of all connections', function(){
    describe('no callback', function(){
      it('works', function (done) {
        var mong = new Mongoose()
          , uri = 'mongodb://localhost/mongoose_test'
          , connections = 0
          , disconnections = 0
          , pending = 4;

        mong.connect(process.env.MONGOOSE_TEST_URI || uri);
        var db = mong.connection;

        function cb () {
          if (--pending) return;
          assert.equal(2, connections);
          assert.equal(2, disconnections);
          done();
        }

        db.on('open', function(){
          connections++;
          cb();
        });

        db.on('close', function () {
          disconnections++;
          cb();
        });

        var db2 = mong.createConnection(process.env.MONGOOSE_TEST_URI || uri);

        db2.on('open', function () {
          connections++;
          cb();
        });

        db2.on('close', function () {
          disconnections++;
          cb();
        });

        mong.disconnect();
      });

      it('properly handles errors', function(){
        var mong = new Mongoose()
          , uri = 'mongodb://localhost/mongoose_test'

        mong.connect(process.env.MONGOOSE_TEST_URI || uri);
        var db = mong.connection;

        // forced failure
        db.close = function (cb) {
          cb(new Error('bam'));
        };

        var failure = {};
        try {
          mong.disconnect();
        } catch (err) {
          failure = err;
        }
        assert.equal('bam', failure.message);
      })
    });

    it('with callback', function(done){
      var mong = new Mongoose()
        , uri = 'mongodb://localhost/mongoose_test'

      mong.connect(process.env.MONGOOSE_TEST_URI || uri);

      mong.connection.on('open', function () {
        mong.disconnect(function () {
          done();
        });
      });
    });
  });

  describe('model()', function(){
    it('accessing a model that hasn\'t been defined', function(){
      var mong = new Mongoose()
        , thrown = false;

      try {
        mong.model('Test');
      } catch (e) {
        assert.ok(/hasn't been registered/.test(e.message));
        thrown = true;
      }

      assert.equal(true, thrown);
    });
    it('returns the model at creation', function(){
      var Named = mongoose.model('Named', new Schema({ name: String }));
      var n1 = new Named();
      assert.equal(n1.name, null);
      var n2 = new Named({ name: 'Peter Bjorn' });
      assert.equal(n2.name, 'Peter Bjorn');

      var schema = new Schema({ number: Number });
      var Numbered = mongoose.model('Numbered', schema, collection);
      var n3 = new Numbered({ number: 1234 });
      assert.equal(1234, n3.number.valueOf());
    });
  });

  it('connecting with a signature of host, database, function', function(done){
    var mong = new Mongoose()
      , uri = process.env.MONGOOSE_TEST_URI || 'mongodb://localhost/mongoose_test';

    uri = url.parse(uri);

    mong.connect(uri.hostname, uri.pathname.substr(1), function (err) {
      assert.ifError(err);
      mong.connection.close();
      done();
    });
  });

  it('goose.connect() to a replica set', function(done){
    var uri = process.env.MONGOOSE_SET_TEST_URI;

    if (!uri) {
      console.log('\033[30m', '\n', 'You\'re not testing replica sets!'
                , '\n', 'Please set the MONGOOSE_SET_TEST_URI env variable.', '\n'
                , 'e.g: `mongodb://localhost:27017/db,mongodb://localhost…`', '\n'
                , '\033[39m');
      return done();
    }

    var mong = new Mongoose();

    mong.connectSet(uri, function (err) {
      assert.ifError(err);

      mong.model('Test', new mongoose.Schema({
          test: String
      }));

      var Test = mong.model('Test')
        , test = new Test();

      test.test = 'aa';
      test.save(function (err) {
        assert.ifError(err);

        Test.findById(test._id, function (err, doc) {
          assert.ifError(err);
          assert.equal('aa', doc.test);
          mong.connection.close();
          done();
        });
      });
    });
  });

  it('goose.createConnection() to a replica set', function(done){
    var uri = process.env.MONGOOSE_SET_TEST_URI;

    if (!uri) return done();

    var mong = new Mongoose();

    var conn = mong.createSetConnection(uri, function (err) {
      assert.ifError(err);

      mong.model('ReplSetTwo', new mongoose.Schema({
          test: String
      }));

      var Test = conn.model('ReplSetTwo')
        , test = new Test();

      test.test = 'aa';
      test.save(function (err) {
        assert.ifError(err);

        Test.findById(test._id, function (err, doc) {
          assert.ifError(err);
          assert.equal('aa', doc.test);
          conn.close();
          done();
        });
      });
    });
  });

  it('public exports', function(){
    assert.equal('string', typeof mongoose.version);
    assert.equal('function', typeof mongoose.Collection);
    assert.equal('function', typeof mongoose.Connection);
    assert.equal('function', typeof mongoose.Schema);
    assert.equal('function', typeof mongoose.SchemaType);
    assert.equal('function', typeof mongoose.Query);
    assert.equal('function', typeof mongoose.Promise);
    assert.equal('function', typeof mongoose.Model);
    assert.equal('function', typeof mongoose.Document);
  })

});
