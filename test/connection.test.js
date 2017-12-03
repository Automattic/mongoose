/**
 * Module dependencies.
 */

var Promise = require('bluebird');
var Q = require('q');
var assert = require('power-assert');
var server = require('./common').server;
var start = require('./common');

var mongoose = start.mongoose;
var Schema = mongoose.Schema;

/**
 * Test.
 */

describe('connections:', function() {
  describe('openUri (gh-5304)', function() {
    it('with mongoose.createConnection()', function() {
      var conn = mongoose.createConnection('mongodb://localhost:27017/mongoosetest');
      assert.equal(conn.constructor.name, 'NativeConnection');

      var Test = conn.model('Test', new Schema({ name: String }));
      assert.equal(Test.modelName, 'Test');

      var findPromise = Test.findOne();

      assert.equal(typeof conn.catch, 'function');

      return conn.
        then(function(conn) {
          assert.equal(conn.constructor.name, 'NativeConnection');
          assert.equal(conn.host, 'localhost');
          assert.equal(conn.port, 27017);
          assert.equal(conn.name, 'mongoosetest');

          return findPromise;
        }).
        then(function() {
          return conn.close();
        });
    });

    it('with autoIndex (gh-5423)', function(done) {
      var promise = mongoose.createConnection('mongodb://localhost:27017/mongoosetest', {
        autoIndex: false
      });

      promise.then(function(conn) {
        assert.strictEqual(conn.config.autoIndex, false);
        assert.deepEqual(conn._connectionOptions, {});
        done();
      }).catch(done);
    });

    it('resolving with q (gh-5714)', function(done) {
      var bootMongo = Q.defer();

      var conn = mongoose.createConnection('mongodb://localhost:27017/mongoosetest');

      conn.on('connected', function() {
        bootMongo.resolve(this);
      });

      bootMongo.promise.then(function(_conn) {
        assert.equal(_conn, conn);
        done();
      }).catch(done);
    });

    describe('connection events', function() {
      beforeEach(function() {
        this.timeout(25000);
        return server.start().
          then(function() { return server.purge(); });
      });

      afterEach(function() {
        this.timeout(25000);
        return server.stop();
      });

      it('disconnected (gh-5498) (gh-5524)', function(done) {
        this.timeout(25000);

        var conn;
        var numConnected = 0;
        var numDisconnected = 0;
        var numReconnected = 0;
        var numReconnect = 0;
        var numClose = 0;
        conn = mongoose.createConnection('mongodb://localhost:27000/mongoosetest');

        conn.on('connected', function() {
          ++numConnected;
        });
        conn.on('disconnected', function() {
          ++numDisconnected;
        });
        conn.on('reconnect', function() {
          ++numReconnect;
        });
        // Same as `reconnect`, just for backwards compat
        conn.on('reconnected', function() {
          ++numReconnected;
        });
        conn.on('close', function() {
          ++numClose;
        });

        conn.
          then(function() {
            assert.equal(conn.readyState, conn.states.connected);
            assert.equal(numConnected, 1);
            return server.stop();
          }).
          then(function() {
            return new Promise(function(resolve) {
              setTimeout(function() { resolve(); }, 50);
            });
          }).
          then(function() {
            assert.equal(conn.readyState, conn.states.disconnected);
            assert.equal(numDisconnected, 1);
            assert.equal(numReconnected, 0);
            assert.equal(numReconnect, 0);
          }).
          then(function() {
            return server.start();
          }).
          then(function() {
            return new Promise(function(resolve) {
              setTimeout(function() { resolve(); }, 2000);
            });
          }).
          then(function() {
            assert.equal(conn.readyState, conn.states.connected);
            assert.equal(numDisconnected, 1);
            assert.equal(numReconnected, 1);
            assert.equal(numReconnect, 1);
            assert.equal(numClose, 0);

            conn.close();
            done();
          }).
          catch(done);
      });

      it('reconnectFailed (gh-4027)', function(done) {
        this.timeout(25000);

        var conn;
        var numReconnectFailed = 0;
        var numConnected = 0;
        var numDisconnected = 0;
        var numReconnected = 0;
        conn = mongoose.createConnection('mongodb://localhost:27000/mongoosetest', {
          reconnectTries: 3,
          reconnectInterval: 100
        });

        conn.on('connected', function() {
          ++numConnected;
        });
        conn.on('disconnected', function() {
          ++numDisconnected;
        });
        conn.on('reconnected', function() {
          ++numReconnected;
        });
        conn.on('reconnectFailed', function() {
          ++numReconnectFailed;
        });

        conn.
          then(function() {
            assert.equal(numConnected, 1);
            return server.stop();
          }).
          then(function() {
            return new Promise(function(resolve) {
              setTimeout(function() { resolve(); }, 100);
            });
          }).
          then(function() {
            assert.equal(numDisconnected, 1);
            assert.equal(numReconnected, 0);
            assert.equal(numReconnectFailed, 0);
          }).
          then(function() {
            return new Promise(function(resolve) {
              setTimeout(function() { resolve(); }, 400);
            });
          }).
          then(function() {
            assert.equal(numDisconnected, 1);
            assert.equal(numReconnected, 0);
            assert.equal(numReconnectFailed, 1);
          }).
          then(function() {
            return server.start();
          }).
          then(function() {
            return new Promise(function(resolve) {
              setTimeout(function() { resolve(); }, 2000);
            });
          }).
          then(function() {
            assert.equal(numDisconnected, 1);
            assert.equal(numReconnected, 0);
            assert.equal(numReconnectFailed, 1);

            conn.close();
            done();
          }).
          catch(done);
      });

      it('timeout (gh-4513)', function(done) {
        this.timeout(25000);

        var conn;
        var numTimeout = 0;
        var numDisconnected = 0;
        conn = mongoose.createConnection('mongodb://localhost:27000/mongoosetest', {
          socketTimeoutMS: 100,
          poolSize: 1
        });

        conn.on('timeout', function() {
          ++numTimeout;
        });

        conn.on('disconnected', function() {
          ++numDisconnected;
        });

        var Model = conn.model('gh4513', new Schema());

        conn.
          then(function() {
            assert.equal(conn.readyState, conn.states.connected);
            return Model.create({});
          }).
          then(function() {
            return Model.find({ $where: 'sleep(250) || true' });
          }).
          then(function() {
            done(new Error('expected timeout'));
          }).
          catch(function(error) {
            assert.ok(error);
            assert.ok(error.message.indexOf('timed out'), error.message);
            // TODO: if autoReconnect is false, we might not actually be
            // connected. See gh-5634
            assert.equal(conn.readyState, conn.states.connected);
            assert.equal(numTimeout, 1);
            assert.equal(numDisconnected, 0);

            conn.close();
            done();
          });
      });
    });
  });

  describe('helpers', function() {
    var conn;

    before(function() {
      conn = mongoose.createConnection('mongodb://localhost:27017/mongoosetest_2');
      return conn;
    });

    after(function() {
      return conn.close();
    });

    it('dropDatabase()', function(done) {
      conn.dropDatabase(function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('dropCollection()', function() {
      return conn.db.collection('test').insertOne({ x: 1 }).
        then(function() {
          return conn.dropCollection('test');
        }).
        then(function() {
          return conn.db.collection('test').findOne();
        }).
        then(function(doc) {
          assert.ok(!doc);
        });
    });

    it('createCollection()', function() {
      return conn.dropDatabase().
        then(function() {
          return conn.createCollection('gh5712', {
            capped: true,
            size: 1024
          });
        }).
        then(function() {
          return conn.db.listCollections().toArray();
        }).
        then(function(collections) {
          var names = collections.map(function(c) { return c.name; });
          assert.ok(names.indexOf('gh5712') !== -1);
          assert.ok(collections[names.indexOf('gh5712')].options.capped);
          return conn.createCollection('gh5712_0');
        }).
        then(function() {
          return conn.db.listCollections().toArray();
        }).
        then(function(collections) {
          var names = collections.map(function(c) { return c.name; });
          assert.ok(names.indexOf('gh5712') !== -1);
        });
    });
  });

  it('should allow closing a closed connection', function(done) {
    var db = mongoose.createConnection();

    assert.equal(db.readyState, 0);
    db.close(done);
  });

  it('should accept mongodb://localhost/fake', function(done) {
    var db = mongoose.createConnection('mongodb://localhost/fake');
    db.on('error', function() {
    });
    assert.ok(db instanceof mongoose.Connection);
    assert.equal(db.name, 'fake');
    assert.equal(db.host, 'localhost');
    assert.equal(db.port, 27017);
    db.close(done);
  });

  it('should accept mongodb://aaron:psw@localhost:27000/fake', function(done) {
    var db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake');
    db.on('error', function() {
    });
    assert.equal(db.pass, 'psw');
    assert.equal(db.user, 'aaron');
    assert.equal(db.name, 'fake');
    assert.equal(db.host, 'localhost');
    assert.equal(db.port, 27000);
    db.close();
    done();
  });

  it('should accept unix domain sockets', function(done) {
    const host = encodeURIComponent('/tmp/mongodb-27017.sock');
    var db = mongoose.createConnection(`mongodb://aaron:psw@${host}/fake`);
    db.on('error', function() {
    });
    assert.equal(db.name, 'fake');
    assert.equal(db.host, '/tmp/mongodb-27017.sock');
    assert.equal(db.pass, 'psw');
    assert.equal(db.user, 'aaron');
    db.close();
    done();
  });

  describe('errors', function() {
    it('.catch() means error does not get thrown (gh-5229)', function(done) {
      var db = mongoose.createConnection();

      db.openUri('fail connection').catch(function(error) {
        assert.ok(error);
        done();
      });
    });
  });

  describe('connect callbacks', function() {
    it('execute with user:pwd connection strings', function(done) {
      var db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', function() {
        done();
      });
      db.on('error', function(err) {
        assert.ok(err);
      });
      db.close();
    });
    it('execute without user:pwd connection strings', function(done) {
      var db = mongoose.createConnection('mongodb://localhost/fake', function() {
      });
      db.on('error', function(err) {
        assert.ok(err);
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(db.user, undefined);
      assert.equal(db.name, 'fake');
      assert.equal(db.host, 'localhost');
      assert.equal(db.port, 27017);
      db.close();
      setTimeout(done, 10);
    });

    it('should return an error if malformed uri passed', function(done) {
      var db = mongoose.createConnection('mongodb:///fake', function(err) {
        assert.ok(/hostname/.test(err.message));
        done();
      });
      db.close();
      assert.ok(!db.options);
    });
    it('should use admin db if not specified and user/pass specified', function(done) {
      var db = mongoose.createConnection('mongodb://u:p@localhost', function() {
        done();
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(db.name, 'admin');
      assert.equal(db.host, 'localhost');
      assert.equal(db.port, 27017);
      db.close();
    });
  });

  describe('errors', function() {
    it('event fires with one listener', function(done) {
      this.timeout(1000);
      var db = mongoose.createConnection('mongodb://bad.notadomain/fakeeee?connectTimeoutMS=100');
      db.on('error', function() {
        // this callback has no params which triggered the bug #759
        db.close();
        done();
      });
    });

    it('should occur without hanging when password with special chars is used (gh-460)', function(done) {
      mongoose.createConnection('mongodb://aaron:ps#w@localhost/fake?connectTimeoutMS=500', function(err) {
        assert.ok(err);
        done();
      });
    });
  });

  describe('.model()', function() {
    it('allows passing a schema', function(done) {
      var db = start();
      var MyModel = db.model('MyModelasdf', new Schema({
        name: String
      }));
      db.close();

      assert.ok(MyModel.schema instanceof Schema);
      assert.ok(MyModel.prototype.schema instanceof Schema);

      var m = new MyModel({name: 'aaron'});
      assert.equal(m.name, 'aaron');
      done();
    });

    it('should properly assign the db', function(done) {
      var A = mongoose.model('testing853a', new Schema({x: String}), 'testing853-1');
      var B = mongoose.model('testing853b', new Schema({x: String}), 'testing853-2');
      var C = B.model('testing853a');
      assert.ok(C === A);
      done();
    });

    it('prevents overwriting pre-existing models', function(done) {
      var db = start();
      var name = 'gh-1209-a';
      db.model(name, new Schema);

      assert.throws(function() {
        db.model(name, new Schema);
      }, /Cannot overwrite `gh-1209-a` model/);

      db.close();
      done();
    });

    it('allows passing identical name + schema args', function(done) {
      var db = start();
      var name = 'gh-1209-b';
      var schema = new Schema;

      db.model(name, schema);
      assert.doesNotThrow(function() {
        db.model(name, schema);
      });

      db.close();
      done();
    });

    it('throws on unknown model name', function(done) {
      var db = start();
      assert.throws(function() {
        db.model('iDoNotExist!');
      }, /Schema hasn't been registered/);

      db.close();
      done();
    });

    it('uses the passed schema when global model exists with same name (gh-1209)', function(done) {
      var s1 = new Schema({one: String});
      var s2 = new Schema({two: Number});

      var db = start();

      var A = mongoose.model('gh-1209-a', s1);
      var B = db.model('gh-1209-a', s2);

      assert.ok(A.schema !== B.schema);
      assert.ok(A.schema.paths.one);
      assert.ok(B.schema.paths.two);
      assert.ok(!B.schema.paths.one);
      assert.ok(!A.schema.paths.two);

      // reset
      delete db.models['gh-1209-a'];
      var C = db.model('gh-1209-a');
      assert.ok(C.schema === A.schema);

      db.close();
      done();
    });

    describe('get existing model with not existing collection in db', function() {
      it('must return exiting collection with all collection options', function(done) {
        mongoose.model('some-th-1458', new Schema({test: String}, {capped: {size: 1000, max: 10}}));
        var db = start();
        var m = db.model('some-th-1458');
        assert.equal(1000, m.collection.opts.capped.size);
        assert.equal(10, m.collection.opts.capped.max);
        db.close();
        done();
      });
    });

    describe('passing collection name', function() {
      describe('when model name already exists', function() {
        it('returns a new uncached model', function(done) {
          var db = start();
          var s1 = new Schema({a: []});
          var name = 'non-cached-collection-name';
          var A = db.model(name, s1);
          var B = db.model(name);
          var C = db.model(name, 'alternate');
          assert.ok(A.collection.name === B.collection.name);
          assert.ok(A.collection.name !== C.collection.name);
          assert.ok(db.models[name].collection.name !== C.collection.name);
          assert.ok(db.models[name].collection.name === A.collection.name);
          db.close();
          done();
        });
      });
    });

    describe('passing object literal schemas', function() {
      it('works', function(done) {
        var db = start();
        var A = db.model('A', {n: [{age: 'number'}]});
        var a = new A({n: [{age: '47'}]});
        assert.strictEqual(47, a.n[0].age);
        a.save(function(err) {
          assert.ifError(err);
          A.findById(a, function(err) {
            db.close();
            assert.ifError(err);
            assert.strictEqual(47, a.n[0].age);
            done();
          });
        });
      });
    });
  });

  describe('openSet', function() {
    it('accepts uris, dbname, options', function(done) {
      var m = new mongoose.Mongoose;
      var uris = process.env.MONGOOSE_SET_TEST_URI;
      if (!uris) {
        return done();
      }

      m.connection.on('error', done);
      m.connection.on('open', function() {
        m.connection.close(done);
      });

      try {
        m.connect(uris, 'mongoose_test', {server: {auto_reconnect: true}});
      } catch (err) {
        done(err);
      }
    });
    describe('auth', function() {
      it('from uri', function(done) {
        var uris = process.env.MONGOOSE_SET_TEST_URI;
        if (!uris) {
          return done();
        }

        var db = mongoose.createConnection();
        db.openSet('mongodb://aaron:psw@localhost:27000,b,c', {server: {auto_reconnect: false}});
        db.on('error', function() {
        });
        assert.equal(db.user, 'aaron');
        assert.equal(db.pass, 'psw');
        db.close();
        done();
      });
      it('form options', function(done) {
        var uris = process.env.MONGOOSE_SET_TEST_URI;
        if (!uris) {
          return done();
        }

        var db = mongoose.createConnection();
        db.openSet('mongodb://aaron:psw@localhost:27000,b,c', {user: 'tester', pass: 'testpsw'});
        db.on('error', function() {
        });
        assert.equal(db.user, 'tester');
        assert.equal(db.pass, 'testpsw');
        db.close();
        done();
      });
    });

    it('handles unix domain sockets', function(done) {
      const host1 = encodeURIComponent('/tmp/mongodb-27018.sock');
      const host2 = encodeURIComponent('/tmp/mongodb-27019.sock');
      const url = `mongodb://aaron:psw@${host1},${host2}/fake?replicaSet=bacon`;
      const db = mongoose.createConnection(url);
      db.on('error', function() {
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(db.name, 'fake');
      assert.equal(db.host, '/tmp/mongodb-27018.sock,/tmp/mongodb-27019.sock');
      assert.equal(db.pass, 'psw');
      assert.equal(db.user, 'aaron');
      db.close();
      done();
    });

    it('can reopen a disconnected replica set (gh-1263)', function(done) {
      var uris = process.env.MONGOOSE_SET_TEST_URI;
      if (!uris) {
        return done();
      }

      var conn = mongoose.createConnection();

      conn.on('error', done);

      try {
        conn.openSet(uris, 'mongoose_test', {}, function(err) {
          if (err) {
            return done(err);
          }

          conn.close(function(err) {
            if (err) {
              return done(err);
            }

            conn.openSet(uris, 'mongoose_test', {}, function() {
              conn.close(done);
            });
          });
        });
      } catch (err) {
        done(err);
      }
    });
  });

  it('force close (gh-5664)', function(done) {
    var opts = {};
    var db = mongoose.createConnection('mongodb://localhost:27017/test', opts);
    var coll = db.collection('Test');
    db.then(function() {
      setTimeout(function() {
        coll.insertOne({x:1}, function(error) {
          assert.ok(error);
          assert.ok(error.message.indexOf('pool was destroyed') !== -1, error.message);
          done();
        });
      }, 100);

      // Force close
      db.close(true);
    });
  });

  it('force close with connection created after close (gh-5664)', function(done) {
    var opts = {};
    var db = mongoose.createConnection('mongodb://localhost:27017/test', opts);
    db.then(function() {
      setTimeout(function() {
        // TODO: enforce error.message, right now get a confusing error
        /*db.collection('Test').insertOne({x:1}, function(error) {
          assert.ok(error);

          //assert.ok(error.message.indexOf('pool was destroyed') !== -1, error.message);
          done();
        });*/

        var threw = false;
        try {
          db.collection('Test').insertOne({x:1}, function() {});
        } catch (error) {
          threw = true;
          assert.ok(error);
        }

        assert.ok(threw);
        done();
      }, 100);

      // Force close
      db.close(true);
    });
  });

  it('bufferCommands (gh-5720)', function(done) {
    var opts = { bufferCommands: false };
    var db = mongoose.createConnection('mongodb://localhost:27017/test', opts);

    var M = db.model('gh5720', new Schema({}));
    assert.ok(!M.collection.buffer);
    db.close();

    opts = { bufferCommands: true };
    db = mongoose.createConnection('mongodb://localhost:27017/test', opts);
    M = db.model('gh5720', new Schema({}, { bufferCommands: false }));
    assert.ok(!M.collection.buffer);
    db.close();

    opts = { bufferCommands: true };
    db = mongoose.createConnection('mongodb://localhost:27017/test', opts);
    M = db.model('gh5720', new Schema({}));
    assert.ok(M.collection.buffer);
    db.close(done);
  });

  describe('modelNames()', function() {
    it('returns names of all models registered on it', function(done) {
      var m = new mongoose.Mongoose;
      m.model('root', {x: String});
      var another = m.model('another', {x: String});
      another.discriminator('discriminated', new Schema({x: String}));

      var db = m.createConnection();
      db.model('something', {x: String});

      var names = db.modelNames();
      assert.ok(Array.isArray(names));
      assert.equal(names.length, 1);
      assert.equal(names[0], 'something');

      names = m.modelNames();
      assert.ok(Array.isArray(names));
      assert.equal(names.length, 3);
      assert.equal(names[0], 'root');
      assert.equal(names[1], 'another');
      assert.equal(names[2], 'discriminated');

      db.close(done);
    });
  });

  describe('connection pool sharing: ', function() {
    it('works', function(done) {
      var db = mongoose.createConnection('mongodb://localhost/mongoose1');

      var db2 = db.useDb('mongoose2');

      assert.equal('mongoose2', db2.name);
      assert.equal('mongoose1', db.name);

      assert.equal(db2.port, db.port);
      assert.equal(db2.replica, db.replica);
      assert.equal(db2.hosts, db.hosts);
      assert.equal(db2.host, db.host);
      assert.equal(db2.port, db.port);
      assert.equal(db2.user, db.user);
      assert.equal(db2.pass, db.pass);
      assert.deepEqual(db.options, db2.options);

      db2.close(done);
    });

    it('saves correctly', function(done) {
      var db = start();
      var db2 = db.useDb('mongoose-test-2');

      var schema = new Schema({
        body: String,
        thing: Number
      });

      var m1 = db.model('testMod', schema);
      var m2 = db2.model('testMod', schema);

      m1.create({body: 'this is some text', thing: 1}, function(err, i1) {
        assert.ifError(err);
        m2.create({body: 'this is another body', thing: 2}, function(err, i2) {
          assert.ifError(err);

          m1.findById(i1.id, function(err, item1) {
            assert.ifError(err);
            assert.equal('this is some text', item1.body);
            assert.equal(1, item1.thing);

            m2.findById(i2.id, function(err, item2) {
              assert.ifError(err);
              assert.equal('this is another body', item2.body);
              assert.equal(2, item2.thing);

              // validate the doc doesn't exist in the other db
              m1.findById(i2.id, function(err, nothing) {
                assert.ifError(err);
                assert.strictEqual(null, nothing);

                m2.findById(i1.id, function(err, nothing) {
                  assert.ifError(err);
                  assert.strictEqual(null, nothing);

                  db2.close(done);
                });
              });
            });
          });
        });
      });
    });

    it('emits connecting events on both', function(done) {
      var db = mongoose.createConnection();
      var db2 = db.useDb('mongoose-test-2');
      var hit = false;

      db2.on('connecting', function() {
        hit && close();
        hit = true;
      });

      db.on('connecting', function() {
        hit && close();
        hit = true;
      });

      db.openUri(start.uri);

      function close() {
        db.close(done);
      }
    });

    it('emits connected events on both', function(done) {
      var db = mongoose.createConnection();
      var db2 = db.useDb('mongoose-test-2');
      var hit = false;

      db2.on('connected', function() {
        hit && close();
        hit = true;
      });
      db.on('connected', function() {
        hit && close();
        hit = true;
      });

      db.openUri(start.uri);

      function close() {
        db.close(done);
      }
    });

    it('emits open events on both', function(done) {
      var db = mongoose.createConnection();
      var db2 = db.useDb('mongoose-test-2');
      var hit = false;
      db2.on('open', function() {
        hit && close();
        hit = true;
      });
      db.on('open', function() {
        hit && close();
        hit = true;
      });

      db.openUri(start.uri);

      function close() {
        db.close(done);
      }
    });

    it('emits disconnecting events on both, closing initial db', function(done) {
      var db = mongoose.createConnection();
      var db2 = db.useDb('mongoose-test-2');
      var hit = false;
      db2.on('disconnecting', function() {
        hit && done();
        hit = true;
      });
      db.on('disconnecting', function() {
        hit && done();
        hit = true;
      });
      db.on('open', function() {
        db.close();
      });
      db.openUri(start.uri);
    });

    it('emits disconnecting events on both, closing secondary db', function(done) {
      var db = mongoose.createConnection();
      var db2 = db.useDb('mongoose-test-2');
      var hit = false;
      db2.on('disconnecting', function() {
        hit && done();
        hit = true;
      });
      db.on('disconnecting', function() {
        hit && done();
        hit = true;
      });
      db.on('open', function() {
        db2.close();
      });
      db.openUri(start.uri);
    });

    it('emits disconnected events on both, closing initial db', function(done) {
      var db = mongoose.createConnection();
      var db2 = db.useDb('mongoose-test-2');
      var hit = false;
      db2.on('disconnected', function() {
        hit && done();
        hit = true;
      });
      db.on('disconnected', function() {
        hit && done();
        hit = true;
      });
      db.on('open', function() {
        db.close();
      });
      db.openUri(start.uri);
    });

    it('emits disconnected events on both, closing secondary db', function(done) {
      var db = mongoose.createConnection();
      var db2 = db.useDb('mongoose-test-2');
      var hit = false;
      db2.on('disconnected', function() {
        hit && done();
        hit = true;
      });
      db.on('disconnected', function() {
        hit && done();
        hit = true;
      });
      db.on('open', function() {
        db2.close();
      });
      db.openUri(start.uri);
    });

    it('closes correctly for all dbs, closing initial db', function(done) {
      var db = start();
      var db2 = db.useDb('mongoose-test-2');

      db2.on('close', function() {
        done();
      });
      db.close();
    });

    it('closes correctly for all dbs, closing secondary db', function(done) {
      var db = start();
      var db2 = db.useDb('mongoose-test-2');

      db.on('disconnected', function() {
        done();
      });
      db2.close();
    });
  });

  describe('shouldAuthenticate()', function() {
    describe('when using standard authentication', function() {
      describe('when username and password are undefined', function() {
        it('should return false', function(done) {
          var db = mongoose.createConnection('mongodb://localhost:27017/fake', {});
          db.on('error', function() {
          });

          assert.equal(db.shouldAuthenticate(), false);

          db.close();
          done();
        });
      });
      describe('when username and password are empty strings', function() {
        it('should return false', function(done) {
          var db = mongoose.createConnection('mongodb://localhost:27017/fake', {
            user: '',
            pass: ''
          });
          db.on('error', function() {
          });

          assert.equal(db.shouldAuthenticate(), false);

          db.close();
          done();
        });
      });
      describe('when only username is defined', function() {
        it('should return true', function(done) {
          var db = mongoose.createConnection('mongodb://localhost:27017/fake', {
            user: 'user'
          });
          db.on('error', function() {
          });

          assert.equal(db.shouldAuthenticate(), true);

          db.close();
          done();
        });
      });
      describe('when both username and password are defined', function() {
        it('should return true', function(done) {
          var db = mongoose.createConnection('mongodb://localhost:27017/fake', {
            user: 'user',
            pass: 'pass'
          });
          db.on('error', function() {
          });

          assert.equal(db.shouldAuthenticate(), true);

          db.close();
          done();
        });
      });
    });
    describe('when using MONGODB-X509 authentication', function() {
      describe('when username and password are undefined', function() {
        it('should return false', function(done) {
          var db = mongoose.createConnection('mongodb://localhost:27017/fake', {});
          db.on('error', function() {
          });

          assert.equal(db.shouldAuthenticate(), false);

          db.close();
          done();
        });
      });
      describe('when only username is defined', function() {
        it('should return false', function(done) {
          var db = mongoose.createConnection('mongodb://localhost:27017/fake', {
            user: 'user',
            auth: {authMechanism: 'MONGODB-X509'}
          });
          db.on('error', function() {
          });
          assert.equal(db.shouldAuthenticate(), true);

          db.close();
          done();
        });
      });
      describe('when both username and password are defined', function() {
        it('should return false', function(done) {
          var db = mongoose.createConnection('mongodb://localhost:27017/fake', {
            user: 'user',
            pass: 'pass',
            auth: {authMechanism: 'MONGODB-X509'}
          });
          db.on('error', function() {
          });

          assert.equal(db.shouldAuthenticate(), true);

          db.close();
          done();
        });
      });
    });
  });
});
