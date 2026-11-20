'use strict';

/**
 * Known prototype pollution vectors: `__proto__`, `constructor`, and `prototype`
 * keys, and keys like `toString` that resolve to properties inherited from
 * built-in prototypes. The appendix at the end checks the MongoDB behavior that
 * Mongoose's protections rely on.
 */

const start = require('./common');

const assert = require('assert');
const setDottedPath = require('../lib/helpers/path/setDottedPath');
const util = require('./util');
const utils = require('../lib/utils');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('prototype pollution', function() {
  let db;
  let Test;
  let Loose;

  before(async function() {
    db = start();
    await db.asPromise();

    const testSchema = new Schema({
      name: String,
      age: Number,
      tags: [String],
      nested: { name: String },
      mixed: {},
      password: { type: String, select: false },
      sub: new Schema({ name: String, email: { type: String, required: true } }, { strict: false }),
      events: [new Schema({ message: String })],
      event: new Schema({ message: String }),
      map: { type: Map, of: new Schema({ name: String }) },
      ref: { type: Schema.Types.ObjectId, ref: 'Test' }
    });
    testSchema.path('events').discriminator('Clicked', new Schema({ element: String }));
    testSchema.path('event').discriminator('Clicked', new Schema({ element: String }));
    Test = db.model('Test', testSchema);
    Test.discriminator('Child', new Schema({ extra: String }));

    Loose = db.model('Loose', new Schema({ name: String }, { strict: false }));
  });

  after(async function() {
    await db.close();
  });

  afterEach(() => util.clearTestData(db));

  // Undo any pollution so a failing test doesn't break other tests
  afterEach(function() {
    delete Object.prototype.polluted;
    delete Object.prototype.$gt;
    delete Object.prototype.$mod;
    delete Object.polluted;
    delete Object.$gt;
    delete Object.$mod;
    delete Object.prototype.toString.call;
    delete Object.prototype.toString.polluted;
    delete Object.prototype.toString.$mod;
    delete Object.prototype.valueOf.call;
    delete Object.prototype.valueOf.polluted;
    delete Function.prototype.polluted;
    delete Function.prototype.call.polluted;
    delete Array.prototype.push.polluted;
    delete mongoose.Document.prototype.toObject.polluted;
    delete mongoose.Document.prototype.toJSON.polluted;
  });

  describe('Schema', function() {
    it('path() does not return inherited properties', function() {
      const schema = Test.schema;

      const paths = [
        schema.path('__proto__'),
        schema.path('constructor'),
        schema.path('prototype'),
        schema.path('toString'),
        schema.path('map.key.__proto__'),
        schema.path('map.key.constructor'),
        schema.path('map.key.prototype'),
        schema.path('map.key.toString')
      ];

      assert.deepStrictEqual(paths, Array(8).fill(undefined));
    });

    it('pathType() treats inherited properties as adhoc or undefined', function() {
      const schema = Test.schema;

      const pathTypes = [
        schema.pathType('__proto__'),
        schema.pathType('constructor'),
        schema.pathType('prototype'),
        schema.pathType('toString'),
        schema.pathType('map.key.__proto__'),
        schema.pathType('map.key.constructor'),
        schema.pathType('map.key.prototype'),
        schema.pathType('map.key.toString')
      ];

      assert.deepStrictEqual(pathTypes, Array(8).fill('adhocOrUndefined'));
    });

    it('path() throws when setting special properties', function() {
      const schema = new Schema({}, { suppressReservedKeysWarning: true });

      assert.throws(() => schema.path('__proto__', String), /Cannot set special property `__proto__` on a schema/);
      assert.throws(() => schema.path('__proto__.nested', String), /Cannot set special property `__proto__` on a schema/);
      assert.throws(() => schema.path('nested.__proto__', String), /Cannot set special property `__proto__` on a schema/);
      assert.throws(() => schema.path('constructor', String), /Cannot set special property `constructor` on a schema/);
      assert.throws(() => schema.path('constructor.nested', String), /Cannot set special property `constructor` on a schema/);
      assert.throws(() => schema.path('nested.constructor', String), /Cannot set special property `constructor` on a schema/);
      assert.throws(() => schema.path('prototype', String), /Cannot set special property `prototype` on a schema/);
      assert.throws(() => schema.path('prototype.nested', String), /Cannot set special property `prototype` on a schema/);
      assert.throws(() => schema.path('nested.prototype', String), /Cannot set special property `prototype` on a schema/);
    });

    it('constructor and add() throw on special properties (gh-12085)', function() {
      const definition = JSON.parse('{"__proto__.toString":"Number"}');

      assert.throws(() => new Schema(definition), /__proto__/);
      assert.throws(() => new Schema({}).add(definition), /__proto__/);
      assert.strictEqual(typeof {}.toString(), 'string');
    });

    it('virtual() and the `virtuals` option throw on special properties', function() {
      const schema = new Schema({});
      const options = JSON.parse('{"virtuals":{"__proto__.polluted":{}}}');

      assert.throws(() => schema.virtual('__proto__.polluted'), /Cannot set special property/);
      assert.throws(() => schema.virtual('constructor.prototype.polluted'), /Cannot set special property/);
      assert.throws(() => schema.virtual('hasOwnProperty.__proto__.polluted'), /Cannot set special property/);
      assert.throws(() => new Schema({}, options), /Cannot set special property/);
      assert.strictEqual(Object.prototype.polluted, undefined);
      assert.strictEqual(Function.prototype.polluted, undefined);
    });
  });

  describe('Document', function() {
    it('does not write through `__proto__` or `constructor.prototype` with strict: false', function() {
      const doc = new Loose({ '__proto__.polluted': 'foo' });

      doc.set('__proto__.polluted', 'bar');
      doc.set('constructor.prototype.polluted', 'baz');

      assert.strictEqual(Object.prototype.polluted, undefined);
      assert.strictEqual(Loose.polluted, undefined);
      assert.strictEqual(Loose.prototype.polluted, undefined);
    });

    it('get() does not read special properties', function() {
      const doc = new Test({ name: 'test' });

      const values = [
        doc.get('__proto__.constructor'),
        doc.get('constructor.prototype'),
        doc.get('name.__proto__'),
        doc.get('__proto__', null, { noDottedPath: true }),
        doc.get('constructor', null, { noDottedPath: true }),
        doc.get('prototype', null, { noDottedPath: true }),
        doc.get('__proto__', null, { virtuals: true }),
        doc.get('constructor', null, { virtuals: true }),
        doc.get('prototype', null, { virtuals: true })
      ];

      assert.deepStrictEqual(values, Array(9).fill(undefined));
    });

    it('does not pollute prototypes when loading fields renamed to `__proto__` or `constructor`', async function() {
      const [doc1, doc2] = await Test.create([{ name: 'a' }, { name: 'b' }]);
      await Test.updateOne({ _id: doc1._id }, { $rename: { name: '__proto__.polluted' } });
      await Test.updateOne({ _id: doc2._id }, { $rename: { name: 'constructor.polluted' } });

      await Test.find();

      assert.strictEqual(Object.prototype.polluted, undefined);
      assert.strictEqual(Object.polluted, undefined);
    });

    it('does not modify inherited properties like toString when loading documents', async function() {
      await Test.collection.insertOne({
        name: 'test',
        toString: { call: 1, polluted: 'yes' },
        valueOf: { call: { polluted: 'yes' } },
        nested: { name: 'test', toString: { polluted: 'yes' } }
      });

      const doc = await Test.findOne();
      const hydrated = Test.hydrate({ name: 'test', toString: { polluted: 'yes' } });

      assert.strictEqual(typeof Object.prototype.toString.call, 'function');
      assert.strictEqual(Object.prototype.toString.polluted, undefined);
      assert.strictEqual(Function.prototype.call.polluted, undefined);
      assert.strictEqual(doc.name, 'test');
      assert.strictEqual(doc.nested.name, 'test');
      assert.ok(!Object.hasOwn(doc._doc, 'toString'));
      assert.ok(!Object.hasOwn(doc._doc, 'valueOf'));
      assert.ok(!Object.hasOwn(doc._doc.nested, 'toString'));
      assert.ok(!Object.hasOwn(hydrated._doc, 'toString'));
    });

    it('does not set paths underneath inherited functions in Mixed paths', function() {
      const data = JSON.parse('{"mixed.toString.call":1,"mixed.valueOf.call.polluted":"yes"}');

      const doc = new Test(data);
      doc.set({ 'mixed.toString.polluted': 'yes' });

      assert.strictEqual(typeof Object.prototype.toString.call, 'function');
      assert.strictEqual(Object.prototype.toString.polluted, undefined);
      assert.strictEqual(Function.prototype.call.polluted, undefined);
      assert.ok(!Object.hasOwn(doc.mixed, 'toString'));
      assert.ok(!Object.hasOwn(doc.mixed, 'valueOf'));
    });

    it('does not set paths underneath inherited array methods in Mixed paths', function() {
      const doc = new Test({ mixed: { list: [1] } });

      doc.set('mixed.list.push.polluted', 'yes');

      assert.strictEqual(Array.prototype.push.polluted, undefined);
      assert.strictEqual(typeof doc.mixed.list.push, 'function');
    });

    it('does not set paths underneath inherited functions with strict: false', function() {
      const doc = new Loose({});

      doc.set('toString.polluted', 'yes');

      assert.strictEqual(Object.prototype.toString.polluted, undefined);
      assert.ok(!Object.hasOwn(doc._doc, 'toString'));
    });

    it('does not set paths underneath document methods in strict: false subdocuments', function() {
      const doc = new Test({ sub: { name: 'test' } });

      doc.set('sub.toObject.polluted', 'yes');
      doc.set('sub.toJSON.polluted', 'yes');

      assert.strictEqual(mongoose.Document.prototype.toObject.polluted, undefined);
      assert.strictEqual(mongoose.Document.prototype.toJSON.polluted, undefined);
      assert.strictEqual(doc.toObject().sub.name, 'test');
      assert.strictEqual(doc.toJSON().sub.name, 'test');
    });

    it('does not set paths underneath document internals like `$__schema` in strict: false subdocuments', async function() {
      const doc = new Test({ sub: { name: 'test', email: 'test@example.com' } });
      const other = new Test({ sub: { name: 'other' } });

      doc.set('sub.$__schema.paths.email.validators', []);
      doc.set('sub.$__schema.options.polluted', 'yes');

      await assert.rejects(other.validate(), /Path `email` is required/);
      assert.strictEqual(other.sub.$__schema.options.polluted, undefined);
    });
  });

  describe('Query', function() {
    it('where() throws on special property paths', function() {
      const query = Test.find();

      assert.throws(() => query.where('__proto__').gt(1), /Cannot use `__proto__` as a query path/);
      assert.throws(() => query.where('__proto__', { $gt: 1 }), /Cannot use `__proto__` as a query path/);
      assert.throws(() => query.where('constructor').gt(1), /Cannot use `constructor` as a query path/);
      assert.throws(() => query.where('constructor', { $gt: 1 }), /Cannot use `constructor` as a query path/);
      assert.throws(() => query.where('prototype').gt(1), /Cannot use `prototype` as a query path/);
      assert.throws(() => query.where('prototype', { $gt: 1 }), /Cannot use `prototype` as a query path/);
      assert.deepStrictEqual(query.getFilter(), {});
      assert.strictEqual(Object.prototype.$gt, undefined);
      assert.strictEqual(Object.$gt, undefined);
    });

    it('mod() throws on special property paths', function() {
      const query = Test.find();

      assert.throws(() => query.mod('__proto__', [2, 1]), /Cannot use `__proto__` as a query path/);
      assert.throws(() => query.mod('__proto__', 2, 1), /Cannot use `__proto__` as a query path/);
      assert.throws(() => query.mod(['__proto__'], [2, 1]), /Cannot use `__proto__` as a query path/);
      assert.throws(() => query.mod('constructor', [2, 1]), /Cannot use `constructor` as a query path/);
      assert.throws(() => query.mod('constructor', 2, 1), /Cannot use `constructor` as a query path/);
      assert.throws(() => query.mod('prototype', [2, 1]), /Cannot use `prototype` as a query path/);
      assert.throws(() => query.mod('prototype', 2, 1), /Cannot use `prototype` as a query path/);
      assert.deepStrictEqual(query.getFilter(), {});
      assert.strictEqual(Object.prototype.$mod, undefined);
      assert.strictEqual(Object.$mod, undefined);
    });

    it('mod() does not reuse inherited properties like toString', function() {
      const query = Test.find();

      query.mod('toString', [2, 1]);

      assert.deepStrictEqual(query.getFilter(), { toString: { $mod: [2, 1] } });
      assert.strictEqual(Object.prototype.toString.$mod, undefined);
    });

    it('does not use inherited properties like valueOf as query operators', async function() {
      await assert.rejects(Test.find(JSON.parse('{"name":{"$eq":"test","valueOf":1}}')), /Can't use valueOf/);
      await assert.rejects(Test.find(JSON.parse('{"name":{"$in":["test"],"toString":1}}')), /Can't use toString/);
      await assert.rejects(Test.find(JSON.parse('{"age":{"$gt":1,"hasOwnProperty":"x"}}')), /Can't use hasOwnProperty/);
      await assert.rejects(Test.find(JSON.parse('{"tags":{"$all":["test"],"valueOf":1}}')), /Can't use valueOf/);
    });

    it('casts values with a fake `constructor` as invalid (gh-7290)', async function() {
      const filter = { name: { length: 1e10, constructor: { name: 'Array' } } };

      const errors = await Promise.all([
        Test.findOne(filter).then(() => null, err => err),
        Test.updateOne(filter, { age: 1 }).then(() => null, err => err),
        Test.updateOne({}, filter).then(() => null, err => err),
        Test.deleteOne(filter).then(() => null, err => err)
      ]);

      assert.deepStrictEqual(errors.map(err => err?.name), Array(4).fill('CastError'));
    });

    it('casts values with a fake `__proto__` as invalid (gh-7290)', async function() {
      const filter = JSON.parse('{"name":{"length":1000000000,"__proto__":[]}}');

      const errors = await Promise.all([
        Test.findOne(filter).then(() => null, err => err),
        Test.updateOne(filter, { age: 1 }).then(() => null, err => err),
        Test.updateOne({}, filter).then(() => null, err => err),
        Test.deleteOne(filter).then(() => null, err => err)
      ]);

      assert.deepStrictEqual(errors.map(err => err?.name), Array(4).fill('CastError'));
    });

    it('throws on inherited properties like toString in updates with strict: throw', async function() {
      const update = JSON.parse('{"toString":1}');

      await assert.rejects(Test.updateOne({}, update, { strict: 'throw' }), /Field `toString` is not in schema/);
    });

    it('findOneAndReplace() does not modify inherited properties like toString', function() {
      const replacement = JSON.parse('{"toString":{"call":1,"polluted":"yes"}}');

      const query = Test.findOneAndReplace({}, replacement);

      assert.strictEqual(typeof Object.prototype.toString.call, 'function');
      assert.strictEqual(Object.prototype.toString.polluted, undefined);
      assert.ok(!Object.hasOwn(query.getUpdate(), 'toString'));
    });

    it('chained updateOne() does not modify inherited properties like valueOf', function() {
      const query = Test.updateOne({}, { name: 'test' });

      query.updateOne({}, JSON.parse('{"valueOf":{"call":{"polluted":"yes"}}}'));

      assert.strictEqual(Function.prototype.call.polluted, undefined);
    });

    it('merge() does not modify inherited properties like toString', function() {
      const source = Test.updateOne({}, JSON.parse('{"toString":{"polluted":"yes"}}'));

      Test.updateOne({}, { name: 'test' }).merge(source);

      assert.strictEqual(Object.prototype.toString.polluted, undefined);
    });

    it('does not let an own `__proto__` key in select() drop select: false paths', async function() {
      await Test.create({ name: 'test', password: 'secret' });
      const query = Test.findOne().sanitizeProjection(true).select(JSON.parse('{"__proto__":{"password":0}}')).lean();

      const doc = await query;

      assert.strictEqual(doc.password, undefined);
      assert.strictEqual(doc.name, 'test');
      assert.strictEqual(Object.getPrototypeOf(query._fields), Object.prototype);
    });

    it('preserves own `__proto__` keys in updates without modifying the caller\'s update (gh-16202)', async function() {
      const doc = await Test.create({ mixed: {} });
      const update = { $set: { mixed: { ['__proto__']: 'abcd' } } };

      const res = await Test.findOneAndUpdate({ _id: doc._id }, update, { returnDocument: 'after', cloneUpdate: false }).lean();

      assert.ok(Object.hasOwn(update.$set.mixed, '__proto__'));
      assert.strictEqual(update.$set.mixed.__proto__, 'abcd');
      assert.ok(Object.hasOwn(res.mixed, '__proto__'));
      assert.strictEqual(res.mixed.__proto__, 'abcd');
    });
  });

  describe('Model', function() {
    it('discriminator() throws on `__proto__` names without changing prototypes', function() {
      assert.throws(() => Test.discriminator('__proto__', new Schema({ x: Number })), /Discriminator name "__proto__" is not allowed/);
      assert.throws(() => Test.schema.path('events').discriminator('__proto__', new Schema({ x: Number })), /Discriminator name "__proto__" is not allowed/);
      assert.throws(() => Test.schema.path('event').discriminator('__proto__', new Schema({ x: Number })), /Discriminator name "__proto__" is not allowed/);

      assert.strictEqual(Object.getPrototypeOf(Test.schema.discriminators), Object.prototype);
      assert.strictEqual(Object.getPrototypeOf(Test.discriminators), Object.prototype);
      assert.strictEqual(Object.getPrototypeOf(Test.schema.path('events').schema.discriminators), Object.prototype);
      assert.strictEqual(Object.getPrototypeOf(Test.schema.path('event').schema.discriminators), Object.prototype);
    });

    it('discriminator() allows names that match inherited properties like `constructor`', async function() {
      const schema = new Schema({ name: String, events: [new Schema({ message: String })] });
      schema.path('events').discriminator('toString', new Schema({ element: String }));
      const Shape = db.model('Shape', schema);
      const Constructor = Shape.discriminator('constructor', new Schema({ extra: String }));

      const { _id } = await Shape.create({ __t: 'constructor', extra: 'a', events: [{ __t: 'toString', element: 'b' }] });
      const doc = await Shape.findById(_id);

      assert.ok(doc instanceof Constructor);
      assert.strictEqual(doc.extra, 'a');
      assert.strictEqual(doc.events[0].element, 'b');
      assert.throws(() => Shape.discriminator('constructor', new Schema({})), /Discriminator with name "constructor" already exists/);
    });
  });

  describe('discriminator keys that match inherited properties', function() {
    it('new Model() uses the base model', async function() {
      const docs = [
        new Test({ __t: 'constructor' }),
        new Test({ __t: 'toString' }),
        new Test({ __t: 'hasOwnProperty' }),
        new Test({ __t: '__proto__' })
      ];

      await Promise.all(docs.map(doc => doc.validate()));

      assert.deepStrictEqual(docs.map(doc => doc.constructor), [Test, Test, Test, Test]);
    });

    it('hydrate() uses the base model', function() {
      const docs = [
        Test.hydrate({ __t: 'constructor' }),
        Test.hydrate({ __t: 'toString' }),
        Test.hydrate({ __t: 'hasOwnProperty' }),
        Test.hydrate({ __t: '__proto__' })
      ];

      assert.deepStrictEqual(docs.map(doc => doc.constructor), [Test, Test, Test, Test]);
    });

    it('create() throws like any other unknown discriminator', async function() {
      await assert.rejects(Test.create([{ __t: 'constructor' }]), /Discriminator "constructor" not found for model "Test"/);
      await assert.rejects(Test.create([{ __t: 'toString' }]), /Discriminator "toString" not found for model "Test"/);
      await assert.rejects(Test.create([{ __t: 'hasOwnProperty' }]), /Discriminator "hasOwnProperty" not found for model "Test"/);
    });

    it('insertMany() uses the base model', async function() {
      const docs = await Test.insertMany([{ __t: 'constructor' }, { __t: 'toString' }, { __t: 'hasOwnProperty' }]);

      assert.deepStrictEqual(docs.map(doc => doc.constructor), [Test, Test, Test]);
    });

    it('bulkWrite() uses the base schema', async function() {
      const ops = [
        { insertOne: { document: { name: 'a', notInSchema: true, __t: 'constructor' } } },
        { insertOne: { document: { name: 'b', notInSchema: true, __t: 'toString' } } },
        { insertOne: { document: { name: 'c', notInSchema: true, __t: 'hasOwnProperty' } } }
      ];

      await Test.bulkWrite(ops, { skipValidation: true });

      const raw = await Test.collection.find().sort({ name: 1 }).toArray();
      assert.deepStrictEqual(raw.map(doc => doc.notInSchema), [undefined, undefined, undefined]);
    });

    it('find() uses the base model', async function() {
      await Test.collection.insertMany([
        { name: 'a', __t: 'constructor' },
        { name: 'b', __t: 'toString' },
        { name: 'c', __t: 'hasOwnProperty' }
      ]);

      const docs = await Test.find().sort({ name: 1 });

      assert.deepStrictEqual(docs.map(doc => doc.constructor), [Test, Test, Test]);
      assert.deepStrictEqual(docs.map(doc => doc.name), ['a', 'b', 'c']);
    });

    it('embedded discriminators use the base schema', async function() {
      const doc = new Test({
        events: [{ message: 'a', __t: 'constructor' }, { message: 'b', __t: 'toString' }],
        event: { message: 'c', __t: 'hasOwnProperty' }
      });

      doc.events.push({ message: 'd', __t: 'hasOwnProperty' });
      const created = doc.events.create({ message: 'e', __t: 'constructor' });
      await doc.validate();

      assert.deepStrictEqual(doc.events.map(ev => ev.message), ['a', 'b', 'd']);
      assert.strictEqual(doc.event.message, 'c');
      assert.strictEqual(created.message, 'e');
    });

    it('casts embedded discriminator keys in filters and updates', async function() {
      const docs = await Test.find({ 'events.__t': 'constructor', 'events.message': 'a' });
      const res = await Test.updateOne({ __t: 'toString' }, { name: 'updated' });

      assert.deepStrictEqual(docs, []);
      assert.strictEqual(res.matchedCount, 0);
    });
  });

  /**
   * `JSON.parse()` creates own `__proto__` keys. Copying them with assignment, like
   * `ret[key] = obj[key]` or `Object.assign()`, replaces the copy's prototype, so
   * Mongoose must skip them or treat them as plain data.
   */
  describe('own `__proto__` keys', function() {
    const ownProtoDoc = '{"__proto__":{"name":"evil"},"nested":{"__proto__":{"name":"evil"}},' +
      '"sub":{"__proto__":{"name":"evil"}},"events":[{"__proto__":{"message":"evil"}}]}';

    it('are ignored by new Model()', function() {
      const doc = new Test(JSON.parse(ownProtoDoc));

      const obj = doc.toObject();

      assert.strictEqual(doc.name, undefined);
      assert.strictEqual(doc.nested.name, undefined);
      assert.strictEqual(doc.sub.name, undefined);
      assert.strictEqual(doc.events[0].message, undefined);
      assert.strictEqual(Object.getPrototypeOf(obj), Object.prototype);
      assert.strictEqual(Object.getPrototypeOf(obj.sub), Object.prototype);
      assert.strictEqual(Object.getPrototypeOf(obj.events[0]), Object.prototype);
    });

    it('are ignored by hydrate()', function() {
      const doc = Test.hydrate(JSON.parse(ownProtoDoc));

      assert.strictEqual(doc.name, undefined);
      assert.strictEqual(doc.nested.name, undefined);
      assert.strictEqual(doc.sub.name, undefined);
      assert.strictEqual(doc.events[0].message, undefined);
    });

    it('are ignored by castObject()', function() {
      const obj = Test.castObject(JSON.parse(ownProtoDoc));

      assert.strictEqual(Object.getPrototypeOf(obj), Object.prototype);
      assert.strictEqual(obj.name, undefined);
      assert.strictEqual(obj.nested, undefined);
      assert.deepStrictEqual(obj.sub, {});
      assert.deepStrictEqual(obj.events, [{}]);
    });

    it('are not stored by create()', async function() {
      await Test.create([JSON.parse(ownProtoDoc)], { validateBeforeSave: false });

      const raw = await Test.collection.findOne();

      assert.strictEqual(raw.name, undefined);
      assert.ok(!JSON.stringify(raw).includes('evil'));
    });

    it('are plain data in Mixed paths', function() {
      const doc = new Test({ mixed: JSON.parse('{"__proto__":{"name":"evil"}}') });

      assert.ok(Object.hasOwn(doc.mixed, '__proto__'));
      assert.strictEqual(Object.getPrototypeOf(doc.mixed), Object.prototype);
      assert.strictEqual(doc.mixed.name, undefined);
    });

    it('are not allowed as Map keys', async function() {
      const doc = new Test({ map: JSON.parse('{"__proto__":{"name":"evil"}}') });
      const other = new Test({ map: {} });

      await assert.rejects(doc.validate(), /Cast to Map failed/);
      assert.throws(() => other.map.set('__proto__', { name: 'evil' }), /reserved key name "__proto__"/);
      assert.throws(() => other.map.set('constructor', { name: 'evil' }), /reserved key name "constructor"/);
      assert.throws(() => other.map.set('prototype', { name: 'evil' }), /reserved key name "prototype"/);
    });

    it('are ignored in filters', async function() {
      await Test.create([{ name: 'a' }, { name: 'b' }]);
      const filter = JSON.parse('{"__proto__":{"name":"nomatch"},"$or":[{"__proto__":{"name":"nomatch"}}]}');

      const count = await Test.countDocuments(filter);

      assert.strictEqual(count, 2);
    });

    it('are ignored in updates', async function() {
      const { _id } = await Test.create({ name: 'test', nested: { name: 'test' } });
      const update = JSON.parse('{"__proto__":{"$set":{"name":"evil"}},"$set":{"__proto__":{"name":"evil"},"nested":{"__proto__":{"name":"evil"}}}}');

      await Test.updateOne({ _id }, update);

      const raw = await Test.collection.findOne({ _id });
      assert.strictEqual(raw.name, 'test');
      assert.ok(!JSON.stringify(raw).includes('evil'));
    });

    it('are ignored in query options, sort(), and merge()', async function() {
      await Test.create([{ name: 'a' }, { name: 'b' }]);
      const query = Test.find({}, null, JSON.parse('{"__proto__":{"lean":true,"limit":1}}')).
        sort(JSON.parse('{"__proto__":{"name":1}}')).
        merge(JSON.parse('{"__proto__":{"name":"nomatch"}}'));

      const docs = await query;

      assert.strictEqual(docs.length, 2);
      assert.ok(docs[0] instanceof mongoose.Document);
      assert.strictEqual(Object.getPrototypeOf(query.getFilter()), Object.prototype);
      assert.strictEqual(Object.getPrototypeOf(query.getOptions().sort), Object.prototype);
    });

    it('are ignored in populate() options, match, and select', async function() {
      const target = await Test.create({ name: 'target' });
      await Test.create({ name: 'test', ref: target._id });

      const doc1 = await Test.findOne({ name: 'test' }).populate(JSON.parse('{"path":"ref","__proto__":{"match":{"name":"nomatch"}}}'));
      const doc2 = await Test.findOne({ name: 'test' }).populate({ path: 'ref', match: JSON.parse('{"__proto__":{"name":"nomatch"}}') });
      const doc3 = await Test.findOne({ name: 'test' }).populate({ path: 'ref', select: JSON.parse('{"__proto__":{"name":0}}') });

      assert.strictEqual(doc1.ref.name, 'target');
      assert.strictEqual(doc2.ref.name, 'target');
      assert.strictEqual(doc3.ref.name, 'target');
    });
  });

  describe('helpers', function() {
    it('setDottedPath() does not set values underneath inherited properties like toString', function() {
      const obj = { nested: {} };

      setDottedPath(obj, 'toString.call', 1);
      setDottedPath(obj, 'nested.valueOf.polluted', 'yes');

      assert.strictEqual(typeof Object.prototype.toString.call, 'function');
      assert.strictEqual(Object.prototype.valueOf.polluted, undefined);
      assert.deepStrictEqual(obj, { nested: {} });
    });

    it('mergeClone() does not merge into inherited properties like toString', function() {
      const to = {};
      const from = JSON.parse('{"toString":{"call":1,"polluted":"yes"},"valueOf":{"call":{"polluted":"yes"}}}');

      utils.mergeClone(to, from);

      assert.strictEqual(typeof Object.prototype.toString.call, 'function');
      assert.strictEqual(Object.prototype.toString.polluted, undefined);
      assert.strictEqual(Function.prototype.call.polluted, undefined);
      assert.ok(!Object.hasOwn(to, 'toString'));
      assert.ok(!Object.hasOwn(to, 'valueOf'));
    });
  });

  /**
   * Appendix: MongoDB premises. Mongoose's protections assume that:
   *
   * 1. The MongoDB Node driver only reads own, non-function properties of
   *    inserted documents, updates, replacements, and filters. Options are
   *    different: the driver may read inherited options, like `writeConcern`.
   * 2. MongoDB treats top-level `$` keys in filters and updates as operators,
   *    but stores them as fields in inserts. Replacements never treat top-level
   *    `$` keys as operators: MongoDB throws an error instead.
   *
   * These tests use the driver directly. If they fail, revisit Mongoose's
   * protections.
   */
  describe('appendix: MongoDB premises', function() {
    let collection;

    beforeEach(function() {
      collection = db.db.collection('premises');
    });

    it('inserts only own, non-function properties', async function() {
      const doc = Object.assign(Object.create({ inherited: 1 }), { _id: 1, own: 1, fn() {} });

      await collection.insertOne(doc);

      assert.deepStrictEqual(await collection.findOne({ _id: 1 }), { _id: 1, own: 1 });
    });

    it('updates using only own, non-function properties', async function() {
      await collection.insertOne({ _id: 1, own: 0 });
      const update = Object.assign(Object.create({ $unset: { own: 1 } }), {
        $set: Object.assign(Object.create({ inherited: 1 }), { own: 1, fn() {} })
      });

      await collection.updateOne({ _id: 1 }, update);

      assert.deepStrictEqual(await collection.findOne({ _id: 1 }), { _id: 1, own: 1 });
    });

    it('replaces using only own, non-function properties', async function() {
      await collection.insertOne({ _id: 1, own: 0 });
      const replacement = Object.assign(Object.create({ inherited: 1 }), { own: 1, fn() {} });

      await collection.replaceOne({ _id: 1 }, replacement);

      assert.deepStrictEqual(await collection.findOne({ _id: 1 }), { _id: 1, own: 1 });
    });

    it('filters using only own, non-function properties', async function() {
      await collection.insertMany([{ _id: 1, own: 1 }, { _id: 2, own: 2 }]);
      const filter = Object.assign(Object.create({ _id: 1 }), {
        own: Object.assign(Object.create({ $lt: 2 }), { $gt: 0 }),
        fn() {}
      });

      const docs = await collection.find(filter).sort({ _id: 1 }).toArray();

      assert.deepStrictEqual(docs.map(doc => doc._id), [1, 2]);
    });

    it('may use inherited properties as options', async function() {
      const options = Object.create({ writeConcern: { w: 'bogus' } });

      await assert.rejects(collection.insertOne({ _id: 1 }, options), /bogus/);
    });

    it('treats top-level `$` keys in filters as operators', async function() {
      await collection.insertOne({ _id: 1, $name: 'test' });

      await assert.rejects(collection.find({ $name: 'test' }).toArray(), /unknown top level operator: \$name/);
    });

    it('treats top-level `$` keys in updates as operators', async function() {
      await collection.insertOne({ _id: 1 });

      await assert.rejects(collection.updateOne({ _id: 1 }, { $name: 'test' }), /Unknown modifier: \$name/);
    });

    it('stores top-level `$` keys in inserts as fields', async function() {
      await collection.insertOne({ _id: 1, $set: { name: 'test' } });

      assert.deepStrictEqual(await collection.findOne({ _id: 1 }), { _id: 1, $set: { name: 'test' } });
    });

    it('does not treat top-level `$` keys in replacements as operators', async function() {
      await collection.insertOne({ _id: 1, name: 'test' });

      await assert.rejects(collection.replaceOne({ _id: 1 }, { $set: { name: 'replaced' } }), /must not contain atomic operators/);
      await assert.rejects(collection.replaceOne({ _id: 1 }, { name: 'replaced', $set: { name: 'replaced' } }), /\$set/);
      assert.deepStrictEqual(await collection.findOne({ _id: 1 }), { _id: 1, name: 'test' });
    });

    it('stores nested `$` keys in replacements as fields', async function() {
      await collection.insertOne({ _id: 1 });

      await collection.replaceOne({ _id: 1 }, { nested: { $set: { name: 'test' } } });

      assert.deepStrictEqual(await collection.findOne({ _id: 1 }), { _id: 1, nested: { $set: { name: 'test' } } });
    });
  });
});
