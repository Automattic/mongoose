/**
 * Module dependencies.
 */

var Promise = require('bluebird');
var assert = require('power-assert');
var muri = require('muri');
var random = require('../lib/utils').random;
var server = require('./common').server;
var start = require('./common');

var mongoose = start.mongoose;
var Schema = mongoose.Schema;

/**
 * Test.
 */

describe('connections:', function() {
  describe('useMongoClient/openUri (gh-5304)', function() {
    it('with mongoose.connect()', function(done) {
      var conn = mongoose.connect('mongodb://localhost:27017/mongoosetest', {
        useMongoClient: true
      });
      assert.equal(conn.constructor.name, 'NativeConnection');

      conn.then(function(conn) {
        assert.equal(conn.constructor.name, 'NativeConnection');
        assert.equal(conn.host, 'localhost');
        assert.equal(conn.port, 27017);
        assert.equal(conn.name, 'mongoosetest');

        return mongoose.disconnect().then(function() { done(); });
      }).catch(done);
    });

    it('with mongoose.createConnection()', function(done) {
      var conn = mongoose.createConnection('mongodb://localhost:27017/mongoosetest', {
        useMongoClient: true
      });
      assert.equal(conn.constructor.name, 'NativeConnection');

      var Test = conn.model('Test', new Schema({ name: String }));
      assert.equal(Test.modelName, 'Test');

      var findPromise = Test.findOne();

      assert.equal(typeof conn.catch, 'function');

      conn.
        then(function(conn) {
          assert.equal(conn.constructor.name, 'NativeConnection');
          assert.equal(conn.host, 'localhost');
          assert.equal(conn.port, 27017);
          assert.equal(conn.name, 'mongoosetest');

          return findPromise;
        }).
        then(function() {
          return mongoose.disconnect().then(function() { done(); });
        }).
        catch(done);
    });

    it('with autoIndex (gh-5423)', function(done) {
      var promise = mongoose.createConnection('mongodb://localhost:27017/mongoosetest', {
        useMongoClient: true,
        config: { autoIndex: false }
      });

      promise.then(function(conn) {
        assert.strictEqual(conn.config.autoIndex, false);
        assert.deepEqual(conn._connectionOptions, {});
        done();
      }).catch(done);
    });

    describe('connection events', function() {
      beforeEach(function() {
        this.timeout(10000);
        return server.start().
          then(function() { return server.purge(); });
      });

      afterEach(function() {
        this.timeout(10000);
        return server.stop();
      });

      it('disconnected (gh-5498) (gh-5524)', function(done) {
        this.timeout(25000);

        var conn;
        var numConnected = 0;
        var numDisconnected = 0;
        var numReconnected = 0;
        var numClose = 0;
        conn = mongoose.createConnection('mongodb://localhost:27000/mongoosetest', {
          useMongoClient: true
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
          useMongoClient: true,
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
          useMongoClient: true,
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
      conn = mongoose.connect('mongodb://localhost:27017/mongoosetest_2', {
        useMongoClient: true
      });
      return conn;
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
    assert.equal(typeof db.options, 'object');
    assert.equal(typeof db.options.server, 'object');
    assert.equal(db.options.server.auto_reconnect, true);
    assert.equal(typeof db.options.db, 'object');
    assert.equal(db.options.db.forceServerObjectId, false);
    assert.equal(db.pass, undefined);
    assert.equal(db.user, undefined);
    assert.equal(db.name, 'fake');
    assert.equal(db.host, 'localhost');
    assert.equal(db.port, 27017);
    db.close(done);
  });

  it('should accept replicaSet query param', function(done) {
    var db = mongoose.createConnection('mongodb://localhost/fake?replicaSet=rs0');
    db.on('error', function() {
    });
    assert.equal(typeof db.options, 'object');
    assert.equal(typeof db.options.server, 'object');
    assert.equal(db.options.server.auto_reconnect, true);
    assert.equal(typeof db.options.db, 'object');
    assert.equal(db.options.db.forceServerObjectId, false);
    assert.equal(db.pass, void 0);
    assert.equal(db.user, void 0);
    assert.equal('fake', db.name);
    assert.deepEqual(db.hosts, [{host: 'localhost', port: 27017}]);

    // Should be a replica set
    assert.ok(db.replica);
    db.close();
    done();
  });

  it('should accept mongodb://localhost:27000/fake', function(done) {
    var db = mongoose.createConnection('mongodb://localhost:27000/fake');
    db.on('error', function() {
    });
    assert.equal(typeof db.options, 'object');
    assert.equal(typeof db.options.server, 'object');
    assert.equal(db.options.server.auto_reconnect, true);
    assert.equal(typeof db.options.db, 'object');
    assert.equal(db.port, 27000);
    db.close();
    done();
  });

  it('should accept mongodb://aaron:psw@localhost:27000/fake', function(done) {
    var db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake');
    db.on('error', function() {
    });
    assert.equal(typeof db.options, 'object');
    assert.equal(typeof db.options.server, 'object');
    assert.equal(db.options.server.auto_reconnect, true);
    assert.equal(typeof db.options.db, 'object');
    assert.equal(db.options.db.forceServerObjectId, false);
    assert.equal(db.pass, 'psw');
    assert.equal(db.user, 'aaron');
    assert.equal(db.name, 'fake');
    assert.equal(db.host, 'localhost');
    assert.equal(db.port, 27000);
    db.close();
    done();
  });

  it('should accept mongodb://aaron:psw@localhost:27000/fake with db options', function(done) {
    var db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', {db: {forceServerObjectId: true}});
    db.on('error', function() {
    });
    assert.equal(typeof db.options, 'object');
    assert.equal(typeof db.options.server, 'object');
    assert.equal(db.options.server.auto_reconnect, true);
    assert.equal(typeof db.options.db, 'object');
    assert.equal(db.options.db.forceServerObjectId, false);
    db.close();
    done();
  });

  it('should accept mongodb://aaron:psw@localhost:27000/fake with server options', function(done) {
    var db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', {server: {auto_reconnect: false}});
    db.on('error', function() {
    });
    assert.equal(typeof db.options, 'object');
    assert.equal(typeof db.options.server, 'object');
    assert.equal(db.options.server.auto_reconnect, false);
    assert.equal(typeof db.options.db, 'object');
    assert.equal(db.options.db.forceServerObjectId, false);
    db.close();
    done();
  });

  it('should accept unix domain sockets', function(done) {
    var db = mongoose.createConnection('mongodb://aaron:psw@/tmp/mongodb-27017.sock/fake', {server: {auto_reconnect: false}});
    db.on('error', function() {
    });
    assert.equal(typeof db.options, 'object');
    assert.equal(typeof db.options.server, 'object');
    assert.equal(db.options.server.auto_reconnect, false);
    assert.equal(typeof db.options.db, 'object');
    assert.equal(db.options.db.forceServerObjectId, false);
    assert.equal(db.name, 'fake');
    assert.equal(db.host, '/tmp/mongodb-27017.sock');
    assert.equal(db.pass, 'psw');
    assert.equal(db.user, 'aaron');
    db.close();
    done();
  });

  describe('re-opening a closed connection', function() {
    var mongos = process.env.MONGOOSE_SHARD_TEST_URI;
    if (!mongos) {
      return;
    }

    var mongod = 'mongodb://localhost:27017';

    describe('with different host/port', function() {
      it('non-replica set', function(done) {
        var db = mongoose.createConnection();

        db.open(mongod, function(err) {
          if (err) {
            return done(err);
          }

          var port1 = db.port;
          var db1 = db.db;

          db.close(function(err) {
            if (err) {
              return done(err);
            }

            db.open(mongos, function(err) {
              if (err) {
                return done(err);
              }

              assert.notEqual(port1, db.port);
              assert.ok(db1 !== db.db);
              assert.ok(db1.serverConfig.port !== db.db.serverConfig.port);

              var port2 = db.port;
              var db2 = db.db;

              db.close(function(err) {
                if (err) {
                  return done(err);
                }
                db.open(mongod, function(err) {
                  if (err) {
                    return done(err);
                  }

                  assert.notEqual(port2, db.port);
                  assert.ok(db2 !== db.db);
                  assert.ok(db2.serverConfig.port !== db.db.serverConfig.port);

                  db.close(done);
                });
              });
            });
          });
        });
      });
    });
  });

  describe('errors', function() {
    it('.catch() means error does not get thrown (gh-5229)', function(done) {
      var db = mongoose.createConnection();

      db.open('fail connection').catch(function(error) {
        assert.ok(error);
        done();
      });
    });
  });

  describe('should accept separated args with options', function() {
    it('works', function(done) {
      var db = mongoose.createConnection('127.0.0.1', 'faker', 28000, {server: {auto_reconnect: true}});
      db.on('error', function() {
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'faker');
      assert.equal(db.host, '127.0.0.1');
      assert.equal(db.port, 28000);
      db.close();

      db = mongoose.createConnection('127.0.0.1', 'faker', {blah: 1});
      db.on('error', function() {
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'faker');
      assert.equal(db.host, '127.0.0.1');
      assert.equal(db.port, 27017);
      assert.equal(db.options.blah, 1);
      db.close();
      done();
    });

    it('including user/pass', function(done) {
      var db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'aaron', pass: 'psw'});
      db.on('error', function() {
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'fake');
      assert.equal(db.host, 'localhost');
      assert.equal(db.port, 27000);
      assert.equal(db.pass, 'psw');
      assert.equal(db.user, 'aaron');
      db.close();
      done();
    });

    it('but fails when passing user and no pass with standard authentication', function(done) {
      var db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'no_pass'});
      db.on('error', function() {
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'fake');
      assert.equal(db.host, 'localhost');
      assert.equal(db.port, 27000);
      assert.equal(db.pass, undefined);
      assert.equal(db.user, undefined);
      db.close();
      done();
    });

    it('but passes when passing user and no pass with the MONGODB-X509 authMechanism', function(done) {
      var db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'no_pass', auth: {authMechanism: 'MONGODB-X509'}});
      db.on('error', function() {
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'fake');
      assert.equal(db.host, 'localhost');
      assert.equal(db.port, 27000);
      assert.equal(db.pass, undefined);
      assert.equal(db.user, 'no_pass');
      db.close();
      done();
    });
  });

  describe('should accept separated args without options', function() {
    it('works', function(done) {
      var db = mongoose.createConnection('127.0.0.1', 'faker', 28001);
      db.on('error', function() {
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'faker');
      assert.equal(db.host, '127.0.0.1');
      assert.equal(db.port, 28001);
      db.close();

      db = mongoose.createConnection('127.0.0.1', 'faker');
      db.on('error', function() {
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'faker');
      assert.equal(db.host, '127.0.0.1');
      assert.equal(db.port, 27017);
      db.close();
      done();
    });
    it('and accept user/pass in hostname', function(done) {
      var db = mongoose.createConnection('aaron:psw@localhost', 'fake', 27000);
      db.on('error', function() {
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'fake');
      assert.equal(db.host, 'localhost');
      assert.equal(db.port, 27000);
      assert.equal(db.pass, 'psw');
      assert.equal(db.user, 'aaron');
      db.close();
      done();
    });
  });

  describe('querystring options', function() {
    describe('for replica sets', function() {
      it('work', function(done) {
        var conn = 'mongodb://localhost/fake?autoReconnect=false&poolSize=2'
            + '&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12'
            + '&retries=10&reconnectWait=5&rs_name=replworld&readSecondary=true'
            + '&nativeParser=false&w=2&safe=true&fsync=true&journal=true'
            + '&wtimeoutMS=80&readPreference=nearest&readPreferenceTags='
            + 'dc:ny,rack:1&readPreferenceTags=dc:sf&sslValidate=true';

        var db = mongoose.createConnection(conn);
        db.on('error', function() {
        });
        db.close();
        assert.equal(typeof db.options, 'object');
        assert.equal(typeof db.options.server, 'object');
        assert.equal(typeof db.options.server.socketOptions, 'object');
        assert.equal(typeof db.options.db, 'object');
        assert.equal(typeof db.options.replset, 'object');
        assert.equal(typeof db.options.replset.socketOptions, 'object');
        assert.equal(db.options.mongos, undefined);
        assert.equal(db.options.server.auto_reconnect, false);
        assert.equal(db.options.server.poolSize, 2);
        assert.equal(db.options.server.slave_ok, false);
        assert.equal(db.options.server.ssl, true);
        assert.equal(db.options.replset.ssl, true);
        assert.equal(db.options.server.socketOptions.socketTimeoutMS, 10);
        assert.equal(db.options.replset.socketOptions.socketTimeoutMS, 10);
        assert.equal(db.options.server.socketOptions.connectTimeoutMS, 12);
        assert.equal(db.options.replset.socketOptions.connectTimeoutMS, 12);
        assert.equal(db.options.replset.retries, 10);
        assert.equal(db.options.replset.reconnectWait, 5);
        assert.equal(db.options.replset.rs_name, 'replworld');
        assert.equal(db.options.replset.read_secondary, true);
        assert.equal(db.options.db.native_parser, false);
        assert.equal(db.options.db.w, 2);
        assert.equal(db.options.db.safe, true);
        assert.equal(db.options.db.fsync, true);
        assert.equal(db.options.db.journal, true);
        assert.equal(db.options.db.wtimeoutMS, 80);
        assert.equal(db.options.db.readPreference, 'nearest');
        assert.deepEqual([{dc: 'ny', rack: 1}, {dc: 'sf'}], db.options.db.read_preference_tags);
        assert.equal(db.options.db.forceServerObjectId, false);
        assert.strictEqual(db.options.server.sslValidate, true);
        done();
      });
      it('mixed with passed options', function(done) {
        var conn = 'mongodb://localhost/fake?poolSize=2'
            + '&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12'
            + '&retries=10&reconnectWait=5&rs_name=replworld&readSecondary=true'
            + '&nativeParser=false&w=2&safe=true&fsync=true&journal=true'
            + '&wtimeoutMS=80&readPreference=nearest&readPreferenceTags='
            + 'dc:ny,rack:1&readPreferenceTags=dc:sf';

        var db = mongoose.createConnection(conn, {server: {poolSize: 3, auto_reconnect: false}});
        db.on('error', function() {
        });
        db.close();
        assert.equal(typeof db.options, 'object');
        assert.equal(typeof db.options.server, 'object');
        assert.equal(typeof db.options.server.socketOptions, 'object');
        assert.equal(typeof db.options.db, 'object');
        assert.equal(typeof db.options.replset, 'object');
        assert.equal(typeof db.options.replset.socketOptions, 'object');
        assert.equal(db.options.mongos, undefined);
        assert.equal(db.options.server.auto_reconnect, false);
        assert.equal(db.options.server.poolSize, 3);
        assert.equal(db.options.server.slave_ok, false);
        assert.equal(db.options.server.ssl, true);
        assert.equal(db.options.replset.ssl, true);
        assert.equal(db.options.server.socketOptions.socketTimeoutMS, 10);
        assert.equal(db.options.replset.socketOptions.socketTimeoutMS, 10);
        assert.equal(db.options.server.socketOptions.connectTimeoutMS, 12);
        assert.equal(db.options.replset.socketOptions.connectTimeoutMS, 12);
        assert.equal(db.options.replset.retries, 10);
        assert.equal(db.options.replset.reconnectWait, 5);
        assert.equal(db.options.replset.rs_name, 'replworld');
        assert.equal(db.options.replset.read_secondary, true);
        assert.equal(db.options.db.native_parser, false);
        assert.equal(db.options.db.w, 2);
        assert.equal(db.options.db.safe, true);
        assert.equal(db.options.db.fsync, true);
        assert.equal(db.options.db.journal, true);
        assert.equal(db.options.db.wtimeoutMS, 80);
        assert.equal(db.options.db.readPreference, 'nearest');
        assert.deepEqual([{dc: 'ny', rack: 1}, {dc: 'sf'}], db.options.db.read_preference_tags);
        assert.equal(db.options.db.forceServerObjectId, false);

        done();
      });
    });
    describe('for non replica sets', function() {
      it('work', function(done) {
        var conn = 'mongodb://localhost/fake?autoReconnect=false&poolSize=2'
            + '&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12'
            + '&retries=10&reconnectWait=5&readSecondary=true'
            + '&nativeParser=false&w=2&safe=true&fsync=true&journal=true'
            + '&wtimeoutMS=80&';

        var db = mongoose.createConnection(conn);
        db.on('error', function() {
        });
        db.close();
        assert.equal(typeof db.options, 'object');
        assert.equal(typeof db.options.server, 'object');
        assert.equal(typeof db.options.server.socketOptions, 'object');
        assert.equal(typeof db.options.db, 'object');
        assert.equal(typeof db.options.replset, 'object');
        assert.equal(typeof db.options.replset.socketOptions, 'object');
        assert.equal(db.options.mongos, undefined);
        assert.equal(db.options.server.auto_reconnect, false);
        assert.equal(db.options.server.poolSize, 2);
        assert.equal(db.options.server.slave_ok, false);
        assert.equal(db.options.server.ssl, true);
        assert.equal(db.options.replset.ssl, true);
        assert.equal(db.options.server.socketOptions.socketTimeoutMS, 10);
        assert.equal(db.options.replset.socketOptions.socketTimeoutMS, 10);
        assert.equal(db.options.server.socketOptions.connectTimeoutMS, 12);
        assert.equal(db.options.replset.socketOptions.connectTimeoutMS, 12);
        assert.equal(db.options.replset.retries, 10);
        assert.equal(db.options.replset.reconnectWait, 5);
        assert.equal(db.options.replset.read_secondary, true);
        assert.equal(db.options.db.native_parser, false);
        assert.equal(db.options.db.w, 2);
        assert.equal(db.options.db.safe, true);
        assert.equal(db.options.db.fsync, true);
        assert.equal(db.options.db.journal, true);
        assert.equal(db.options.db.wtimeoutMS, 80);
        assert.equal(db.options.db.forceServerObjectId, false);
        done();
      });
      it('mixed with passed options', function(done) {
        var conn = 'mongodb://localhost/fake?autoReconnect=false&poolSize=2'
            + '&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12'
            + '&retries=10&reconnectWait=5&readSecondary=true'
            + '&nativeParser=false&w=2&safe=true&fsync=true&journal=true';

        var db = mongoose.createConnection(conn, {db: {w: 3, wtimeoutMS: 80}});
        db.on('error', function() {
        });
        db.close();
        assert.equal(typeof db.options, 'object');
        assert.equal(typeof db.options.server, 'object');
        assert.equal(typeof db.options.server.socketOptions, 'object');
        assert.equal(typeof db.options.db, 'object');
        assert.equal(typeof db.options.replset, 'object');
        assert.equal(typeof db.options.replset.socketOptions, 'object');
        assert.equal(db.options.mongos, undefined);
        assert.equal(db.options.server.auto_reconnect, false);
        assert.equal(db.options.db.wtimeoutMS, 80);
        assert.equal(db.options.server.poolSize, 2);
        assert.equal(db.options.server.slave_ok, false);
        assert.equal(db.options.server.ssl, true);
        assert.equal(db.options.replset.ssl, true);
        assert.equal(db.options.server.socketOptions.socketTimeoutMS, 10);
        assert.equal(db.options.replset.socketOptions.socketTimeoutMS, 10);
        assert.equal(db.options.server.socketOptions.connectTimeoutMS, 12);
        assert.equal(db.options.replset.socketOptions.connectTimeoutMS, 12);
        assert.equal(db.options.replset.retries, 10);
        assert.equal(db.options.replset.reconnectWait, 5);
        assert.equal(db.options.replset.read_secondary, true);
        assert.equal(db.options.db.native_parser, false);
        assert.equal(db.options.db.w, 3);
        assert.equal(db.options.db.safe, true);
        assert.equal(db.options.db.fsync, true);
        assert.equal(db.options.db.journal, true);
        assert.equal(db.options.db.forceServerObjectId, false);
        done();
      });
    });
    describe('for sharded clusters (mongos)', function() {
      it('works when specifying {mongos: true} as an option', function(done) {
        var conn = 'mongodb://localhost/fake?autoReconnect=false&poolSize=2'
            + '&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12'
            + '&retries=10&reconnectWait=5&rs_name=replworld&readSecondary=true'
            + '&nativeParser=false&w=2&safe=true&fsync=true&journal=true'
            + '&wtimeoutMS=80&readPreference=nearest&readPreferenceTags='
            + 'dc:ny,rack:1&readPreferenceTags=dc:sf&sslValidate=true';

        var db = new mongoose.Connection();
        db.options = db.parseOptions({mongos: true}, muri(conn).options);
        assert.equal(typeof db.options, 'object');
        assert.equal(typeof db.options.server, 'object');
        assert.equal(typeof db.options.server.socketOptions, 'object');
        assert.equal(typeof db.options.db, 'object');
        assert.equal(typeof db.options.replset, 'object');
        assert.equal(typeof db.options.replset.socketOptions, 'object');
        assert.equal(typeof db.options.mongos, 'object');
        assert.equal(db.options.server.auto_reconnect, false);
        assert.equal(db.options.server.poolSize, 2);
        assert.equal(db.options.server.slave_ok, false);
        assert.equal(db.options.server.ssl, true);
        assert.equal(db.options.replset.ssl, true);
        assert.equal(db.options.mongos.ssl, true);
        assert.equal(db.options.server.socketOptions.socketTimeoutMS, 10);
        assert.equal(db.options.replset.socketOptions.socketTimeoutMS, 10);
        assert.equal(db.options.server.socketOptions.connectTimeoutMS, 12);
        assert.equal(db.options.replset.socketOptions.connectTimeoutMS, 12);
        assert.equal(db.options.replset.retries, 10);
        assert.equal(db.options.replset.reconnectWait, 5);
        assert.equal(db.options.replset.rs_name, 'replworld');
        assert.equal(db.options.replset.read_secondary, true);
        assert.equal(db.options.db.native_parser, false);
        assert.equal(db.options.db.w, 2);
        assert.equal(db.options.db.safe, true);
        assert.equal(db.options.db.fsync, true);
        assert.equal(db.options.db.journal, true);
        assert.equal(db.options.db.wtimeoutMS, 80);
        assert.equal(db.options.db.readPreference, 'nearest');
        assert.deepEqual([{dc: 'ny', rack: 1}, {dc: 'sf'}], db.options.db.read_preference_tags);
        assert.equal(db.options.db.forceServerObjectId, false);
        assert.strictEqual(db.options.server.sslValidate, true);
        assert.strictEqual(db.options.mongos.sslValidate, true);
        done();
      });
      it('works when specifying mongos as a query param on the connection string', function(done) {
        var newQueryParam = '&mongos=true';
        var conn = 'mongodb://localhost/fake?autoReconnect=false&poolSize=2'
            + '&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12'
            + '&retries=10&reconnectWait=5&rs_name=replworld&readSecondary=true'
            + '&nativeParser=false&w=2&safe=true&fsync=true&journal=true'
            + '&wtimeoutMS=80&readPreference=nearest&readPreferenceTags='
            + 'dc:ny,rack:1&readPreferenceTags=dc:sf&sslValidate=true'
            + newQueryParam;

        var db = new mongoose.Connection();
        db.options = db.parseOptions({}, muri(conn).options);
        assert.strictEqual(typeof db.options, 'object');
        assert.strictEqual(typeof db.options.server, 'object');
        assert.strictEqual(typeof db.options.server.socketOptions, 'object');
        assert.strictEqual(typeof db.options.db, 'object');
        assert.strictEqual(typeof db.options.replset, 'object');
        assert.strictEqual(typeof db.options.replset.socketOptions, 'object');
        assert.strictEqual(typeof db.options.mongos, 'object');
        assert.strictEqual(db.options.server.auto_reconnect, false);
        assert.strictEqual(db.options.server.poolSize, 2);
        assert.strictEqual(db.options.server.slave_ok, false);
        assert.strictEqual(db.options.server.ssl, true);
        assert.strictEqual(db.options.replset.ssl, true);
        assert.strictEqual(db.options.mongos.ssl, true);
        assert.strictEqual(db.options.server.socketOptions.socketTimeoutMS, 10);
        assert.strictEqual(db.options.replset.socketOptions.socketTimeoutMS, 10);
        assert.strictEqual(db.options.server.socketOptions.connectTimeoutMS, 12);
        assert.strictEqual(db.options.replset.socketOptions.connectTimeoutMS, 12);
        assert.strictEqual(db.options.replset.retries, 10);
        assert.strictEqual(db.options.replset.reconnectWait, 5);
        assert.strictEqual(db.options.replset.rs_name, 'replworld');
        assert.strictEqual(db.options.replset.read_secondary, true);
        assert.strictEqual(db.options.db.native_parser, false);
        assert.strictEqual(db.options.db.w, 2);
        assert.strictEqual(db.options.db.safe, true);
        assert.strictEqual(db.options.db.fsync, true);
        assert.strictEqual(db.options.db.journal, true);
        assert.strictEqual(db.options.db.wtimeoutMS, 80);
        assert.strictEqual(db.options.db.readPreference, 'nearest');
        assert.deepEqual(db.options.db.read_preference_tags, [{dc: 'ny', rack: 1}, {dc: 'sf'}]);
        assert.strictEqual(db.options.db.forceServerObjectId, false);
        assert.strictEqual(db.options.server.sslValidate, true);
        assert.strictEqual(db.options.mongos.sslValidate, true);
        done();
      });
      it('works when specifying mongos as an object with options', function(done) {
        var conn = 'mongodb://localhost/fake?autoReconnect=false&poolSize=2'
            + '&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12'
            + '&retries=10&reconnectWait=5&rs_name=replworld&readSecondary=true'
            + '&nativeParser=false&w=2&safe=true&fsync=true&journal=true'
            + '&wtimeoutMS=80&readPreference=nearest&readPreferenceTags='
            + 'dc:ny,rack:1&readPreferenceTags=dc:sf&sslValidate=true';

        var db = new mongoose.Connection();
        db.options = db.parseOptions({mongos: {w: 3,wtimeoutMS: 80}}, muri(conn).options);
        assert.equal(typeof db.options, 'object');
        assert.equal(typeof db.options.server, 'object');
        assert.equal(typeof db.options.server.socketOptions, 'object');
        assert.equal(typeof db.options.db, 'object');
        assert.equal(typeof db.options.replset, 'object');
        assert.equal(typeof db.options.replset.socketOptions, 'object');
        assert.equal(typeof db.options.mongos, 'object');
        assert.equal(db.options.server.auto_reconnect, false);
        assert.equal(db.options.server.poolSize, 2);
        assert.equal(db.options.server.slave_ok, false);
        assert.equal(db.options.server.ssl, true);
        assert.equal(db.options.replset.ssl, true);
        assert.equal(db.options.mongos.ssl, true);
        assert.equal(db.options.server.socketOptions.socketTimeoutMS, 10);
        assert.equal(db.options.replset.socketOptions.socketTimeoutMS, 10);
        assert.equal(db.options.server.socketOptions.connectTimeoutMS, 12);
        assert.equal(db.options.replset.socketOptions.connectTimeoutMS, 12);
        assert.equal(db.options.replset.retries, 10);
        assert.equal(db.options.replset.reconnectWait, 5);
        assert.equal(db.options.replset.rs_name, 'replworld');
        assert.equal(db.options.replset.read_secondary, true);
        assert.equal(db.options.db.native_parser, false);
        assert.equal(db.options.db.w, 2);
        assert.equal(db.options.db.safe, true);
        assert.equal(db.options.db.fsync, true);
        assert.equal(db.options.db.journal, true);
        assert.equal(db.options.db.readPreference, 'nearest');
        assert.deepEqual([{dc: 'ny', rack: 1}, {dc: 'sf'}], db.options.db.read_preference_tags);
        assert.equal(db.options.db.forceServerObjectId, false);
        assert.strictEqual(db.options.server.sslValidate, true);
        assert.strictEqual(db.options.mongos.sslValidate, true);
        assert.equal(3, db.options.mongos.w);
        assert.equal(80, db.options.mongos.wtimeoutMS);
        done();
      });
    });
  });

  describe('connect callbacks', function() {
    it('execute with user:pwd connection strings', function(done) {
      var db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', {server: {auto_reconnect: true}}, function() {
        done();
      });
      db.on('error', function(err) {
        assert.ok(err);
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      db.close();
    });
    it('execute without user:pwd connection strings', function(done) {
      var db = mongoose.createConnection('mongodb://localhost/fake', function() {
      });
      db.on('error', function(err) {
        assert.ok(err);
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.user, undefined);
      assert.equal(db.name, 'fake');
      assert.equal(db.host, 'localhost');
      assert.equal(db.port, 27017);
      db.close();
      setTimeout(done, 10);
    });
    it('should return an error if malformed uri passed', function(done) {
      var db = mongoose.createConnection('mongodb:///fake', function(err) {
        assert.ok(/Missing hostname/.test(err.message));
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
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'admin');
      assert.equal(db.host, 'localhost');
      assert.equal(db.port, 27017);
      db.close();
    });
    it('should fire when individual args are passed', function(done) {
      var db = mongoose.createConnection('127.0.0.1', 'faker', 28000, {server: {auto_reconnect: false}}, function() {
        done();
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, false);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'faker');
      assert.equal(db.host, '127.0.0.1');
      assert.equal(db.port, 28000);
      db.close();
    });
    it('should fire when no options are passed', function(done) {
      var db = mongoose.createConnection('127.0.0.1', 'faker', 28000, function() {
        done();
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'faker');
      assert.equal(db.host, '127.0.0.1');
      assert.equal(db.port, 28000);
      db.close();
    });
    it('should fire when default port utilized', function(done) {
      var db = mongoose.createConnection('127.0.0.1', 'faker', done);
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, true);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'faker');
      assert.equal(db.host, '127.0.0.1');
      assert.equal(db.port, 27017);
      db.close();
    });
  });

  describe('errors', function() {
    it('event fires with one listener', function(done) {
      this.timeout(1000);
      var db = start({uri: 'mongodb://whatever23939.localhost/fakeeee?connectTimeoutMS=500', noErrorListener: 1});
      db.on('error', function() {
        // this callback has no params which triggered the bug #759
        db.close();
        done();
      });
    });

    it('should occur without hanging when password with special chars is used (gh-460)', function(done) {
      this.timeout(1000);
      var db = mongoose.createConnection('mongodb://aaron:ps#w@localhost/fake?connectTimeoutMS=500', function(err) {
        assert.ok(err);
        db.close();
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
      var url = 'mongodb://aaron:psw@/tmp/mongodb-27018.sock,/tmp/mongodb-27019.sock/fake?replicaSet=bacon';
      var db = mongoose.createConnection(url, {server: {auto_reconnect: false}});
      db.on('error', function() {
      });
      assert.equal(typeof db.options, 'object');
      assert.equal(typeof db.options.server, 'object');
      assert.equal(db.options.server.auto_reconnect, false);
      assert.equal(typeof db.options.db, 'object');
      assert.equal(db.options.db.forceServerObjectId, false);
      assert.equal(db.name, 'fake');
      assert.ok(Array.isArray(db.hosts));
      assert.equal(db.hosts[0].ipc, '/tmp/mongodb-27018.sock');
      assert.equal(db.hosts[1].ipc, '/tmp/mongodb-27019.sock');
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

  it('connecting to single mongos (gh-3537)', function(done) {
    var db = mongoose.createConnection('localhost:27017', {mongos: true});
    assert.ok(db.db.serverConfig instanceof mongoose.mongo.Mongos);
    db.on('error', function() {
      done();
    });
  });

  it('force close (gh-5664)', function(done) {
    var opts = { useMongoClient: true };
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
    var opts = { useMongoClient: true };
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

  describe('connecting to multiple mongos nodes (gh-1037)', function() {
    var mongos = process.env.MONGOOSE_MULTI_MONGOS_TEST_URI;
    if (!mongos) {
      return console.log('Not testing multi-mongos support');
    }

    it('works', function(done) {
      this.timeout(3000);

      var m = new mongoose.Mongoose;
      m.connect(mongos, {mongos: true}, function(err) {
        assert.ifError(err);

        var s = m.connection.db.serverConfig;
        assert.ok(s instanceof mongoose.mongo.Mongos);
        assert.equal(s.servers.length, 2);

        var M = m.model('TestMultipleMongos', {name: String}, 'test-multi-mongos-' + random());
        M.create({name: 'works'}, function(err, d) {
          assert.ifError(err);

          M.findOne({name: 'works'}, function(err, doc) {
            assert.ifError(err);
            assert.equal(d.id, doc.id);
            m.disconnect(done);
          });
        });
      });
    });
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

      db.open(start.uri);

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

      db.open(start.uri);

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

      db.open(start.uri);

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
      db.open(start.uri);
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
      db.open(start.uri);
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
      db.open(start.uri);
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
      db.open(start.uri);
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

      db.on('close', function() {
        done();
      });
      db2.close();
    });
  });

  describe('shouldAuthenticate()', function() {
    describe('when using standard authentication', function() {
      describe('when username and password are undefined', function() {
        it('should return false', function(done) {
          var db = mongoose.createConnection('localhost', 'fake', 27000, {});
          db.on('error', function() {
          });
          assert.equal(typeof db.options, 'object');
          assert.equal(typeof db.options.server, 'object');
          assert.equal(db.options.server.auto_reconnect, true);
          assert.equal(typeof db.options.db, 'object');
          assert.equal(db.options.db.forceServerObjectId, false);
          assert.equal(db.name, 'fake');
          assert.equal(db.host, 'localhost');
          assert.equal(db.port, 27000);
          assert.equal(db.pass, undefined);
          assert.equal(db.user, undefined);

          assert.equal(db.shouldAuthenticate(), false);

          db.close();
          done();
        });
      });
      describe('when username and password are empty strings', function() {
        it('should return false', function(done) {
          var db = mongoose.createConnection('localhost', 'fake', 27000, {user: '', pass: ''});
          db.on('error', function() {
          });
          assert.equal(typeof db.options, 'object');
          assert.equal(typeof db.options.server, 'object');
          assert.equal(db.options.server.auto_reconnect, true);
          assert.equal(typeof db.options.db, 'object');
          assert.equal(db.options.db.forceServerObjectId, false);
          assert.equal(db.name, 'fake');
          assert.equal(db.host, 'localhost');
          assert.equal(db.port, 27000);
          assert.equal(db.pass, undefined);
          assert.equal(db.user, undefined);

          assert.equal(db.shouldAuthenticate(), false);

          db.close();
          done();
        });
      });
      describe('when only username is defined', function() {
        it('should return false', function(done) {
          var db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'user'});
          db.on('error', function() {
          });
          assert.equal(typeof db.options, 'object');
          assert.equal(typeof db.options.server, 'object');
          assert.equal(db.options.server.auto_reconnect, true);
          assert.equal(typeof db.options.db, 'object');
          assert.equal(db.options.db.forceServerObjectId, false);
          assert.equal(db.name, 'fake');
          assert.equal(db.host, 'localhost');
          assert.equal(db.port, 27000);
          assert.equal(db.pass, undefined);
          assert.equal(db.user, undefined);

          assert.equal(db.shouldAuthenticate(), false);

          db.close();
          done();
        });
      });
      describe('when both username and password are defined', function() {
        it('should return false', function(done) {
          var db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'user', pass: 'pass'});
          db.on('error', function() {
          });
          assert.equal(typeof db.options, 'object');
          assert.equal(typeof db.options.server, 'object');
          assert.equal(db.options.server.auto_reconnect, true);
          assert.equal(typeof db.options.db, 'object');
          assert.equal(db.options.db.forceServerObjectId, false);
          assert.equal(db.name, 'fake');
          assert.equal(db.host, 'localhost');
          assert.equal(db.port, 27000);
          assert.equal(db.pass, 'pass');
          assert.equal(db.user, 'user');

          assert.equal(db.shouldAuthenticate(), true);

          db.close();
          done();
        });
      });
    });
    describe('when using MONGODB-X509 authentication', function() {
      describe('when username and password are undefined', function() {
        it('should return false', function(done) {
          var db = mongoose.createConnection('localhost', 'fake', 27000, {});
          db.on('error', function() {
          });
          assert.equal(typeof db.options, 'object');
          assert.equal(typeof db.options.server, 'object');
          assert.equal(db.options.server.auto_reconnect, true);
          assert.equal(typeof db.options.db, 'object');
          assert.equal(db.options.db.forceServerObjectId, false);
          assert.equal(db.name, 'fake');
          assert.equal(db.host, 'localhost');
          assert.equal(db.port, 27000);
          assert.equal(db.pass, undefined);
          assert.equal(db.user, undefined);

          assert.equal(db.shouldAuthenticate(), false);

          db.close();
          done();
        });
      });
      describe('when only username is defined', function() {
        it('should return false', function(done) {
          var db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'user', auth: {authMechanism: 'MONGODB-X509'}});
          db.on('error', function() {
          });
          assert.equal(typeof db.options, 'object');
          assert.equal(typeof db.options.server, 'object');
          assert.equal(db.options.server.auto_reconnect, true);
          assert.equal(typeof db.options.db, 'object');
          assert.equal(db.options.db.forceServerObjectId, false);
          assert.equal(db.name, 'fake');
          assert.equal(db.host, 'localhost');
          assert.equal(db.port, 27000);
          assert.equal(db.pass, undefined);
          assert.equal(db.user, 'user');

          assert.equal(db.shouldAuthenticate(), true);

          db.close();
          done();
        });
      });
      describe('when both username and password are defined', function() {
        it('should return false', function(done) {
          var db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'user', pass: 'pass', auth: {authMechanism: 'MONGODB-X509'}});
          db.on('error', function() {
          });
          assert.equal(typeof db.options, 'object');
          assert.equal(typeof db.options.server, 'object');
          assert.equal(db.options.server.auto_reconnect, true);
          assert.equal(typeof db.options.db, 'object');
          assert.equal(db.options.db.forceServerObjectId, false);
          assert.equal(db.name, 'fake');
          assert.equal(db.host, 'localhost');
          assert.equal(db.port, 27000);
          assert.equal(db.pass, 'pass');
          assert.equal(db.user, 'user');

          assert.equal(db.shouldAuthenticate(), true);

          db.close();
          done();
        });
      });
    });
  });
});
