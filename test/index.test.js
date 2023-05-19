'use strict';

const sinon = require('sinon');

const start = require('./common');

const assert = require('assert');
const random = require('./util').random;
const stream = require('stream');

const collection = 'blogposts_' + random();

const SetOptionError = require('../lib/error/setOptionError');
const mongoose = start.mongoose;
const Mongoose = mongoose.Mongoose;
const Schema = mongoose.Schema;

const options = {};

describe('mongoose module:', function() {
  describe('default connection works', function() {
    it('without options', async function() {
      const goose = new Mongoose();
      const db = goose.connection;

      await goose.connect(start.uri, options);
      await db.close();
    });

    it('with promise (gh-3790)', async function() {
      const goose = new Mongoose();
      const db = goose.connection;

      await goose.connect(start.uri, options);

      await db.close();
    });
  });

  it('legacy pluralize by default (gh-5958)', function() {
    const mongoose = new Mongoose();

    mongoose.model('User', new Schema({}));

    assert.equal(mongoose.model('User').collection.name, 'users');
  });

  it('returns legacy pluralize function by default', function() {
    const legacyPluralize = require('../lib/helpers/pluralize');
    const mongoose = new Mongoose();

    const pluralize = mongoose.pluralize();

    assert.equal(pluralize, legacyPluralize);
  });

  it('sets custom pluralize function (gh-5877)', function() {
    const mongoose = new Mongoose();

    // some custom function of type (str: string) => string
    const customPluralize = (str) => str;
    mongoose.pluralize(customPluralize);

    const pluralize = mongoose.pluralize();
    assert.equal(pluralize, customPluralize);

    mongoose.model('User', new Schema({}));
    assert.equal(mongoose.model('User').collection.name, 'User');
  });

  it('debug to stream (gh-7018)', async function() {
    const mongoose = new Mongoose();

    const written = [];
    class StubStream extends stream.Writable {
      write(chunk) {
        written.push(chunk);
      }
    }

    mongoose.set('debug', new StubStream());

    const User = mongoose.model('User', new Schema({ name: String }));


    await mongoose.connect(start.uri);
    await User.findOne();
    assert.equal(written.length, 1);
    assert.ok(written[0].startsWith('users.findOne('));
    await mongoose.disconnect();
  });

  it('should collect the args correctly gh-13364', async function() {
    const util = require('util');
    const mongoose = new Mongoose();
    const conn = await mongoose.connect(start.uri);
    let actual = '';
    mongoose.set('debug', (collectionName, methodName, ...methodArgs) => {
      actual = `${collectionName}.${methodName}(${util.inspect(methodArgs).slice(2, -2)})`;
    });
    const user = conn.connection.collection('User');
    await user.findOne({ key: 'value' });
    assert.equal('User.findOne({ key: \'value\' })', actual);
  });

  it('{g,s}etting options', function() {
    const mongoose = new Mongoose();

    mongoose.set('runValidators', 'b');

    assert.equal(mongoose.get('runValidators'), 'b');
    assert.equal(mongoose.set('runValidators'), 'b');
  });

  it('allows `const { model } = mongoose` (gh-3768)', function() {
    const model = mongoose.model;

    model('gh3768', new Schema({ name: String }));

    assert.ok(mongoose.models['gh3768']);
  });

  it('options object (gh-8144)', function() {
    const mongoose = new Mongoose({ bufferCommands: false });

    assert.strictEqual(mongoose.options.bufferCommands, false);
  });

  it('bufferCommands option (gh-5879) (gh-9179)', function() {
    const mongoose = new Mongoose();

    mongoose.set('bufferCommands', false);

    const M = mongoose.model('Test', new Schema({}));

    assert.ok(!M.collection._shouldBufferCommands());

    // Allow changing bufferCommands after defining model (gh-9179)
    mongoose.set('bufferCommands', true);
    assert.ok(M.collection._shouldBufferCommands());

    mongoose.set('bufferCommands', false);
    assert.ok(!M.collection._shouldBufferCommands());
  });

  it('cloneSchemas option (gh-6274)', function() {
    const mongoose = new Mongoose();

    mongoose.set('cloneSchemas', true);

    const s = new Schema({});
    const M = mongoose.model('Test', s);
    assert.ok(M.schema !== s);
    assert.doesNotThrow(function() {
      mongoose.model('Test', M.schema);
    });

    mongoose.set('cloneSchemas', false);

    const M2 = mongoose.model('Test2', s);
    assert.ok(M2.schema === s);
  });

  it('supports disabling `id` via global plugin (gh-10701)', function() {
    const mongoose = new Mongoose();

    mongoose.plugin((schema) => {
      schema.set('id', false);
    });

    const s = new Schema({});
    const M = mongoose.model('Test', s);

    assert.equal(M.schema.options.id, false);
    const doc = new M();
    assert.ok(!doc.id);
  });

  it('objectIdGetter option (gh-6588)', function() {
    const mongoose = new Mongoose();

    let o = new mongoose.Types.ObjectId();
    assert.strictEqual(o._id, o);

    mongoose.set('objectIdGetter', false);

    o = new mongoose.Types.ObjectId();
    assert.strictEqual(o._id, void 0);

    mongoose.set('objectIdGetter', true);

    o = new mongoose.Types.ObjectId();
    assert.strictEqual(o._id, o);
  });

  it('runValidators option (gh-6865) (gh-6578)', async function() {
    const mongoose = new Mongoose();

    mongoose.set('runValidators', true);

    const M = mongoose.model('Test', new Schema({
      name: { type: String, required: true }
    }));

    await mongoose.connect(start.uri, options);

    const err = await M.updateOne({}, { name: null }).then(() => null, err => err);
    assert.ok(err.errors['name']);

    mongoose.disconnect();
  });

  it('toJSON options (gh-6815)', function() {
    const mongoose = new Mongoose();

    mongoose.set('toJSON', { virtuals: true });

    const schema = new Schema({});
    schema.virtual('foo').get(() => 42);
    const M = mongoose.model('Test', schema);

    let doc = new M();
    assert.equal(doc.toJSON().foo, 42);
    assert.equal(doc.toObject().foo, void 0);

    assert.equal(doc.toJSON({ virtuals: false }).foo, void 0);

    const schema2 = new Schema({}, { toJSON: { virtuals: true } });
    schema2.virtual('foo').get(() => 'bar');
    const M2 = mongoose.model('Test2', schema2);

    doc = new M2();
    assert.equal(doc.toJSON({ virtuals: false }).foo, void 0);
    assert.equal(doc.toJSON().foo, 'bar');
  });

  it('toObject options (gh-6815)', function() {
    const mongoose = new Mongoose();

    mongoose.set('toObject', { virtuals: true });

    const schema = new Schema({});
    schema.virtual('foo').get(() => 42);
    const M = mongoose.model('Test', schema);

    const doc = new M();
    assert.equal(doc.toObject().foo, 42);
    assert.strictEqual(doc.toJSON().foo, void 0);
  });

  it('strict option (gh-6858)', function() {
    const mongoose = new Mongoose();

    // With strict: throw, no schema-level override
    mongoose.set('strict', 'throw');

    // `mongoose.Schema` as opposed to just `Schema` matters here because we
    // a schema pulls the `strict` property default from its Mongoose global.
    // See gh-7103. We should deprecate default options.
    let schema = new mongoose.Schema({ name: String });
    let M = mongoose.model('gh6858', schema);
    assert.throws(() => {
      new M({ name: 'foo', bar: 'baz' });
    }, /Field `bar` is not in schema/);

    mongoose.deleteModel('gh6858');

    // With strict: throw and schema-level override
    schema = new mongoose.Schema({ name: String }, { strict: true });
    M = mongoose.model('gh6858', schema);

    let doc = new M({ name: 'foo', bar: 'baz' });
    assert.equal(doc.name, 'foo');
    assert.strictEqual(doc.bar, void 0);
    assert.strictEqual(doc.toObject().bar, void 0);
    assert.strictEqual(doc.$__.strictMode, true);

    mongoose.deleteModel('gh6858');

    // With strict: false, no schema-level override
    mongoose.set('strict', false);

    schema = new mongoose.Schema({ name: String });
    M = mongoose.model('gh6858', schema);
    doc = new M({ name: 'foo', bar: 'baz' });

    assert.strictEqual(doc.$__.strictMode, false);

    assert.equal(doc.toObject().bar, 'baz');
  });

  it('declaring global plugins (gh-5690)', async function() {
    const mong = new Mongoose();
    const subSchema = new Schema({ name: String });
    const schema = new Schema({
      test: [subSchema]
    });
    let called = 0;

    const calls = [];
    let preSaveCalls = 0;
    mong.plugin(function(s) {
      calls.push(s);

      s.pre('save', function(next) {
        ++preSaveCalls;
        next();
      });

      s.methods.testMethod = function() { return 42; };
    });

    schema.plugin(function(s) {
      assert.equal(s, schema);
      called++;
    });

    const M = mong.model('GlobalPlugins', schema);

    assert.equal(called, 1);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].obj, schema.obj);
    assert.deepEqual(calls[1].obj, subSchema.obj);

    assert.equal(preSaveCalls, 0);
    await mong.connect(start.uri, options);

    const doc = await M.create({ test: [{ name: 'Val' }] });

    assert.equal(preSaveCalls, 2);
    assert.equal(doc.testMethod(), 42);
    assert.equal(doc.test[0].testMethod(), 42);
    await mong.disconnect();
  });

  it('declaring global plugins with tags (gh-9780)', async function() {
    const mong = new Mongoose();
    const schema1 = new Schema({}, { pluginTags: ['tag1'] });
    const schema2 = new Schema({}, { pluginTags: ['tag2'] });
    const schema3 = new Schema({});

    mong.plugin(function(s) {
      s.add({ prop1: String });
    }, { tags: ['tag1'] });

    mong.plugin(function(s) {
      s.add({ prop2: String });
    }, { tags: ['tag1', 'tag2'] });

    mong.plugin(function(s) {
      s.add({ prop3: String });
    });

    const Test1 = mong.model('Test1', schema1);
    const Test2 = mong.model('Test2', schema2);
    const Test3 = mong.model('Test3', schema3);

    assert.ok(Test1.schema.path('prop1'));
    assert.ok(Test1.schema.path('prop2'));
    assert.ok(Test1.schema.path('prop3'));

    assert.ok(!Test2.schema.path('prop1'));
    assert.ok(Test2.schema.path('prop2'));
    assert.ok(Test2.schema.path('prop3'));

    assert.ok(!Test3.schema.path('prop1'));
    assert.ok(!Test3.schema.path('prop2'));
    assert.ok(Test3.schema.path('prop3'));
  });

  it('global plugins on nested schemas underneath embedded discriminators (gh-7370)', function() {
    const m = new Mongoose();

    const called = [];
    m.plugin(function(s) {
      called.push(s);
    });

    const subSchema = new m.Schema({ name: String }, { discriminatorKey: 'kind' });
    const schema = new m.Schema({
      test: [subSchema]
    });
    const discriminatorNestedSchema = new m.Schema({ other: String });
    schema.path('test').discriminator('Foo', new m.Schema({
      nested: discriminatorNestedSchema
    }));

    m.model('gh7370', schema);
    assert.equal(called.length, 3);
    assert.ok(called.indexOf(discriminatorNestedSchema) !== -1);

    return Promise.resolve();
  });

  it('global plugins with applyPluginsToDiscriminators (gh-7435)', function() {
    const m = new Mongoose();
    m.set('applyPluginsToDiscriminators', true);

    const called = [];
    m.plugin(function(s) {
      called.push(s);
    });

    const eventSchema = new m.Schema({
      kind: { type: String }
    }, { discriminatorKey: 'kind' });

    const testEventSchema = new m.Schema({
      inner: {
        type: new mongoose.Schema({
          _id: false,
          bool: { type: Boolean, required: true }
        })
      }
    });

    const schema = new m.Schema({
      events: {
        type: [eventSchema]
      }
    });

    schema.path('events').discriminator('test-event', testEventSchema, { clone: false });

    m.model('gh7435', schema);
    assert.equal(called.length, 4);
    assert.ok(called.indexOf(testEventSchema) !== -1);

    return Promise.resolve();
  });

  it('global plugins recompile schemas (gh-7572)', function() {
    function helloPlugin(schema) {
      schema.virtual('greeting').get(() => 'hello');
    }

    const m = new Mongoose();

    m.plugin(helloPlugin);

    const nested = new m.Schema({
      baz: String
    });
    const outer = new m.Schema({
      foo: String,
      bar: nested
    });

    const Test = m.model('Test', outer);
    const doc = new Test({ foo: 'abc', bar: { baz: 'def' } });

    assert.equal(doc.greeting, 'hello');
    assert.equal(doc.bar.greeting, 'hello');

    return Promise.resolve();
  });

  it('top-level ObjectId, Decimal128, Mixed (gh-6760)', function() {
    const mongoose = new Mongoose();

    const schema = new Schema({
      testId: mongoose.ObjectId,
      testNum: mongoose.Decimal128,
      testMixed: mongoose.Mixed
    });

    const M = mongoose.model('gh6760', schema);

    const doc = new M({ testId: 'length12str0', testNum: 123, mixed: {} });

    assert.ok(doc.testId instanceof mongoose.Types.ObjectId);
    assert.ok(doc.testNum instanceof mongoose.Types.Decimal128);
  });

  it('stubbing now() for timestamps (gh-6728)', async function() {
    const mongoose = new Mongoose();

    const date = new Date('2011-06-01');

    mongoose.now = () => date;

    const schema = new Schema({ name: String }, { timestamps: true });

    const M = mongoose.model('gh6728', schema);


    await mongoose.connect(start.uri);

    const doc = new M({ name: 'foo' });

    await doc.save();

    assert.equal(doc.createdAt.valueOf(), date.valueOf());
    assert.equal(doc.updatedAt.valueOf(), date.valueOf());
    await mongoose.disconnect();
  });

  it('isolates custom types between mongoose instances (gh-6933) (gh-7158)', function() {
    const m1 = new Mongoose();
    const m2 = new Mongoose();

    class T1 extends mongoose.SchemaType {}
    class T2 extends mongoose.SchemaType {}

    m1.Schema.Types.T1 = T1;
    m2.Schema.Types.T2 = T2;

    assert.strictEqual(m1.Schema.Types.T1, T1);
    assert.strictEqual(m2.Schema.Types.T2, T2);

    new m1.Schema({ v: T1 });
    new m2.Schema({ v: T2 });

    return Promise.resolve();
  });

  it('throws an error on setting invalid options (gh-6899)', function() {
    try {
      mongoose.set('someInvalidOption', true);
      assert.fail('Expected mongoose.set to throw');
    }
    catch (err) {
      assert.ok(err instanceof SetOptionError);
      assert.equal(err.message, 'someInvalidOption: "someInvalidOption" is not a valid option to set');
    }
  });

  describe('disconnection of all connections', function() {
    this.timeout(10000);

    describe('no callback', function() {
      it('works', function(done) {
        const mong = new Mongoose();
        let connections = 0;
        let disconnections = 0;
        let pending = 4;

        mong.connect(start.uri, options);
        const db = mong.connection;

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

        const events = [];
        mong.events.on('createConnection', conn => events.push(conn));

        const db2 = mong.createConnection(start.uri, options);

        assert.equal(events.length, 1);
        assert.equal(events[0], db2);

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
    });

    it('with callback', function(done) {
      const mong = new Mongoose();

      mong.connect(start.uri, options);

      mong.connection.on('open', function() {
        mong.disconnect().then(() => done()).catch(err => done(err));
      });
    });

    it('with promise (gh-3790)', function(done) {
      const _mongoose = new Mongoose();

      _mongoose.connect(start.uri, options);

      _mongoose.connection.on('open', function() {
        _mongoose.disconnect().then(function() { done(); });
      });
    });
  });

  describe('model()', function() {
    it('accessing a model that hasn\'t been defined', function() {
      const mong = new Mongoose();
      let thrown = false;

      try {
        mong.model('Test');
      } catch (e) {
        assert.ok(/hasn't been registered/.test(e.message));
        thrown = true;
      }

      assert.equal(thrown, true);
    });

    it('returns the model at creation', function() {
      const Named = mongoose.model('Named', new Schema({ name: String }));
      const n1 = new Named();
      assert.equal(n1.name, null);
      const n2 = new Named({ name: 'Peter Bjorn' });
      assert.equal(n2.name, 'Peter Bjorn');

      const schema = new Schema({ number: Number });
      const Numbered = mongoose.model('Numbered', schema, collection);
      const n3 = new Numbered({ number: 1234 });
      assert.equal(n3.number.valueOf(), 1234);
    });

    it('prevents overwriting pre-existing models', function() {
      const m = new Mongoose();
      m.model('A', new Schema());

      assert.throws(function() {
        m.model('A', new Schema());
      }, /Cannot overwrite `A` model/);
    });

    it('allows passing identical name + schema args', function() {
      const m = new Mongoose();
      const schema = new Schema();
      const model = m.model('A', schema);

      assert.doesNotThrow(function() {
        m.model('A', model.schema);
      });

      assert.equal(model, m.model('A', model.schema));
    });

    it('allows passing identical name+schema+collection args (gh-5767)', function() {
      const m = new Mongoose();
      const schema = new Schema();
      const model = m.model('A', schema, 'AA');

      assert.doesNotThrow(function() {
        m.model('A', model.schema, 'AA');
      });

      assert.equal(model, m.model('A', model.schema, 'AA'));
    });

    it('throws on unknown model name', function() {
      assert.throws(function() {
        mongoose.model('iDoNotExist!');
      }, /Schema hasn't been registered/);
    });

    describe('passing collection name', function() {
      describe('when model name already exists', function() {
        it('returns a new uncached model', function() {
          const m = new Mongoose();
          const s1 = new Schema({ a: [] });
          const name = 'Test';
          const A = m.model(name, s1);
          const B = m.model(name);
          const C = m.model(name, 'alternate');
          assert.ok(A.collection.name === B.collection.name);
          assert.ok(A.collection.name !== C.collection.name);
          assert.ok(m.models[name].collection.name !== C.collection.name);
          assert.ok(m.models[name].collection.name === A.collection.name);
        });
      });
    });

    describe('passing object literal schemas', function() {
      it('works', function() {
        const m = new Mongoose();
        const A = m.model('A', { n: [{ age: 'number' }] });
        const a = new A({ n: [{ age: '47' }] });
        assert.strictEqual(47, a.n[0].age);
      });
    });
  });

  it('clones schema when instance of another Mongoose instance\'s Schema class (gh-11047)', function() {
    const m = new Mongoose();
    const schema = new Schema({ name: String });

    const Test = m.connection.model('Test', schema);
    assert.equal(Test.schema.obj.name, String);
  });

  it('deleteModel()', function() {
    const mongoose = new Mongoose();

    mongoose.model('gh6813', new mongoose.Schema({ name: String }));

    assert.ok(mongoose.model('gh6813'));
    mongoose.deleteModel('gh6813');

    assert.throws(function() {
      mongoose.model('gh6813');
    }, /Schema hasn't been registered/);

    const Model = mongoose.model('gh6813', new Schema({ name: String }));
    assert.ok(Model);
  });

  describe('connecting with a signature of uri, options, function', function() {
    it('with single mongod', async function() {
      const mong = new Mongoose();

      await mong.connect(start.uri, options);

      await mong.connection.close();
    });

    it('with replica set', async function() {
      const mong = new Mongoose();

      if (!start.uri) {
        return this.skip();
      }

      await mong.connect(start.uri, options);

      await mong.connection.close();
    });
  });

  it('isValidObjectId (gh-3823)', function() {
    assert.ok(mongoose.isValidObjectId('0123456789ab'));
    assert.ok(mongoose.isValidObjectId('5f5c2d56f6e911019ec2acdc'));
    assert.ok(mongoose.isValidObjectId('608DE01F32B6A93BBA314159'));
    assert.ok(mongoose.isValidObjectId(new mongoose.Types.ObjectId()));
    assert.ok(mongoose.isValidObjectId(6));
    assert.ok(!mongoose.isValidObjectId({ test: 42 }));
  });

  it('isObjectIdOrHexString (gh-11419)', function() {
    assert.ok(!mongoose.isObjectIdOrHexString('0123456789ab'));
    assert.ok(mongoose.isObjectIdOrHexString('5f5c2d56f6e911019ec2acdc'));
    assert.ok(mongoose.isObjectIdOrHexString('608DE01F32B6A93BBA314159'));
    assert.ok(mongoose.isObjectIdOrHexString(new mongoose.Types.ObjectId()));
    assert.ok(!mongoose.isObjectIdOrHexString(6));
    assert.ok(!mongoose.isValidObjectId({ test: 42 }));
  });

  it('global `strictPopulate` works when false (gh-10694)', async function() {
    const mongoose = new Mongoose();
    mongoose.set('strictPopulate', false);
    const schema = new mongoose.Schema({ name: String });
    const db = await mongoose.connect(start.uri);
    const Movie = db.model('Movie', schema);
    const Person = db.model('Person', new mongoose.Schema({
      name: String
    }));

    const movie = await Movie.create({ name: 'The Empire Strikes Back' });
    await Person.create({ name: 'Test1', favoriteMovie: movie._id });
    const entry = await Person.findOne().populate({ path: 'favoriteMovie' });
    assert(entry);
    await mongoose.disconnect();
  });
  it('global `strictPopulate` works when true (gh-10694)', async function() {
    const mongoose = new Mongoose();
    mongoose.set('strictPopulate', true);
    const schema = new mongoose.Schema({ name: String });
    const db = await mongoose.connect(start.uri);
    const Movie = db.model('Movie', schema);
    const Person = db.model('Person', new mongoose.Schema({
      name: String
    }));

    const movie = await Movie.create({ name: 'The Empire Strikes Back' });
    await Person.create({ name: 'Test1', favoriteMovie: movie._id });
    await assert.rejects(async() => {
      await Person.findOne().populate({ path: 'favoriteGame' });
    }, { message: 'Cannot populate path `favoriteGame` because it is not in your schema. Set the `strictPopulate` option to false to override.' });
    await mongoose.disconnect();
  });
  it('allows global `strictPopulate` to be overriden on specific queries set to true (gh-10694)', async function() {
    const mongoose = new Mongoose();
    mongoose.set('strictPopulate', false);
    const schema = new mongoose.Schema({ name: String });
    const db = await mongoose.connect(start.uri);
    const Movie = db.model('Movie', schema);
    const Person = db.model('Person', new mongoose.Schema({
      name: String
    }));
    const movie = await Movie.create({ name: 'The Empire Strikes Back' });
    await Person.create({ name: 'Test1', favoriteMovie: movie._id });
    await assert.rejects(async() => {
      await Person.findOne().populate({ path: 'favoriteGame', strictPopulate: true });
    }, { message: 'Cannot populate path `favoriteGame` because it is not in your schema. Set the `strictPopulate` option to false to override.' });
    await mongoose.disconnect();
  });
  it('allows global `strictPopulate` to be overriden on specific queries set to false (gh-10694)', async function() {
    const mongoose = new Mongoose();
    mongoose.set('strictPopulate', false);
    const schema = new mongoose.Schema({ name: String });
    const db = await mongoose.connect(start.uri);
    const Movie = db.model('Movie', schema);
    const Person = db.model('Person', new mongoose.Schema({
      name: String
    }));
    const movie = await Movie.create({ name: 'The Empire Strikes Back' });
    await Person.create({ name: 'Test1', favoriteMovie: movie._id });
    const entry = await Person.findOne().populate({ path: 'favoriteMovie' });
    assert(entry);
    await mongoose.disconnect();
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
      assert.equal(typeof mongoose.Model, 'function');
      assert.equal(typeof mongoose.Document, 'function');
      assert.equal(typeof mongoose.Error, 'function');
      assert.equal(typeof mongoose.Error.CastError, 'function');
      assert.equal(typeof mongoose.Error.ValidationError, 'function');
      assert.equal(typeof mongoose.Error.ValidatorError, 'function');
      assert.equal(typeof mongoose.Error.VersionError, 'function');
    }

    it('of module', function() {
      test(mongoose);
    });

    it('of new Mongoose instances', function() {
      test(new mongoose.Mongoose());
    });

    it('of result from .connect() (gh-3940)', async function() {
      const m = new mongoose.Mongoose();
      const resolvedMongoose = await m.connect(start.uri, options);

      test(resolvedMongoose);
      await m.disconnect();
    });

    it('connect with url doesnt cause unhandled rejection (gh-6997)', async function() {
      const m = new mongoose.Mongoose();
      const _options = Object.assign({}, options, { serverSelectionTimeoutMS: 100 });
      const error = await m.connect('mongodb://doesnotexist:27009/test', _options).then(() => null, err => err);

      assert.ok(error);
    });

    it('can set `setDefaultsOnInsert` as a global option (gh-9032)', async function() {
      const m = new mongoose.Mongoose();
      m.set('setDefaultsOnInsert', true);
      const db = await m.connect(start.uri);

      const schema = new m.Schema({
        title: String,
        genre: { type: String, default: 'Action' }
      }, { collection: 'movies_1' });

      const Movie = db.model('Movie', schema);
      await Movie.deleteMany({});

      await Movie.updateOne(
        {},
        { title: 'Cloud Atlas' },
        { upsert: true }
      );

      // lean is necessary to avoid defaults by casting
      const movie = await Movie.findOne({ title: 'Cloud Atlas' }).lean();
      assert.equal(movie.genre, 'Action');
      await m.disconnect();
    });

    it('setting `setDefaultOnInsert` on operation has priority over base option (gh-9032)', async function() {
      const m = new mongoose.Mongoose();
      m.set('setDefaultsOnInsert', true);

      const db = await m.connect(start.uri);

      const schema = new m.Schema({
        title: String,
        genre: { type: String, default: 'Action' }
      }, { collection: 'movies_2' });

      const Movie = db.model('Movie', schema);


      await Movie.updateOne(
        {},
        { title: 'The Man From Earth' },
        { upsert: true, setDefaultsOnInsert: false }
      );

      // lean is necessary to avoid defaults by casting
      const movie = await Movie.findOne({ title: 'The Man From Earth' }).lean();
      assert.ok(!movie.genre);
      await m.disconnect();
    });
    it('should prevent non-hexadecimal strings (gh-9996)', function() {
      const badIdString = 'z'.repeat(24);
      assert.deepStrictEqual(mongoose.isValidObjectId(badIdString), false);
      const goodIdString = '1'.repeat(24);
      assert.deepStrictEqual(mongoose.isValidObjectId(goodIdString), true);
      const goodIdString2 = '1'.repeat(12);
      assert.deepStrictEqual(mongoose.isValidObjectId(goodIdString2), true);
    });
    it('Allows a syncIndexes shorthand mongoose.syncIndexes (gh-10893)', async function() {
      const m = new mongoose.Mongoose();
      assert.deepEqual(await m.syncIndexes(), {});
    });

    it('Allows for the removal of indexes via string or object (gh-11547)', async function() {
      const schema = new Schema({
        title: String,
        weight: Number,
        age: Number,
        name: String,
        location: String
      });

      schema.index({ title: 1 }, { name: 'title index' });
      schema.index({ weight: 1 });
      schema.index({ age: 1, name: 1 });
      schema.index({ location: 1 });
      assert.equal(schema._indexes.length, 4);

      schema.removeIndex('title index');
      assert.equal(schema.indexes().length, 3);
      assert.deepStrictEqual(
        schema.indexes().map(i => i[0]),
        [{ weight: 1 }, { age: 1, name: 1 }, { location: 1 }]
      );

      schema.removeIndex({ age: 1, name: 1 });
      assert.equal(schema.indexes().length, 2);
      assert.deepStrictEqual(
        schema.indexes().map(i => i[0]),
        [{ weight: 1 }, { location: 1 }]
      );

      schema.removeIndex({ weight: 1 });
      assert.equal(schema.indexes().length, 1);
      assert.deepStrictEqual(schema.indexes().map(i => i[0]), [{ location: 1 }]);

      schema.clearIndexes();
      assert.equal(schema.indexes().length, 0);
    });

    describe('global `allowDiskUse` (gh-11478)', () => {
      this.afterEach(() => sinon.restore());

      it('is `undefined` by default', async() => {
        // Arrange
        const m = new mongoose.Mongoose();

        const db = await m.connect(start.uri);

        const userSchema = new m.Schema({
          name: String
        });

        const User = db.model('User', userSchema);

        const nativeAggregateSpy = sinon.spy(User.collection, 'aggregate');

        // Act
        await User.aggregate([{ $match: {} }]);

        // Assert
        const optionsSentToMongo = nativeAggregateSpy.args[0][1];
        assert.strictEqual(optionsSentToMongo.allowDiskUse, undefined);
        await m.disconnect();
      });

      it('works when set to `true` and no option provided', async() => {
        // Arrange
        const m = new mongoose.Mongoose();
        m.set('allowDiskUse', true);

        const db = await m.connect(start.uri);

        const userSchema = new m.Schema({
          name: String
        });

        const User = db.model('User', userSchema);
        const nativeAggregateSpy = sinon.spy(User.collection, 'aggregate');

        // Act
        await User.aggregate([{ $match: {} }]);

        // Assert
        const optionsSentToMongo = nativeAggregateSpy.args[0][1];
        assert.strictEqual(optionsSentToMongo.allowDiskUse, true);
        await m.disconnect();
      });
      it('can be overridden by a specific query', async() => {
        // Arrange
        const m = new mongoose.Mongoose();
        m.set('allowDiskUse', true);

        const db = await m.connect(start.uri);

        const userSchema = new m.Schema({
          name: String
        });

        const User = db.model('User', userSchema);
        const nativeAggregateSpy = sinon.spy(User.collection, 'aggregate');

        // Act
        await User.aggregate([{ $match: {} }]).allowDiskUse(false);

        // Assert
        const optionsSentToMongo = nativeAggregateSpy.args[0][1];
        assert.equal(optionsSentToMongo.allowDiskUse, false);
        await m.disconnect();
      });
    });
    describe('global `timestamps.createdAt.immutable` (gh-10139)', () => {
      it('is `true` by default', () => {
        // Arrange
        const m = new mongoose.Mongoose();

        // Act
        const userSchema = new m.Schema({ name: String }, { timestamps: true });

        // Assert
        assert.equal(userSchema.path('createdAt').options.immutable, true);
      });

      it('can be overridden to `false`', () => {
        // Arrange
        const m = new mongoose.Mongoose();
        m.set('timestamps.createdAt.immutable', false);

        // Act
        const userSchema = new m.Schema({ name: String }, { timestamps: true });

        // Assert
        assert.equal(userSchema.path('createdAt').options.immutable, false);
      });
    });
  });

  describe('global id option', function() {
    it('can disable the id virtual on schemas gh-11966', async function() {
      const m = new mongoose.Mongoose();
      m.set('id', false);

      const db = await m.connect(start.uri);

      const schema = new m.Schema({ title: String });

      const falseID = db.model('gh11966', schema);


      const entry = await falseID.create({
        title: 'The IDless master'
      });
      assert.equal(entry.id, undefined);
      await m.disconnect();
    });
  });

  describe('set()', function() {
    let m;

    beforeEach(() => {
      m = new mongoose.Mongoose();
    });

    it('should be able to set a option through set with (key, value)', function() {
      // also test the getter behavior of the function
      assert.strictEqual(m.options['debug'], undefined);
      assert.strictEqual(m.set('debug'), undefined);
      m.set('debug', true);

      assert.strictEqual(m.options['debug'], true);
      assert.strictEqual(m.set('debug'), true);
    });

    it('should be able to set a option through a object with {key: value}', function() {
      assert.strictEqual(m.options['debug'], undefined);
      m.set({ debug: true });

      assert.strictEqual(m.options['debug'], true);
    });

    it('should throw a single error when using a invalid key', function() {
      try {
        m.set('invalid', true);
        assert.fail('Expected .set to throw');
      } catch (err) {
        assert.ok(err instanceof SetOptionError);
        assert.strictEqual(Object.keys(err.errors).length, 1);
        assert.strictEqual(err.message, 'invalid: "invalid" is not a valid option to set');
      }
    });

    it('should throw a error with many errors when using multiple invalid keys', function() {
      try {
        m.set({
          invalid1: true,
          invalid2: true
        });
        assert.fail('Expected .set to throw');
      } catch (err) {
        assert.ok(err instanceof SetOptionError);
        assert.strictEqual(Object.keys(err.errors).length, 2);
        assert.strictEqual(err.message, 'invalid1: "invalid1" is not a valid option to set, invalid2: "invalid2" is not a valid option to set');
        assert.ok(err.errors['invalid1'] instanceof SetOptionError.SetOptionInnerError);
        assert.strictEqual(err.errors['invalid1'].message, '"invalid1" is not a valid option to set');
        assert.ok(err.errors['invalid2'] instanceof SetOptionError.SetOptionInnerError);
        assert.strictEqual(err.errors['invalid2'].message, '"invalid2" is not a valid option to set');
      }
    });

    it('should apply all values, even if there are errors', function() {
      assert.strictEqual(m.options['debug'], undefined);
      try {
        m.set({
          invalid: true,
          debug: true
        });
        assert.fail('Expected .set to throw');
      } catch (err) {
        assert.ok(err instanceof SetOptionError);
        assert.ok(err.errors['invalid'] instanceof SetOptionError.SetOptionInnerError);
        assert.strictEqual(err.message, 'invalid: "invalid" is not a valid option to set');
        assert.strictEqual(m.options['debug'], true);
      }
    });

    it('should throw a single error when using a invalid key when getting', function() {
      try {
        m.set('invalid');
        assert.fail('Expected .set to throw');
      } catch (err) {
        assert.ok(err instanceof SetOptionError);
        assert.ok(err.errors['invalid'] instanceof SetOptionError.SetOptionInnerError);
        assert.strictEqual(err.message, 'invalid: "invalid" is not a valid option to set');
      }
    });
  });
});
