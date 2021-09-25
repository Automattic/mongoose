'use strict';

const start = require('./common');

const Query = require('../lib/query');
const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('Query:', function() {
  let Comment;
  let Product;

  describe('toConstructor', function() {
    let db;

    before(function() {
      db = start();
    });

    after(async function() {
      await db.close();
    });

    before(function() {
      Comment = new Schema({
        text: String
      });

      Product = new Schema({
        tags: {}, // mixed
        array: Array,
        ids: [Schema.ObjectId],
        strings: [String],
        numbers: [Number],
        comments: [Comment],
        title: String
      });
      Product = db.model('Product', Product);
    });

    it('creates a query', function(done) {
      const prodQ = Product.find({ title: /test/ }).toConstructor();

      assert.ok(prodQ() instanceof Query);
      done();
    });

    it('copies all the right values', function(done) {
      const prodQ = Product.update({ title: /test/ }, { title: 'blah' });

      const prodC = prodQ.toConstructor();

      assert.deepEqual(prodQ._conditions, prodC()._conditions);
      assert.deepEqual(prodQ._fields, prodC()._fields);
      assert.deepEqual(prodQ._update, prodC()._update);
      assert.equal(prodQ._path, prodC()._path);
      assert.equal(prodQ._distinct, prodC()._distinct);
      assert.deepEqual(prodQ._collection, prodC()._collection);
      assert.deepEqual(prodQ.model, prodC().model);
      assert.deepEqual(prodQ.mongooseCollection, prodC().mongooseCollection);
      assert.deepEqual(prodQ._mongooseOptions, prodC()._mongooseOptions);
      done();
    });

    it('gets expected results', function(done) {
      Product.create({ title: 'this is a test' }, function(err, p) {
        assert.ifError(err);
        const prodC = Product.find({ title: /test/ }).toConstructor();

        prodC().exec(function(err, results) {
          assert.ifError(err);
          assert.equal(results.length, 1);
          assert.equal(p.title, results[0].title);
          done();
        });
      });
    });

    it('can be re-used multiple times', function(done) {
      Product.create([{ title: 'moar thing' }, { title: 'second thing' }], function(err, prods) {
        assert.ifError(err);
        assert.equal(prods.length, 2);
        const prod = prods[0];
        const prodC = Product.find({ title: /thing/ }).toConstructor();

        prodC().exec(function(err, results) {
          assert.ifError(err);

          assert.equal(results.length, 2);
          prodC().find({ _id: prod.id }).exec(function(err, res) {
            assert.ifError(err);
            assert.equal(res.length, 1);

            prodC().exec(function(err, res) {
              assert.ifError(err);
              assert.equal(res.length, 2);
              done();
            });
          });
        });
      });
    });

    it('options get merged properly', function(done) {
      let prodC = Product.find({ title: /blah/ }).setOptions({ sort: 'title', lean: true });
      prodC = prodC.toConstructor();

      const nq = prodC(null, { limit: 3 });
      assert.deepEqual(nq._mongooseOptions, { lean: true, limit: 3 });
      assert.deepEqual(nq.options, {
        sort: { title: 1 },
        limit: 3
      });
      done();
    });

    it('options get cloned (gh-3176)', function(done) {
      let prodC = Product.find({ title: /blah/ }).setOptions({ sort: 'title', lean: true });
      prodC = prodC.toConstructor();

      const nq = prodC(null, { limit: 3 });
      assert.deepEqual(nq._mongooseOptions, { lean: true, limit: 3 });
      assert.deepEqual(nq.options, {
        sort: { title: 1 },
        limit: 3
      });
      const nq2 = prodC(null, { limit: 5 });
      assert.deepEqual(nq._mongooseOptions, { lean: true, limit: 3 });
      assert.deepEqual(nq2._mongooseOptions, { lean: true, limit: 5 });

      done();
    });

    it('creates subclasses of mquery', function(done) {
      const opts = { w: 'majority', readPreference: 'p' };
      const match = { title: 'test', count: { $gt: 101 } };
      const select = { name: 1, count: 0 };
      const update = { $set: { title: 'thing' } };
      const path = 'title';

      const q = Product.update(match, update);
      q.select(select);
      q.where(path);
      q.setOptions(opts);
      q.find();

      const M = q.toConstructor();
      const m = M();

      assert.ok(m instanceof Query);
      assert.deepEqual(opts, m.options);
      assert.deepEqual(match, m._conditions);
      assert.deepEqual(select, m._fields);
      assert.deepEqual(update, m._update);
      assert.equal(path, m._path);
      assert.equal('find', m.op);
      done();
    });

    it('with findOneAndUpdate (gh-4318)', function(done) {
      const Q = Product.where({ title: 'test' }).toConstructor();

      const query = { 'tags.test': 1 };
      const update = {
        strings: ['123'],
        numbers: [1, 2, 3]
      };
      Q().findOneAndUpdate(query, update, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('gets middleware from model (gh-6455)', async function() {
      let called = 0;
      const schema = new Schema({
        name: String
      });

      schema.pre('findOne', function logHook() {
        called++;
      });

      const Test = db.model('Test', schema);
      const test = new Test({ name: 'Romero' });
      const Q = Test.findOne({}).toConstructor();


      await test.save();
      const doc = await Q();
      assert.strictEqual(doc.name, 'Romero');
      assert.strictEqual(called, 1);
    });

    it('works with entries-style sort() syntax (gh-8159)', function() {
      mongoose.deleteModel(/Test/);
      const Model = mongoose.model('Test', Schema({ name: String }));

      const query = Model.find().sort([['name', 1]]);
      const Query = query.toConstructor();
      const q = new Query();
      assert.deepEqual(q.options.sort, [['name', 1]]);
    });
  });
});
