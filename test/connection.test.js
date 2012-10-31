
/**
 * Module dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema

/**
 * Test.
 */

describe('connections:', function(){
  it('should allow closing a closed connection', function(done){
    var db = mongoose.createConnection()
      , called = false;

    assert.equal(0, db.readyState);
    db.close(done);
  })

  it('should accept valid arguments', function(done){
    var db = mongoose.createConnection('mongodb://localhost/fake');
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    assert.equal(undefined, db.pass);
    assert.equal(undefined, db.user);
    assert.equal('fake', db.name);
    assert.equal('localhost', db.host);
    assert.equal(27017, db.port);
    db.close();

    db = mongoose.createConnection('mongodb://localhost:27000/fake');
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(27000, db.port);
    db.close();

    db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake');
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    assert.equal('psw', db.pass);
    assert.equal('aaron', db.user);
    assert.equal('fake', db.name);
    assert.equal('localhost', db.host);
    assert.equal(27000, db.port);
    db.close();

    db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', { db: { forceServerObjectId: true }});
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    db.close();

    db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', { server: { auto_reconnect: false }});
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(false, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    db.close();

    db = mongoose.createConnection('127.0.0.1', 'faker', 28000, { server: { auto_reconnect: true }});
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    assert.equal('faker', db.name);
    assert.equal('127.0.0.1', db.host);
    assert.equal(28000, db.port);
    db.close();

    db = mongoose.createConnection('127.0.0.1', 'faker', 28001);
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    assert.equal('faker', db.name);
    assert.equal('127.0.0.1', db.host);
    assert.equal(28001, db.port);
    db.close();

    db = mongoose.createConnection('127.0.0.1', 'faker', { blah: 1 });
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    assert.equal('faker', db.name);
    assert.equal('127.0.0.1', db.host);
    assert.equal(27017, db.port);
    assert.equal(1, db.options.blah);
    db.close();

    db = mongoose.createConnection('127.0.0.1', 'faker');
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    assert.equal('faker', db.name);
    assert.equal('127.0.0.1', db.host);
    assert.equal(27017, db.port);
    db.close();

    // Test connecting using user/pass in hostname
    db = mongoose.createConnection('aaron:psw@localhost', 'fake', 27000);
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    assert.equal('fake', db.name);
    assert.equal('localhost', db.host);
    assert.equal(27000, db.port);
    assert.equal('psw', db.pass);
    assert.equal('aaron', db.user);
    db.close();

    // Test connecting using user/pass options
    db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'aaron', pass: 'psw'});
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    assert.equal('fake', db.name);
    assert.equal('localhost', db.host);
    assert.equal(27000, db.port);
    assert.equal('psw', db.pass);
    assert.equal('aaron', db.user);
    db.close();

    // Test connecting using only user option - which shouldn't work
    db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'no_pass'});
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    assert.equal('fake', db.name);
    assert.equal('localhost', db.host);
    assert.equal(27000, db.port);
    assert.equal(undefined, db.pass);
    assert.equal(undefined, db.user);
    db.close();
    done();
  });

  describe('missing protocols', function(){
    it('are allowed with replsets', function(done){
      var conn = mongoose.createConnection('localhost:12345,127.0.0.1:14326', function (err) {
        // force missing db error so we don't actually connect.
        assert.ok(err);
      });
      assert.deepEqual(['localhost', '127.0.0.1'], conn.host);
      assert.deepEqual([12345, 14326], conn.port);
      done();
    })
    it('are allowed with single connections', function(done){
      var conn = mongoose.createConnection();
      conn.doOpen = function(){};
      conn.open('localhost:12345/woot');
      assert.deepEqual('localhost', conn.host);
      assert.deepEqual(12345, conn.port);
      done();
    })
  });

  describe('connect callbacks', function(){
    it('execute with user:pwd connection strings', function(done){
      var db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', { server: { auto_reconnect: true }}, function () {
        done();
      });
      db.on('error', function (err) { assert.ok(err) });
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      db.close();
    });
    it('execute without user:pwd connection strings', function(done){
      var db = mongoose.createConnection('mongodb://localhost/fake', done);
      db.on('error', function (err) { assert.ok(err) });
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal(undefined, db.user);
      assert.equal('fake', db.name);
      assert.equal('localhost', db.host);
      assert.equal(27017, db.port);
      db.close();
    });
    it('should return an error if malformed uri passed', function(done){
      var db = mongoose.createConnection('mongodb:///fake', function (err) {
        assert.equal('Missing hostname.', err.message);
        done();
      });
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal(undefined, db.name);
      assert.equal(undefined, db.host);
      assert.equal(undefined, db.port);
      db.close();
    })
    it('should return an error if db was not specified', function(done){
      var db = mongoose.createConnection('mongodb://localhost', function (err) {
        assert.equal('Missing database name.', err.message);
        done();
      });
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal(undefined, db.name);
      assert.equal(undefined, db.host);
      assert.equal(undefined, db.port);
      db.close();
    })
    it('should fire when individual args are passed', function(done){
      var db = mongoose.createConnection('127.0.0.1', 'faker', 28000, { server: { auto_reconnect: false }},function(){
        done();
      });
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(false, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('faker', db.name);
      assert.equal('127.0.0.1', db.host);
      assert.equal(28000, db.port);
      db.close();
    });
    it('should fire when no options are passed', function(done){
      var db = mongoose.createConnection('127.0.0.1', 'faker', 28000, function(){
        done();
      });
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('faker', db.name);
      assert.equal('127.0.0.1', db.host);
      assert.equal(28000, db.port);
      db.close();
    })
    it('should fire when default port utilized', function(done){
      var db = mongoose.createConnection('127.0.0.1', 'faker', done);
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('faker', db.name);
      assert.equal('127.0.0.1', db.host);
      assert.equal(27017, db.port);
      db.close();
    })
  });

  describe('errors', function(){
    it('should be thrown when there are no listeners', function(done){
      var old = process._events.uncaughtException;

      // sidestep mochas listener
      process._events.uncaughtException = function (err) {
        assert.ok(err);
        process._events.uncaughtException = old;
        done()
      }

      var db= start({ uri: 'mongodb://whatever23939.localhost/noooope', noErrorListener: 1 });
    })

    it('should occur without hanging when password with special chars is used (gh-460)', function (done) {
      var db = mongoose.createConnection('mongodb://aaron:psw?@localhost/fake', function (err) {
        assert.ok(err);
        db.close();
        done();
      });
    });
  })

  describe('.model()', function(){
    it('allows passing a schema', function(done){
      var db = start();
      var MyModel = db.model('MyModelasdf', new Schema({
          name: String
      }));
      db.close();

      assert.ok(MyModel.schema instanceof Schema);
      assert.ok(MyModel.prototype.schema instanceof Schema);

      var m = new MyModel({name:'aaron'});
      assert.equal('aaron', m.name);
      done();
    })

    it('should properly assign the db', function(done){
      var A = mongoose.model('testing853a', new Schema({x:String}), 'testing853-1');
      var B = mongoose.model('testing853b', new Schema({x:String}), 'testing853-2');
      var C = B.model('testing853a');
      assert.ok(C == A);
      done();
    })
  })

  it('error event fires with one listener', function(done){
    var db= start({ uri: 'mongodb://localasdfads/fakeeee', noErrorListener: 1 })
    db.on('error', function () {
      // this callback has no params which triggered the bug #759
      done();
    });
  })

  describe('openSet', function(){
    it('accepts uris, dbname, options', function(done){
      var m = new mongoose.Mongoose;
      var uris = process.env.MONGOOSE_SET_TEST_URI;
      if (!uris) return done();

      m.connection.on('error', done);
      m.connection.on('open', function () {
        m.connection.close(done);
      });

      try {
        m.connect(uris, 'mongoose_test', { server: { auto_reconnect: true }});
      } catch (err) {
        done(err);
      }
    })
  })
})

