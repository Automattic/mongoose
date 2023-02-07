'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('query middleware', function() {
  let db;
  let schema;
  let publisherSchema;
  let Author;
  let Publisher;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  const initializeData = function(done) {
    Author = db.model('Person', schema);
    Publisher = db.model('Publisher', publisherSchema, 'Publisher');

    Author.deleteMany({}, function(error) {
      if (error) {
        return done(error);
      }

      Publisher.deleteMany({}, function(error) {
        if (error) {
          return done(error);
        }
        Publisher.create({ name: 'Wiley' }, function(error, publisher) {
          if (error) {
            return done(error);
          }

          const doc = {
            title: 'Professional AngularJS',
            author: 'Val',
            publisher: publisher._id,
            options: 'bacon'
          };

          Author.create(doc, function(error) {
            done(error);
          });
        });
      });
    });
  };

  beforeEach(function(done) {
    schema = new Schema({
      title: String,
      author: String,
      publisher: { type: Schema.ObjectId, ref: 'Publisher' },
      options: String
    });

    publisherSchema = new Schema({
      name: String
    });

    done();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('has a pre find hook', function(done) {
    let count = 0;
    schema.pre('find', function(next) {
      ++count;
      next();
    });

    initializeData(function(error) {
      assert.ifError(error);
      Author.find({ x: 1 }, function(error) {
        assert.ifError(error);
        assert.equal(count, 1);
        done();
      });
    });
  });

  it('has post find hooks', function(done) {
    let postCount = 0;
    schema.post('find', function(results, next) {
      assert.equal(results.length, 1);
      assert.equal(results[0].author, 'Val');
      assert.equal(results[0].options, 'bacon');
      ++postCount;
      next();
    });

    initializeData(function(error) {
      assert.ifError(error);
      Author.find({ title: 'Professional AngularJS' }, function(error, docs) {
        assert.ifError(error);
        assert.equal(postCount, 1);
        assert.equal(docs.length, 1);
        done();
      });
    });
  });

  it('works when using a chained query builder', function(done) {
    let count = 0;
    schema.pre('find', function(next) {
      ++count;
      next();
    });

    let postCount = 0;
    schema.post('find', function(results, next) {
      assert.equal(results.length, 1);
      assert.equal(results[0].author, 'Val');
      ++postCount;
      next();
    });

    initializeData(function() {
      Author.find({ title: 'Professional AngularJS' }).exec(function(error, docs) {
        assert.ifError(error);
        assert.equal(count, 1);
        assert.equal(postCount, 1);
        assert.equal(docs.length, 1);
        done();
      });
    });
  });

  it('has separate pre-findOne() and post-findOne() hooks', function(done) {
    let count = 0;
    schema.pre('findOne', function(next) {
      ++count;
      next();
    });

    let postCount = 0;
    schema.post('findOne', function(result, next) {
      assert.equal(result.author, 'Val');
      ++postCount;
      next();
    });

    initializeData(function() {
      Author.findOne({ title: 'Professional AngularJS' }).exec(function(error, doc) {
        assert.ifError(error);
        assert.equal(count, 1);
        assert.equal(postCount, 1);
        assert.equal(doc.author, 'Val');
        done();
      });
    });
  });

  it('with regular expression (gh-6680)', function(done) {
    let count = 0;
    let postCount = 0;
    schema.pre(/find/, function(next) {
      ++count;
      next();
    });

    schema.post(/find/, function(result, next) {
      ++postCount;
      next();
    });

    initializeData(function() {
      Author.findOne({ title: 'Professional AngularJS' }).exec(function(error, doc) {
        assert.ifError(error);
        assert.equal(count, 1);
        assert.equal(postCount, 1);
        assert.equal(doc.author, 'Val');

        count = 0;
        postCount = 0;
        Author.find({ title: 'Professional AngularJS' }, function(error, docs) {
          assert.ifError(error);
          assert.equal(count, 1);
          assert.equal(postCount, 1);
          assert.equal(docs[0].author, 'Val');

          Author.updateOne({}, { title: 'Foo' }, function(error) {
            assert.ifError(error);
            assert.equal(count, 1);
            assert.equal(postCount, 1);
            done();
          });
        });
      });
    });
  });

  it('can populate in pre hook', function(done) {
    schema.pre('findOne', function(next) {
      this.populate('publisher');
      next();
    });

    initializeData(function() {
      Author.findOne({ title: 'Professional AngularJS' }).exec(function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.author, 'Val');
        assert.equal(doc.publisher.name, 'Wiley');
        done();
      });
    });
  });

  it('can populate in post hook', function(done) {
    schema.post('findOne', function(doc, next) {
      doc.populate('publisher', function(error) {
        next(error);
      });
    });

    initializeData(function() {
      Author.findOne({ title: 'Professional AngularJS' }).exec(function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.author, 'Val');
        assert.equal(doc.publisher.name, 'Wiley');
        done();
      });
    });
  });

  it.skip('has hooks for count()', function(done) {
    let preCount = 0;
    let postCount = 0;

    schema.pre('count', function() {
      ++preCount;
    });

    schema.post('count', function() {
      ++postCount;
    });

    initializeData(function(error) {
      assert.ifError(error);
      Author.
        find({ title: 'Professional AngularJS' }).
        count(function(error, count) {
          assert.ifError(error);
          assert.equal(1, count);
          assert.equal(1, preCount);
          assert.equal(1, postCount);
          done();
        });
    });
  });

  it('has hooks for countDocuments()', function(done) {
    let preCount = 0;
    let postCount = 0;

    schema.pre('countDocuments', function() {
      ++preCount;
    });

    schema.post('countDocuments', function() {
      ++postCount;
    });

    initializeData(function(error) {
      assert.ifError(error);
      Author.
        find({ title: 'Professional AngularJS' }).
        countDocuments(function(error, count) {
          assert.ifError(error);
          assert.equal(1, count);
          assert.equal(1, preCount);
          assert.equal(1, postCount);
          done();
        });
    });
  });

  it('has hooks for estimatedDocumentCount()', function(done) {
    let preCount = 0;
    let postCount = 0;

    schema.pre('estimatedDocumentCount', function() {
      ++preCount;
    });

    schema.post('estimatedDocumentCount', function() {
      ++postCount;
    });

    initializeData(function(error) {
      assert.ifError(error);
      Author.
        find({ title: 'Professional AngularJS' }).
        estimatedDocumentCount(function(error, count) {
          assert.ifError(error);
          assert.equal(1, count);
          assert.equal(1, preCount);
          assert.equal(1, postCount);
          done();
        });
    });
  });

  it('updateOne() (gh-3997)', function(done) {
    let preCount = 0;
    let postCount = 0;

    schema.pre('updateOne', function() {
      ++preCount;
    });

    schema.post('updateOne', function() {
      ++postCount;
    });

    initializeData(function(error) {
      assert.ifError(error);
      Author.
        updateOne({}, { author: 'updatedOne' }).
        exec(function(error) {
          assert.ifError(error);
          assert.equal(preCount, 1);
          assert.equal(postCount, 1);
          Author.find({ author: 'updatedOne' }, function(error, res) {
            assert.ifError(error);
            assert.equal(res.length, 1);
            done();
          });
        });
    });
  });

  it('updateMany() (gh-3997)', function(done) {
    let preCount = 0;
    let postCount = 0;

    schema.pre('updateMany', function() {
      ++preCount;
    });

    schema.post('updateMany', function() {
      ++postCount;
    });

    initializeData(function(error) {
      assert.ifError(error);

      Author.create({ author: 'test' }, function(error) {
        assert.ifError(error);
        Author.
          updateMany({}, { author: 'updatedMany' }).
          exec(function(error) {
            assert.ifError(error);
            assert.equal(preCount, 1);
            assert.equal(postCount, 1);
            Author.find({}, function(error, res) {
              assert.ifError(error);
              assert.ok(res.length > 1);
              res.forEach(function(doc) {
                assert.equal(doc.author, 'updatedMany');
              });
              done();
            });
          });
      });
    });
  });

  it('deleteOne() (gh-7195)', async function() {
    let preCount = 0;
    let postCount = 0;

    schema.pre('deleteOne', function() {
      ++preCount;
    });

    schema.post('deleteOne', function() {
      ++postCount;
    });


    const Model = db.model('Test', schema);
    await Model.create([{ title: 'foo' }, { title: 'bar' }]);

    const res = await Model.deleteOne();
    assert.equal(res.deletedCount, 1);

    assert.equal(preCount, 1);
    assert.equal(postCount, 1);

    const count = await Model.countDocuments();
    assert.equal(count, 1);
  });

  it('deleteMany() (gh-7195)', async function() {
    let preCount = 0;
    let postCount = 0;

    schema.pre('deleteMany', function() {
      ++preCount;
    });

    schema.post('deleteMany', function() {
      ++postCount;
    });


    const Model = db.model('Test', schema);
    await Model.create([{ title: 'foo' }, { title: 'bar' }]);

    await Model.deleteMany();

    assert.equal(preCount, 1);
    assert.equal(postCount, 1);

    const count = await Model.countDocuments();
    assert.equal(count, 0);
  });

  it('distinct (gh-5938)', async function() {
    let preCount = 0;
    let postCount = 0;

    schema.pre('distinct', function() {
      ++preCount;
    });

    schema.post('distinct', function(res) {
      assert.deepEqual(res.sort(), ['bar', 'foo']);
      ++postCount;
    });


    const Model = db.model('Test', schema);
    await Model.create([{ title: 'foo' }, { title: 'bar' }, { title: 'bar' }]);

    const res = await Model.distinct('title');
    assert.deepEqual(res.sort(), ['bar', 'foo']);

    assert.equal(preCount, 1);
    assert.equal(postCount, 1);
  });

  it('error handlers (gh-2284)', async function() {
    const testSchema = new Schema({ title: { type: String, unique: true } });

    testSchema.post('updateOne', function(error, res, next) {
      assert.ok(error);
      assert.ok(!res);
      next(new Error('woops'));
    });

    const Book = db.model('Test', testSchema);
    await Book.init();

    const books = await Book.create([
      { title: 'Professional AngularJS' },
      { title: 'The 80/20 Guide to ES2015 Generators' }
    ]);

    const query = { _id: books[1]._id };
    const update = { title: 'Professional AngularJS' };
    const err = await Book.updateOne(query, update).then(() => null, err => err);
    assert.equal(err.message, 'woops');
  });

  it('error handlers for validate (gh-4885)', function(done) {
    const testSchema = new Schema({ title: { type: String, required: true } });

    let called = 0;
    testSchema.post('validate', function(error, doc, next) {
      ++called;
      next(error);
    });

    const Test = db.model('Test', testSchema);

    Test.create({}, function(error) {
      assert.ok(error);
      assert.equal(called, 1);
      done();
    });
  });

  it('error handlers with findOneAndUpdate and passRawResult (gh-4836)', function(done) {
    const schema = new Schema({ name: { type: String } });

    let called = false;
    const errorHandler = function(err, res, next) {
      called = true;
      next();
    };

    schema.post('findOneAndUpdate', errorHandler);

    const Person = db.model('Person', schema);

    Person.
      findOneAndUpdate({ name: 'name' }, {}, { upsert: true, passRawResult: true }).
      exec(function(error) {
        assert.ifError(error);
        assert.ok(!called);
        done();
      });
  });

  it('error handlers with findOneAndUpdate error and passRawResult (gh-4836)', function(done) {
    const schema = new Schema({ name: { type: String } });

    let called = false;
    const errorHandler = function(err, res, next) {
      called = true;
      next();
    };

    schema.post('findOneAndUpdate', errorHandler);

    const Person = db.model('Person', schema);

    Person.
      findOneAndUpdate({}, { _id: 'test' }, { upsert: true, passRawResult: true }).
      exec(function(error) {
        assert.ok(error);
        assert.ok(called);
        done();
      });
  });

  it('error handlers with error from pre hook (gh-4927)', function(done) {
    const schema = new Schema({});
    let called = false;

    schema.pre('find', function(next) {
      next(new Error('test'));
    });

    schema.post('find', function(res, next) {
      called = true;
      next();
    });

    schema.post('find', function(error, res, next) {
      assert.equal(error.message, 'test');
      next(new Error('test2'));
    });

    const Test = db.model('Test', schema);

    Test.find().exec(function(error) {
      assert.equal(error.message, 'test2');
      assert.ok(!called);
      done();
    });
  });

  it('with clone() (gh-5153)', function(done) {
    const schema = new Schema({});
    let calledPre = 0;
    let calledPost = 0;

    schema.pre('find', function(next) {
      ++calledPre;
      next();
    });

    schema.post('find', function(res, next) {
      ++calledPost;
      next();
    });

    const Test = db.model('Test', schema.clone());

    Test.find().exec(function(error) {
      assert.ifError(error);
      assert.equal(calledPre, 1);
      assert.equal(calledPost, 1);
      done();
    });
  });

  it('doesnt double call post(regexp) with updateOne (gh-7418)', function() {
    const schema = new Schema({ name: String });
    let calledPost = 0;

    schema.post(/.*/, function(res, next) {
      ++calledPost;
      next();
    });

    const Test = db.model('Test', schema);

    return Test.updateOne({}, { name: 'bar' }).
      then(() => assert.equal(calledPost, 1));
  });

  it('deleteOne with `document: true` but no `query` (gh-8555)', async function() {
    const mySchema = Schema({ name: String });

    const docs = [];
    mySchema.pre('deleteOne', { document: true }, function() {
      docs.push(this);
    });

    const Model = db.model('Test', mySchema);


    const doc = await Model.create({ name: 'test' });
    await doc.deleteOne();
    assert.equal(docs.length, 1);
    assert.strictEqual(docs[0], doc);

    await Model.deleteOne();
    assert.equal(docs.length, 1);
  });

  it('allows registering middleware for all queries with regexp (gh-9190)', async function() {
    const schema = Schema({ name: String });

    let called = 0;
    schema.pre(/.*/, { query: true, document: false }, function() {
      ++called;
    });
    const Model = db.model('Test', schema);

    await Model.find();
    assert.equal(called, 1);

    await Model.findOne();
    assert.equal(called, 2);

    await Model.countDocuments();
    assert.equal(called, 3);

    await Model.create({ name: 'test' });
    assert.equal(called, 3);

    await Model.insertMany([{ name: 'test' }]);
    assert.equal(called, 3);

    await Model.aggregate([{ $match: { name: 'test' } }]);
    assert.equal(called, 3);
  });

  it('allows skipping the wrapped function with `skipMiddlewareFunction()` (gh-11426)', async function() {
    const schema = Schema({ name: String });
    const now = Date.now();

    schema.pre('find', function(next) {
      next(mongoose.skipMiddlewareFunction([{ name: 'from cache' }]));
    });
    schema.post('find', function(res) {
      res.forEach(doc => {
        doc.loadedAt = now;
      });
    });
    const Test = db.model('Test', schema);

    const res = await Test.find();
    assert.equal(res.length, 1);
    assert.strictEqual(res[0].name, 'from cache');
    assert.strictEqual(res[0].loadedAt, now);
  });

  it('allows overwriting result with `overwriteMiddlewareResult()` (gh-11426)', async function() {
    const schema = Schema({ name: String });

    schema.post('updateOne', function() {
      return mongoose.overwriteMiddlewareResult({ answer: 42 });
    });
    schema.post('updateOne', function(res) {
      assert.strictEqual(res.answer, 42);
      res.secondMiddlewareRan = true;
    });
    const Test = db.model('Test', schema);

    const { _id } = await Test.create({ name: 'test' });
    const res = await Test.updateOne({ _id }, { name: 'changed' });
    assert.equal(res.answer, 42);
    assert.strictEqual(res.modifiedCount, undefined);
    assert.strictEqual(res.secondMiddlewareRan, true);

    const doc = await Test.findById(_id);
    assert.equal(doc.name, 'changed');
  });
});
