'use strict';

const start = require('./common');
const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('population middleware selection', function() {
  let db;

  before(function() { db = start(); });
  after(async function() { await db.close(); });
  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  describe('temporary hydration for getters', function() {
    for (const [name, middleware, expected] of [
      ['ordinary', undefined, ['pre', 'post']],
      ['disabled', false, []],
      ['pre disabled', { pre: false }, ['post']],
      ['post disabled', { post: false }, ['pre']]
    ]) {
      it(`preserves getter population with ${name} hooks`, async function() {
        const { Person, calls } = await createTestContext();

        const [person] = await Person.find().lean().populate({
          path: 'city', options: { getters: true, middleware }
        });

        assert.strictEqual(person.city.name, 'Amsterdam');
        assert.strictEqual(Object.getPrototypeOf(person), Object.prototype);
        assert.deepStrictEqual(calls, expected);

        calls.length = 0;
        const ordinary = await Person.populate({ city: 'ref:amsterdam' }, {
          path: 'city', options: { getters: true }
        });
        assert.strictEqual(ordinary.city.name, 'Amsterdam');
        assert.deepStrictEqual(calls, ['pre', 'post']);
      });
    }

    it('inherits selection during getter hydration', async function() {
      const { Person, calls } = await createTestContext();

      const [person] = await Person.find().setOptions({ middleware: false }).lean().populate({
        path: 'city', options: { getters: true }
      });

      assert.strictEqual(person.city.name, 'Amsterdam');
      assert.deepStrictEqual(calls, []);
    });

    it('preserves schema-path middleware defaults after an explicit override', async function() {
      const { Person, calls } = await createTestContext({ schemaMiddleware: { post: false } });

      const [person] = await Person.find().lean().populate({
        path: 'city', options: { getters: true, middleware: { pre: false } }
      });

      assert.strictEqual(person.city.name, 'Amsterdam');
      assert.deepStrictEqual(calls, ['post']);

      calls.length = 0;
      const later = await Person.populate({ city: 'ref:amsterdam' }, {
        path: 'city', options: { getters: true }
      });
      assert.strictEqual(later.city.name, 'Amsterdam');
      assert.deepStrictEqual(calls, ['pre']);
    });

    async function createTestContext({ schemaMiddleware } = {}) {
      const calls = [];
      const City = db.model('City', new Schema({ _id: String, name: String }));
      const schema = new Schema({
        city: {
          type: String, ref: 'City', get: value => value.replace(/^ref:/, ''),
          populate: { middleware: schemaMiddleware }
        }
      });
      schema.pre('init', function() { calls.push('pre'); });
      schema.post('init', function() { calls.push('post'); });
      const Person = db.model('Person', schema);
      await City.collection.insertOne({ _id: 'amsterdam', name: 'Amsterdam' });
      await Person.collection.insertOne({ city: 'ref:amsterdam' });
      return { Person, calls };
    }
  });

  describe('virtual middleware defaults', function() {
    for (const [name, virtualMiddleware, middleware, explicit, expected] of [
      ['boolean default', false, { pre: false }, undefined, []],
      ['phase default', { post: false }, { pre: false }, undefined, ['pre']],
      ['explicit phase override', { post: false }, false, { pre: false }, ['post']],
      ['standalone default', false, undefined, undefined, []]
    ]) {
      it(`uses ${name} for getter hydration and the populated query`, async function() {
        const { Person, City, calls } = await createTestContext({ virtualMiddleware });

        const [person] = await Person.find().setOptions({ middleware }).lean().populate({
          path: 'city', options: explicit === undefined ? {} : { middleware: explicit }
        });

        assert.strictEqual(person.cityId, 'ref:amsterdam');
        assert.ok(person.city instanceof City);
        assert.strictEqual(person.city.name, 'Amsterdam');
        for (const observed of Object.values(calls)) assert.deepStrictEqual(observed, expected);
      });
    }

    async function createTestContext({ virtualMiddleware }) {
      const calls = { parentInit: [], cityQuery: [], cityInit: [] };
      const citySchema = new Schema({ _id: String, name: String });
      const schema = new Schema({ cityId: { type: String, get: value => value.replace(/^ref:/, '') } });
      schema.virtual('city', {
        ref: 'City', localField: 'cityId', foreignField: '_id', justOne: true,
        getters: true, options: { middleware: virtualMiddleware, lean: false }
      });
      for (const [target, hook, key] of [[schema, 'init', 'parentInit'], [citySchema, 'find', 'cityQuery'], [citySchema, 'init', 'cityInit']]) {
        target.pre(hook, function() { calls[key].push('pre'); });
        target.post(hook, function() { calls[key].push('post'); });
      }
      const City = db.model('City', citySchema);
      const Person = db.model('Person', schema);
      await City.collection.insertOne({ _id: 'amsterdam', name: 'Amsterdam' });
      await Person.collection.insertOne({ cityId: 'ref:amsterdam' });
      return { Person, City, calls };
    }
  });

  describe('query inheritance', function() {
    const cases = [
      { name: 'ordinary', expected: ['pre', 'post'] },
      { name: 'disabled', middleware: false, expected: [] },
      { name: 'pre disabled', middleware: { pre: false }, expected: ['post'] },
      { name: 'post disabled', middleware: { post: false }, expected: ['pre'] },
      { name: 'explicit enable', middleware: false, child: true, expected: ['pre', 'post'] },
      { name: 'explicit disable', middleware: true, child: false, expected: [] },
      {
        name: 'phase overrides', middleware: { pre: false }, child: { post: false },
        nested: { pre: false }, expected: ['pre'], nestedExpected: ['post']
      }
    ];
    for (const deferred of [false, true]) {
      for (const selection of cases) {
        it(`${selection.name} with ${deferred ? 'function' : 'object'} match`, async function() {
          const { Person, City, Country, calls, countryId } = await createTestContext();
          const populate = {
            path: 'cities',
            match: deferred ? () => ({ country: countryId }) : { country: countryId },
            options: selection.child === undefined ? {} : { middleware: selection.child },
            populate: {
              path: 'country',
              options: selection.nested === undefined ? {} : { middleware: selection.nested }
            }
          };

          const [person] = await Person.find().setOptions({ middleware: selection.middleware }).populate(populate);

          assert.ok(person instanceof Person);
          assert.strictEqual(person.cities.length, 1);
          assert.ok(person.cities[0] instanceof City);
          assert.strictEqual(person.cities[0].name, 'Amsterdam');
          assert.ok(person.cities[0].country instanceof Country);
          assert.strictEqual(person.cities[0].country.name, 'Netherlands');
          assert.deepStrictEqual(calls.cityQuery, selection.expected);
          assert.deepStrictEqual(calls.cityInit, selection.expected);
          assert.deepStrictEqual(calls.countryQuery, selection.nestedExpected || selection.expected);
          assert.deepStrictEqual(calls.countryInit, selection.nestedExpected || selection.expected);

          for (const key of Object.keys(calls)) calls[key].length = 0;
          await person.populate({ path: 'cities', match: { country: countryId }, populate: 'country' });
          for (const observed of Object.values(calls)) assert.deepStrictEqual(observed, ['pre', 'post']);
          assert.strictEqual(person.cities[0].country.name, 'Netherlands');
        });
      }
    }

    async function createTestContext() {
      const calls = { cityQuery: [], cityInit: [], countryQuery: [], countryInit: [] };
      const countrySchema = new Schema({ name: String });
      const citySchema = new Schema({ name: String, country: { type: Schema.Types.ObjectId, ref: 'Country' } });
      for (const [name, schema] of [['city', citySchema], ['country', countrySchema]]) {
        schema.pre('find', function() { calls[name + 'Query'].push('pre'); });
        schema.post('find', function() { calls[name + 'Query'].push('post'); });
        schema.pre('init', function() { calls[name + 'Init'].push('pre'); });
        schema.post('init', function() { calls[name + 'Init'].push('post'); });
      }
      const Country = db.model('Country', countrySchema);
      const City = db.model('City', citySchema);
      const Person = db.model('Person', new Schema({ cities: [{ type: Schema.Types.ObjectId, ref: 'City' }] }));
      const { insertedId: countryId } = await Country.collection.insertOne({ name: 'Netherlands' });
      const { insertedIds } = await City.collection.insertMany([
        { name: 'Amsterdam', country: countryId },
        { name: 'Paris', country: new mongoose.Types.ObjectId() }
      ]);
      await Person.collection.insertOne({ cities: Object.values(insertedIds) });
      return { Person, City, Country, calls, countryId };
    }
  });
});
