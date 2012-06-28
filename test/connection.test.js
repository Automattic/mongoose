
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

  it('should accept valid arguments', function(){
    var db = mongoose.createConnection('mongodb://localhost/fake');
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
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(27000, db.port);
    db.close();

    db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake');
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
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    db.close();

    db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', { server: { auto_reconnect: false }});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(false, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    db.close();

    db = mongoose.createConnection('127.0.0.1', 'faker', 28000, { server: { auto_reconnect: true }});
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
  });

  describe('missing protocols', function(){
    it('are allowed with replsets', function(){
      var conn = mongoose.createSetConnection('localhost:12345,127.0.0.1:14326', function (err) {
        // force missing db error so we don't actually connect.
        assert.ok(err);
      });
      assert.deepEqual(['localhost', '127.0.0.1'], conn.host);
      assert.deepEqual([12345, 14326], conn.port);
    })
    it('are allowed with single connections', function(){
      var conn = mongoose.createConnection();
      conn.doOpen = function(){};
      conn.open('localhost:12345/woot');
      assert.deepEqual('localhost', conn.host);
      assert.deepEqual(12345, conn.port);
    })

  });

  describe('connect callbacks', function(){
    it('execute with user:pwd connection strings', function(done){
      var db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', { server: { auto_reconnect: true }}, function () {
        done();
      });
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      db.close();
    });
    it('execute without user:pwd connection strings', function(done){
      var db = mongoose.createConnection('mongodb://localhost/fake', done);
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
        assert.equal('Missing connection hostname.', err.message);
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
        assert.equal('Missing connection database.', err.message);
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

  describe('.model()', function(){
    it('allows passing a schema', function(){
      var db = start();
      var MyModel = db.model('MyModelasdf', new Schema({
          name: String
      }));
      db.close();

      assert.ok(MyModel.schema instanceof Schema);
      assert.ok(MyModel.prototype.schema instanceof Schema);

      var m = new MyModel({name:'aaron'});
      assert.equal('aaron', m.name);
    })
    it('should properly assign the db', function(){
      var A = mongoose.model('testing853a', new Schema({x:String}), 'testing853-1');
      var B = mongoose.model('testing853b', new Schema({x:String}), 'testing853-2');
      var C = B.model('testing853a');
      assert.ok(C == A);
    })
  })

  it('error event fires with one listener', function(done){
    var db= start({ uri: 'mongodb://localasdfads/fakeeee'})
    db.on('error', function () {
      // this callback has no params which triggered the bug #759
      done();
    });
  })
})

