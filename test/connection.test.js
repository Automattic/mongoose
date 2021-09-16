'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const Promise = require('bluebird');
const Q = require('q');
const assert = require('assert');
const mongodb = require('mongodb');
const MongooseError = require('../lib/error/index');

const Server = require('./connection_server');
const server = new Server('mongod', {
  bind_ip: '127.0.0.1',
  port: 27000,
  dbpath: './data/db/27000'
});

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

const uri = 'mongodb://localhost:27017/mongoose_test';

before(function() {
  return server.purge();
});

after(function() {
  this.timeout(15000);
  return server.stop();
});

/**
 * Test.
 */

describe('connections:', function() {
  this.timeout(10000);

  describe('openUri (gh-5304)', function() {
    it('with mongoose.createConnection()', function() {
      const conn = mongoose.createConnection('mongodb://localhost/mongoosetest');
      assert.equal(conn.constructor.name, 'NativeConnection');

      const Test = conn.model('Test', new Schema({ name: String }));
      assert.equal(Test.modelName, 'Test');

      const findPromise = Test.findOne();

      return conn.asPromise().
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

    it('with autoIndex (gh-5423)', async function() {
      const conn = await mongoose.createConnection('mongodb://localhost:27017/mongoosetest', {
        autoIndex: false
      }).asPromise();

      assert.strictEqual(conn.config.autoIndex, false);
    });

    it('with autoCreate (gh-6489)', async function() {
      const conn = await mongoose.createConnection(uri, {
        // autoCreate: true
      }).asPromise();

      const Model = conn.model('gh6489_Conn', new Schema({ name: String }, {
        collation: { locale: 'en_US', strength: 1 },
        collection: 'gh6489_Conn'
      }));
      await Model.init();

      // Will throw if collection was not created
      const collections = await conn.db.listCollections().toArray();
      assert.ok(collections.map(c => c.name).includes('gh6489_Conn'));

      await Model.create([{ name: 'alpha' }, { name: 'Zeta' }]);

      // Ensure that the default collation is set. Mongoose will set the
      // collation on the query itself (see gh-4839).
      const res = await conn.collection('gh6489_Conn').
        find({}).sort({ name: 1 }).toArray();
      assert.deepEqual(res.map(v => v.name), ['alpha', 'Zeta']);
    });

    it('with autoCreate = false (gh-8814)', async function() {
      const conn = await mongoose.createConnection(uri, {
        autoCreate: false
      }).asPromise();

      const Model = conn.model('gh8814_Conn', new Schema({ name: String }, {
        collation: { locale: 'en_US', strength: 1 },
        collection: 'gh8814_Conn'
      }));
      await Model.init();

      const res = await conn.db.listCollections().toArray();
      assert.ok(!res.map(c => c.name).includes('gh8814_Conn'));
    });

    it('autoCreate when collection already exists does not fail (gh-7122)', async function() {
      const conn = await mongoose.createConnection(uri).asPromise();

      const schema = new mongoose.Schema({
        name: {
          type: String,
          index: { unique: true }
        }
      }, { autoCreate: true });

      await conn.model('Actor', schema).init();
    });

    it('throws helpful error with legacy syntax (gh-6756)', function() {
      assert.throws(function() {
        mongoose.createConnection('localhost', 'dbname', 27017);
      }, /mongoosejs\.com.*connections\.html/);
    });

    it('throws helpful error with undefined uri (gh-6763)', function() {
      assert.throws(function() {
        mongoose.createConnection(void 0);
      }, /string.*createConnection/);
    });

    it('resolving with q (gh-5714)', async function() {
      const bootMongo = Q.defer();

      const conn = mongoose.createConnection('mongodb://localhost:27017/mongoosetest');

      conn.on('connected', function() {
        bootMongo.resolve(this);
      });

      const _conn = await bootMongo.promise;
      assert.equal(_conn, conn);
    });

    it('connection plugins (gh-7378)', function() {
      const conn1 = mongoose.createConnection('mongodb://localhost:27017/mongoosetest');
      const conn2 = mongoose.createConnection('mongodb://localhost:27017/mongoosetest');

      const called = [];
      conn1.plugin(schema => called.push(schema));

      conn2.model('Test', new Schema({}));
      assert.equal(called.length, 0);

      const schema = new Schema({});
      conn1.model('Test', schema);
      assert.equal(called.length, 1);
      assert.equal(called[0], schema);
    });
  });

  describe('helpers', function() {
    let conn;

    before(function() {
      conn = mongoose.createConnection('mongodb://localhost:27017/mongoosetest_2');
      return conn;
    });

    after(function() {
      return conn.close();
    });

    it('dropDatabase()', async function() {
      await conn.dropDatabase();
    });

    it('dropCollection()', async function() {
      await conn.db.collection('test').insertOne({ x: 1 });
      await conn.dropCollection('test');
      const doc = await conn.db.collection('test').findOne();
      assert.ok(!doc);
    });

    it('createCollection()', async function() {
      await conn.dropDatabase();

      await conn.createCollection('gh5712', {
        capped: true,
        size: 1024
      });

      const collections = await conn.db.listCollections().toArray();

      const names = collections.map(function(c) { return c.name; });
      assert.ok(names.indexOf('gh5712') !== -1);
      assert.ok(collections[names.indexOf('gh5712')].options.capped);
      await conn.createCollection('gh5712_0');
      const collectionsAfterCreation = await conn.db.listCollections().toArray();
      const newCollectionsNames = collectionsAfterCreation.map(function(c) { return c.name; });
      assert.ok(newCollectionsNames.indexOf('gh5712') !== -1);
    });
  });

  it('should allow closing a closed connection', function(done) {
    const db = mongoose.createConnection();

    assert.equal(db.readyState, 0);
    db.close(done);
  });

  describe('errors', function() {
    it('.catch() means error does not get thrown (gh-5229)', function(done) {
      const db = mongoose.createConnection();

      db.openUri('fail connection').catch(function(error) {
        assert.ok(error);
        done();
      });
    });

    it('promise is rejected even if there is an error event listener (gh-7850)', function(done) {
      const db = mongoose.createConnection();

      let called = 0;
      db.on('error', () => ++called);

      db.openUri('fail connection').catch(function(error) {
        assert.ok(error);
        setTimeout(() => {
          assert.equal(called, 1);
          done();
        }, 0);
      });
    });

    it('readyState is disconnected if initial connection fails (gh-6244)', async function() {
      const db = mongoose.createConnection();

      let threw = false;
      try {
        await db.openUri('fail connection');
      } catch (err) {
        assert.ok(err);
        assert.equal(err.name, 'MongoParseError');
        threw = true;
      }

      assert.ok(threw);
      assert.strictEqual(db.readyState, 0);
    });
  });

  describe('connect callbacks', function() {
    it('should return an error if malformed uri passed', function(done) {
      const db = mongoose.createConnection('mongodb:///fake', {}, function(err) {
        assert.equal(err.name, 'MongoParseError');
        done();
      });
      db.close();
      assert.ok(!db.options);
    });
  });

  describe('.model()', function() {
    let db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    beforeEach(function() {
      db.deleteModel(/.*/);
    });

    it('allows passing a schema', function() {
      const MyModel = mongoose.model('Test', new Schema({
        name: String
      }));

      assert.ok(MyModel.schema instanceof Schema);
      assert.ok(MyModel.prototype.schema instanceof Schema);

      const m = new MyModel({ name: 'aaron' });
      assert.equal(m.name, 'aaron');
    });

    it('should properly assign the db', function() {
      const A = mongoose.model('testing853a', new Schema({ x: String }), 'testing853-1');
      const B = mongoose.model('testing853b', new Schema({ x: String }), 'testing853-2');
      const C = B.model('testing853a');
      assert.ok(C === A);
    });

    it('prevents overwriting pre-existing models', function() {
      db.deleteModel(/Test/);
      db.model('Test', new Schema);

      assert.throws(function() {
        db.model('Test', new Schema);
      }, /Cannot overwrite `Test` model/);
    });

    it('allows passing identical name + schema args', function() {
      const name = 'Test';
      const schema = new Schema;

      db.deleteModel(/Test/);
      const model = db.model(name, schema);
      db.model(name, model.schema);
    });

    it('throws on unknown model name', function() {
      assert.throws(function() {
        db.model('iDoNotExist!');
      }, /Schema hasn't been registered/);
    });

    describe('passing collection name', function() {
      describe('when model name already exists', function() {
        it('returns a new uncached model', function() {
          const s1 = new Schema({ a: [] });
          const name = 'Test';
          const A = db.model(name, s1);
          const B = db.model(name);
          const C = db.model(name, 'alternate');
          assert.ok(A.collection.name === B.collection.name);
          assert.ok(A.collection.name !== C.collection.name);
          assert.ok(db.models[name].collection.name !== C.collection.name);
          assert.ok(db.models[name].collection.name === A.collection.name);
        });
      });
    });

    describe('passing object literal schemas', function() {
      it('works', function(done) {
        const A = db.model('A', { n: [{ age: 'number' }] });
        const a = new A({ n: [{ age: '47' }] });
        assert.strictEqual(47, a.n[0].age);
        a.save(function(err) {
          assert.ifError(err);
          A.findById(a, function(err) {
            assert.ifError(err);
            assert.strictEqual(47, a.n[0].age);
            done();
          });
        });
      });
    });
  });

  it('force close (gh-5664)', function(done) {
    const opts = {};
    const db = mongoose.createConnection('mongodb://localhost:27017/test', opts);
    const coll = db.collection('Test');
    db.asPromise().then(function() {
      setTimeout(function() {
        coll.insertOne({ x: 1 }, function(error) {
          assert.ok(error);
          done();
        });
      }, 100);

      // Force close
      db.close(true);
    });
  });

  it('force close with connection created after close (gh-5664)', function(done) {
    const opts = {};
    const db = mongoose.createConnection('mongodb://localhost:27017/test', opts);
    db.asPromise().then(function() {
      setTimeout(function() {
        let threw = false;
        try {
          db.collection('Test').insertOne({ x: 1 });
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

  it('bufferCommands (gh-5720)', function() {
    let opts = { bufferCommands: false };
    let db = mongoose.createConnection('mongodb://localhost:27017/test', opts);

    let M = db.model('gh5720', new Schema({}));
    assert.ok(!M.collection._shouldBufferCommands());
    db.close();

    opts = { bufferCommands: true };
    db = mongoose.createConnection('mongodb://localhost:27017/test', opts);
    M = db.model('gh5720', new Schema({}, { bufferCommands: false }));
    assert.ok(!M.collection._shouldBufferCommands());
    db.close();

    opts = { bufferCommands: true };
    db = mongoose.createConnection('mongodb://localhost:27017/test', opts);
    M = db.model('gh5720', new Schema({}));
    assert.ok(M.collection._shouldBufferCommands());

    db = mongoose.createConnection();
    M = db.model('gh5720', new Schema({}));
    opts = { bufferCommands: false };
    db.openUri('mongodb://localhost:27017/test', opts);
    assert.ok(!M.collection._shouldBufferCommands());

    return M.findOne().then(() => assert.ok(false), err => assert.ok(err.message.includes('initial connection'))).
      then(() => db.close());
  });

  it('dbName option (gh-6106)', function() {
    const opts = { dbName: 'bacon' };
    return mongoose.
      createConnection('mongodb://localhost:27017/test', opts).
      asPromise().
      then(db => {
        assert.equal(db.name, 'bacon');
        db.close();
      });
  });

  it('uses default database in uri if options.dbName is not provided', function() {
    return mongoose.createConnection('mongodb://localhost:27017/default-db-name').
      asPromise().
      then(db => {
        assert.equal(db.name, 'default-db-name');
        db.close();
      });
  });

  it('startSession() (gh-6653)', function() {
    const conn = mongoose.createConnection('mongodb://localhost:27017/test');

    let lastUse;
    let session;
    return conn.startSession().
      then(_session => {
        session = _session;
        assert.ok(session);
        lastUse = session.serverSession.lastUse;
        return new Promise(resolve => setTimeout(resolve, 1));
      }).then(() => {
        return conn.model('Test', new Schema({})).findOne({}, null, { session });
      }).
      then(() => {
        assert.ok(session.serverSession.lastUse > lastUse);
        conn.close();
      });
  });

  describe('modelNames()', function() {
    it('returns names of all models registered on it', function(done) {
      const m = new mongoose.Mongoose;
      m.model('root', { x: String });
      const another = m.model('another', { x: String });
      another.discriminator('discriminated', new Schema({ x: String }));

      const db = m.createConnection();
      db.model('something', { x: String });

      let names = db.modelNames();
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
      const db = mongoose.createConnection('mongodb://localhost:27017/mongoose1');

      const db2 = db.useDb('mongoose2');

      assert.equal('mongoose2', db2.name);

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
      const db = start();
      const db2 = db.useDb('mongoose-test-2');

      const schema = new Schema({
        body: String,
        thing: Number
      });

      const m1 = db.model('Test', schema);
      const m2 = db2.model('Test', schema);

      m1.create({ body: 'this is some text', thing: 1 }, function(err, i1) {
        assert.ifError(err);
        m2.create({ body: 'this is another body', thing: 2 }, function(err, i2) {
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
      const db = mongoose.createConnection();
      const db2 = db.useDb('mongoose-test-2');
      let hit = false;

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
      const db = mongoose.createConnection();
      const db2 = db.useDb('mongoose-test-2');
      let hit = false;

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
      const db = mongoose.createConnection();
      const db2 = db.useDb('mongoose-test-2');
      let hit = false;
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
      const db = mongoose.createConnection();
      const db2 = db.useDb('mongoose-test-2');
      let hit = false;
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
      const db = mongoose.createConnection();
      const db2 = db.useDb('mongoose-test-2');
      let hit = false;
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
      const db = mongoose.createConnection();
      const db2 = db.useDb('mongoose-test-2');
      let hit = false;
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
      const db = mongoose.createConnection();
      const db2 = db.useDb('mongoose-test-2');
      let hit = false;
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
      const db = start();
      const db2 = db.useDb('mongoose-test-2');

      db2.on('close', function() {
        done();
      });
      db.close();
    });

    it('closes correctly for all dbs, closing secondary db', function(done) {
      const db = start();
      const db2 = db.useDb('mongoose-test-2');

      db.on('disconnected', function() {
        done();
      });
      db2.close();
    });

    it('cache connections to the same db', function() {
      const db = start();
      const db2 = db.useDb('mongoose-test-2', { useCache: true });
      const db3 = db.useDb('mongoose-test-2', { useCache: true });

      assert.strictEqual(db2, db3);
      db.close();
    });
  });

  describe('shouldAuthenticate()', function() {
    describe('when using standard authentication', function() {
      describe('when username and password are undefined', function() {
        it('should return false', function() {
          const db = mongoose.createConnection('mongodb://localhost:27017/fake', {});

          assert.equal(db.shouldAuthenticate(), false);

          db.close();
        });
      });
      describe('when username and password are empty strings', function() {
        it('should return false', function() {
          const db = mongoose.createConnection('mongodb://localhost:27017/fake', {
            user: '',
            pass: ''
          });
          db.on('error', function() {});

          assert.equal(db.shouldAuthenticate(), false);

          db.close();
        });
      });
      describe('when both username and password are defined', function() {
        it('should return true', function() {
          const db = mongoose.createConnection('mongodb://localhost:27017/fake', {
            user: 'user',
            pass: 'pass'
          });
          db.asPromise().catch(() => {});

          assert.equal(db.shouldAuthenticate(), true);

          db.close();
        });
      });
    });
    describe('when using MONGODB-X509 authentication', function() {
      describe('when username and password are undefined', function() {
        it('should return false', function() {
          const db = mongoose.createConnection('mongodb://localhost:27017/fake', {});
          db.on('error', function() {
          });

          assert.equal(db.shouldAuthenticate(), false);

          db.close();
        });
      });
      describe('when only username is defined', function() {
        it('should return false', function() {
          const db = mongoose.createConnection('mongodb://localhost:27017/fake', {
            user: 'user',
            auth: { authMechanism: 'MONGODB-X509' }
          });
          db.asPromise().catch(() => {});
          assert.equal(db.shouldAuthenticate(), true);

          db.close();
        });
      });
      describe('when both username and password are defined', function() {
        it('should return false', function() {
          const db = mongoose.createConnection('mongodb://localhost:27017/fake', {
            user: 'user',
            pass: 'pass',
            auth: { authMechanism: 'MONGODB-X509' }
          });
          db.asPromise().catch(() => {});

          assert.equal(db.shouldAuthenticate(), true);

          db.close();
        });
      });
    });
  });

  describe('passing a function into createConnection', function() {
    it('should store the name of the function (gh-6517)', function() {
      const conn = mongoose.createConnection('mongodb://localhost:27017/gh6517');
      const schema = new Schema({ name: String });
      class Person extends mongoose.Model {}
      conn.model(Person, schema);
      assert.strictEqual(conn.modelNames()[0], 'Person');
    });
  });

  it('deleteModel()', function() {
    const conn = mongoose.createConnection('mongodb://localhost:27017/gh6813');

    let Model = conn.model('gh6813', new Schema({ name: String }));

    const events = [];
    conn.on('deleteModel', model => events.push(model));

    assert.ok(conn.model('gh6813'));
    conn.deleteModel('gh6813');

    assert.equal(events.length, 1);
    assert.equal(events[0], Model);

    assert.throws(function() {
      conn.model('gh6813');
    }, /Schema hasn't been registered/);

    Model = conn.model('gh6813', new Schema({ name: String }));
    assert.ok(Model);
    return Model.create({ name: 'test' });
  });

  it('throws a MongooseServerSelectionError on server selection timeout (gh-8451)', () => {
    const opts = {
      serverSelectionTimeoutMS: 100
    };
    const uri = 'mongodb://baddomain:27017/test';

    return mongoose.createConnection(uri, opts).asPromise().then(() => assert.ok(false), err => {
      assert.equal(err.name, 'MongooseServerSelectionError');
    });
  });

  it('`watch()` on a whole collection (gh-8425)', async function() {
    this.timeout(10000);
    if (!process.env.REPLICA_SET) {
      this.skip();
    }

    const opts = {
      replicaSet: process.env.REPLICA_SET
    };
    const conn = await mongoose.createConnection('mongodb://localhost:27017/gh8425', opts);

    const Model = conn.model('Test', Schema({ name: String }));
    await Model.create({ name: 'test' });

    const changeStream = conn.watch();

    const changes = [];
    changeStream.on('change', data => {
      changes.push(data);
    });

    await new Promise((resolve) => changeStream.on('ready', () => resolve()));

    const nextChange = new Promise(resolve => changeStream.on('change', resolve));
    await Model.create({ name: 'test2' });

    await nextChange;
    assert.equal(changes.length, 1);
    assert.equal(changes[0].operationType, 'insert');
  });

  it('useDB inherits config from default connection (gh-8267)', async function() {
    await mongoose.connect('mongodb://localhost:27017/gh8267-0', { sanitizeFilter: true });

    const db2 = mongoose.connection.useDb('gh8267-1');
    assert.equal(db2.config.sanitizeFilter, true);
  });

  it('allows setting client on a disconnected connection (gh-9164)', async function() {
    const client = await mongodb.MongoClient.connect('mongodb://localhost:27017/mongoose_test');
    const conn = mongoose.createConnection().setClient(client);

    assert.equal(conn.readyState, 1);

    await conn.createCollection('test');
    const res = await conn.dropCollection('test');
    assert.ok(res);
  });

  it('connection.asPromise() resolves to a connection instance (gh-9496)', async function() {
    const m = new mongoose.Mongoose;

    m.connect('mongodb://localhost:27017/test_gh9496');
    const conn = await m.connection.asPromise();

    assert.ok(conn instanceof m.Connection);
    assert.ok(conn);
  });

  it('allows overwriting models (gh-9406)', function() {
    const m = new mongoose.Mongoose();

    const events = [];
    m.connection.on('model', model => events.push(model));

    const M1 = m.model('Test', Schema({ name: String }), null, { overwriteModels: true });
    assert.equal(events.length, 1);
    assert.equal(events[0], M1);

    const M2 = m.model('Test', Schema({ name: String }), null, { overwriteModels: true });
    assert.equal(events.length, 2);
    assert.equal(events[1], M2);

    const M3 = m.connection.model('Test', Schema({ name: String }), null, { overwriteModels: true });
    assert.equal(events.length, 3);
    assert.equal(events[2], M3);

    assert.ok(M1 !== M2);
    assert.ok(M2 !== M3);

    assert.throws(() => m.model('Test', Schema({ name: String })), /overwrite/);
  });

  it('allows setting `overwriteModels` globally (gh-9406)', function() {
    const m = new mongoose.Mongoose();
    m.set('overwriteModels', true);

    const M1 = m.model('Test', Schema({ name: String }));
    const M2 = m.model('Test', Schema({ name: String }));
    const M3 = m.connection.model('Test', Schema({ name: String }));

    assert.ok(M1 !== M2);
    assert.ok(M2 !== M3);

    m.set('overwriteModels', false);
    assert.throws(() => m.model('Test', Schema({ name: String })), /overwrite/);
  });

  it('can use destructured `connect` and `disconnect` (gh-9597)', async function() {
    const m = new mongoose.Mongoose;
    const connect = m.connect;
    const disconnect = m.disconnect;

    await disconnect();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const errorOnConnect = await connect('mongodb://localhost:27017/test_gh9597').then(() => null, err => err);
    assert.ifError(errorOnConnect);

    const errorOnDisconnect = await disconnect().then(() => null, err => err);
    assert.ifError(errorOnDisconnect);
  });

  describe('when connecting with a secondary read preference(gh-9374)', function() {
    describe('mongoose.connect', function() {
      it('forces autoIndex & autoCreate to be false if read preference is secondary or secondaryPreferred', async function() {
        const secondaryURI =
                    'mongodb://localhost:27017/test_gh9374_1?readPreference=secondary';
        const m = new mongoose.Mongoose();
        await m.connect(secondaryURI);

        assert.strictEqual(m.connection.get('autoIndex'), false);
        assert.strictEqual(m.connection.get('autoCreate'), false);

        assert.strictEqual(m.connection.get('autoIndex'), false);
        assert.strictEqual(m.connection.get('autoCreate'), false);

        await m.disconnect();
      });

      it('throws if options try to set autoIndex to true', function() {
        const secondaryURI =
                    'mongodb://localhost:27017/test_gh9374_1?readPreference=secondary';
        const opts = {
          autoIndex: true
        };

        const err = new MongooseError(
          'MongoDB prohibits index creation on connections that read from ' +
                        'non-primary replicas.  Connections that set "readPreference" to "secondary" or ' +
                        '"secondaryPreferred" may not opt-in to the following connection options: ' +
                        'autoCreate, autoIndex'
        );
        const m = new mongoose.Mongoose();

        assert.rejects(() => m.connect(secondaryURI, opts), err);
      });

      it('throws if options.config.autoIndex is true, even if options.autoIndex is false', function() {
        const secondaryURI =
                    'mongodb://localhost:27017/test_gh9374_1?readPreference=secondary';
        const opts = {
          autoIndex: false,
          config: {
            autoIndex: true
          }
        };
        const err = new MongooseError(
          'MongoDB prohibits index creation on connections that read from ' +
                        'non-primary replicas.  Connections that set "readPreference" to "secondary" or ' +
                        '"secondaryPreferred" may not opt-in to the following connection options: ' +
                        'autoCreate, autoIndex'
        );
        const m = new mongoose.Mongoose();
        assert.rejects(m.connect(secondaryURI, opts), err);
      });
    });

    describe('mongoose.createConnection', function() {
      it('forces autoIndex & autoCreate to be false if read preference is secondary or secondaryPreferred (gh-9374)', function() {
        const secondaryURI =
                    'mongodb://localhost:27017/test_gh9374_1?readPreference=secondary';
        const secondaryPrefURI =
                    'mongodb://localhost:27017/test_gh9374_2?readPreference=secondaryPreferred';

        const conn = new mongoose.createConnection(secondaryURI);

        assert.equal(conn.get('autoIndex'), false);
        assert.equal(conn.get('autoCreate'), false);

        const conn2 = new mongoose.createConnection(secondaryPrefURI);

        assert.equal(conn2.get('autoIndex'), false);
        assert.equal(conn2.get('autoCreate'), false);
      });

      it('throws if options try to set autoIndex to true', function() {
        const secondaryURI =
                    'mongodb://localhost:27017/test_gh9374_1?readPreference=secondary';
        const opts = {
          autoIndex: true
        };
        const err = new MongooseError(
          'MongoDB prohibits index creation on connections that read from ' +
                        'non-primary replicas.  Connections that set "readPreference" to "secondary" or ' +
                        '"secondaryPreferred" may not opt-in to the following connection options: ' +
                        'autoCreate, autoIndex'
        );
        const m = new mongoose.Mongoose();
        return assert.throws(
          () => m.createConnection(secondaryURI, opts),
          err
        );
      });

      it('throws if options.config.autoIndex is true, even if options.autoIndex is false', function() {
        const secondaryURI =
                    'mongodb://localhost:27017/test_gh9374_1?readPreference=secondary';
        const opts = {
          autoIndex: false,
          config: {
            autoIndex: true
          }
        };
        const err = new MongooseError(
          'MongoDB prohibits index creation on connections that read from ' +
                        'non-primary replicas.  Connections that set "readPreference" to "secondary" or ' +
                        '"secondaryPreferred" may not opt-in to the following connection options: ' +
                        'autoCreate, autoIndex'
        );

        assert.throws(
          () => mongoose.createConnection(secondaryURI, opts),
          err
        );
      });
    });
  });

  it('Connection id should be scoped per Mongoose Instance (gh-10025)', function() {
    const m = new mongoose.Mongoose;
    const conn = m.createConnection();
    const m1 = new mongoose.Mongoose;
    const conn2 = m1.createConnection();
    const conn3 = m.createConnection();
    assert.deepStrictEqual(m.connection.id, 0);
    assert.deepStrictEqual(conn.id, m.connection.id + 1);
    assert.deepStrictEqual(m1.connection.id, 0);
    assert.deepStrictEqual(conn2.id, m1.connection.id + 1);
    assert.deepStrictEqual(conn3.id, m.connection.id + 2);
  });
});
