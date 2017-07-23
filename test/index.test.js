
var url = require('url'),
    start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    Mongoose = mongoose.Mongoose,
    Schema = mongoose.Schema,
    random = require('../lib/utils').random,
    collection = 'blogposts_' + random();

describe('mongoose module:', function() {
  describe('default connection works', function() {
    it('without options', function(done) {
      var goose = new Mongoose;
      var db = goose.connection,
          uri = 'mongodb://localhost/mongoose_test';

      goose.connect(process.env.MONGOOSE_TEST_URI || uri);

      db.on('open', function() {
        db.close(function() {
          done();
        });
      });
    });

    it('with options', function(done) {
      var goose = new Mongoose;
      var db = goose.connection,
          uri = 'mongodb://localhost/mongoose_test';

      goose.connect(process.env.MONGOOSE_TEST_URI || uri, {db: {safe: false}});

      db.on('open', function() {
        db.close(function() {
          done();
        });
      });
    });

    it('with promise (gh-3790)', function(done) {
      var goose = new Mongoose;
      var db = goose.connection,
          uri = 'mongodb://localhost/mongoose_test';

      goose.connect(process.env.MONGOOSE_TEST_URI || uri).then(function() {
        db.close(done);
      });
    });
  });

  it('{g,s}etting options', function(done) {
    var mongoose = new Mongoose();

    mongoose.set('a', 'b');
    mongoose.set('long option', 'c');

    assert.equal(mongoose.get('a'), 'b');
    assert.equal(mongoose.set('a'), 'b');
    assert.equal(mongoose.get('long option'), 'c');
    done();
  });

  it('declaring global plugins', function(done) {
    var mong = new Mongoose();
    var subSchema = new Schema({});
    var schema = new Schema({
      test: [subSchema]
    });
    var called = 0;

    var calls = [];
    var preSaveCalls = 0;
    mong.plugin(function(s) {
      calls.push(s);

      s.pre('save', function(next) {
        ++preSaveCalls;
        next();
      });
    });

    schema.plugin(function(s) {
      assert.equal(s, schema);
      called++;
    });

    var M = mong.model('GlobalPlugins', schema);

    assert.equal(called, 1);
    assert.equal(calls.length, 2);
    assert.equal(calls[0], schema);
    assert.equal(calls[1], subSchema);

    assert.equal(preSaveCalls, 0);
    mong.connect(start.uri, { useMongoClient: true });
    M.create({ test: {} }, function(error) {
      assert.ifError(error);
      assert.equal(preSaveCalls, 2);
      mong.disconnect();
      done();
    });
  });

  describe('disconnection of all connections', function() {
    describe('no callback', function() {
      it('works', function(done) {
        var mong = new Mongoose(),
            uri = 'mongodb://localhost/mongoose_test',
            connections = 0,
            disconnections = 0,
            pending = 4;

        mong.connect(process.env.MONGOOSE_TEST_URI || uri);
        var db = mong.connection;

        function cb() {
          if (--pending) return;
          assert.equal(connections, 2);
          assert.equal(disconnections, 2);
          done();
        }

        db.on('open', function() {
          connections++;
          cb();
        });

        db.on('close', function() {
          disconnections++;
          cb();
        });

        var db2 = mong.createConnection(process.env.MONGOOSE_TEST_URI || uri);

        db2.on('open', function() {
          connections++;
          cb();
        });

        db2.on('close', function() {
          disconnections++;
          cb();
        });

        mong.disconnect();
      });

      it('properly handles errors', function(done) {
        var mong = new Mongoose(),
            uri = 'mongodb://localhost/mongoose_test';

        mong.connect(process.env.MONGOOSE_TEST_URI || uri);
        var db = mong.connection;

        // forced failure
        db.close = function(cb) {
          cb(new Error('bam'));
        };

        mong.disconnect().connection.
          on('error', function(error) {
            assert.equal(error.message, 'bam');
          });

        done();
      });
    });

    it('with callback', function(done) {
      var mong = new Mongoose(),
          uri = 'mongodb://localhost/mongoose_test';

      mong.connect(process.env.MONGOOSE_TEST_URI || uri);

      mong.connection.on('open', function() {
        mong.disconnect(function() {
          done();
        });
      });
    });

    it('with promise (gh-3790)', function(done) {
      var mong = new Mongoose();
      var uri = 'mongodb://localhost/mongoose_test';

      mong.connect(process.env.MONGOOSE_TEST_URI || uri);

      mong.connection.on('open', function() {
        mong.disconnect().then(function() { done(); });
      });
    });
  });

  describe('model()', function() {
    it('accessing a model that hasn\'t been defined', function(done) {
      var mong = new Mongoose(),
          thrown = false;

      try {
        mong.model('Test');
      } catch (e) {
        assert.ok(/hasn't been registered/.test(e.message));
        thrown = true;
      }

      assert.equal(thrown, true);
      done();
    });

    it('returns the model at creation', function(done) {
      var Named = mongoose.model('Named', new Schema({name: String}));
      var n1 = new Named();
      assert.equal(n1.name, null);
      var n2 = new Named({name: 'Peter Bjorn'});
      assert.equal(n2.name, 'Peter Bjorn');

      var schema = new Schema({number: Number});
      var Numbered = mongoose.model('Numbered', schema, collection);
      var n3 = new Numbered({number: 1234});
      assert.equal(n3.number.valueOf(), 1234);
      done();
    });

    it('prevents overwriting pre-existing models', function(done) {
      var m = new Mongoose;
      m.model('A', new Schema);

      assert.throws(function() {
        m.model('A', new Schema);
      }, /Cannot overwrite `A` model/);

      done();
    });

    it('allows passing identical name + schema args', function(done) {
      var m = new Mongoose;
      var schema = new Schema;
      m.model('A', schema);

      assert.doesNotThrow(function() {
        m.model('A', schema);
      });

      done();
    });

    it('throws on unknown model name', function(done) {
      assert.throws(function() {
        mongoose.model('iDoNotExist!');
      }, /Schema hasn't been registered/);

      done();
    });

    describe('passing collection name', function() {
      describe('when model name already exists', function() {
        it('returns a new uncached model', function(done) {
          var m = new Mongoose;
          var s1 = new Schema({a: []});
          var name = 'non-cached-collection-name';
          var A = m.model(name, s1);
          var B = m.model(name);
          var C = m.model(name, 'alternate');
          assert.ok(A.collection.name === B.collection.name);
          assert.ok(A.collection.name !== C.collection.name);
          assert.ok(m.models[name].collection.name !== C.collection.name);
          assert.ok(m.models[name].collection.name === A.collection.name);
          done();
        });
      });
    });

    describe('passing object literal schemas', function() {
      it('works', function(done) {
        var m = new Mongoose;
        var A = m.model('A', {n: [{age: 'number'}]});
        var a = new A({n: [{age: '47'}]});
        assert.strictEqual(47, a.n[0].age);
        done();
      });
    });
  });

  it('connecting with a signature of host, database, function', function(done) {
    var mong = new Mongoose(),
        uri = process.env.MONGOOSE_TEST_URI || 'mongodb://localhost/mongoose_test';

    uri = url.parse(uri);

    mong.connect(uri.hostname, uri.pathname.substr(1), function(err) {
      assert.ifError(err);
      mong.connection.close();
      done();
    });
  });

  describe('connecting with a signature of uri, options, function', function() {
    it('with single mongod', function(done) {
      var mong = new Mongoose(),
          uri = process.env.MONGOOSE_TEST_URI || 'mongodb://localhost/mongoose_test';

      mong.connect(uri, {db: {safe: false}}, function(err) {
        assert.ifError(err);
        mong.connection.close();
        done();
      });
    });

    it('with replica set', function(done) {
      var mong = new Mongoose(),
          uri = process.env.MONGOOSE_SET_TEST_URI;

      if (!uri) return done();

      mong.connect(uri, {db: {safe: false}}, function(err) {
        assert.ifError(err);
        mong.connection.close();
        done();
      });
    });
  });

  it('goose.connect() to a replica set', function(done) {
    var uri = process.env.MONGOOSE_SET_TEST_URI;

    if (!uri) {
      console.log('\033[31m', '\n', 'You\'re not testing replica sets!'
                , '\n', 'Please set the MONGOOSE_SET_TEST_URI env variable.', '\n'
                , 'e.g: `mongodb://localhost:27017/db,localhost…`', '\n'
                , '\033[39m');
      return done();
    }

    var mong = new Mongoose();

    mong.connect(uri, function(err) {
      assert.ifError(err);

      mong.model('Test', new mongoose.Schema({
        test: String
      }));

      var Test = mong.model('Test'),
          test = new Test();

      test.test = 'aa';
      test.save(function(err) {
        assert.ifError(err);

        Test.findById(test._id, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.test, 'aa');
          mong.connection.close();
          complete();
        });
      });
    });

    mong.connection.on('fullsetup', complete);

    var pending = 2;
    function complete() {
      if (--pending) return;
      done();
    }
  });

  it('goose.createConnection() to a replica set', function(done) {
    var uri = process.env.MONGOOSE_SET_TEST_URI;

    if (!uri) return done();

    var mong = new Mongoose();

    var conn = mong.createConnection(uri, function(err) {
      assert.ifError(err);

      mong.model('ReplSetTwo', new mongoose.Schema({
        test: String
      }));

      var Test = conn.model('ReplSetTwo'),
          test = new Test();

      test.test = 'aa';
      test.save(function(err) {
        assert.ifError(err);

        Test.findById(test._id, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.test, 'aa');
          conn.close();
          complete();
        });
      });
    });

    conn.on('fullsetup', complete);

    var pending = 2;
    function complete() {
      if (--pending) return;
      done();
    }
  });

  describe('exports', function() {
    function test(mongoose) {
      assert.equal(typeof mongoose.version, 'string');
      assert.equal(typeof mongoose.Mongoose, 'function');
      assert.equal(typeof mongoose.Collection, 'function');
      assert.equal(typeof mongoose.Connection, 'function');
      assert.equal(typeof mongoose.Schema, 'function');
      assert.ok(mongoose.Schema.Types);
      assert.equal(typeof mongoose.SchemaType, 'function');
      assert.equal(typeof mongoose.Query, 'function');
      assert.equal(typeof mongoose.Promise, 'function');
      assert.equal(typeof mongoose.Model, 'function');
      assert.equal(typeof mongoose.Document, 'function');
      assert.equal(typeof mongoose.Error, 'function');
      assert.equal(typeof mongoose.Error.CastError, 'function');
      assert.equal(typeof mongoose.Error.ValidationError, 'function');
      assert.equal(typeof mongoose.Error.ValidatorError, 'function');
      assert.equal(typeof mongoose.Error.VersionError, 'function');
    }

    it('of module', function(done) {
      test(mongoose);
      done();
    });

    it('of new Mongoose instances', function(done) {
      test(new mongoose.Mongoose);
      done();
    });

    it('of result from .connect() (gh-3940)', function(done) {
      var m = new mongoose.Mongoose;
      test(m.connect('mongodb://localhost:27017'));
      m.disconnect();
      done();
    });
  });
});
