'use strict';

const assert = require('assert');
const start = require('./common');
const util = require('./util');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('insertMany()', function() {
  let db;

  beforeEach(() => db.deleteModel(/.*/));

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  afterEach(() => util.clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));
  it('with timestamps (gh-723)', function() {
    const schema = new Schema({ name: String }, { timestamps: true });
    const Movie = db.model('Movie', schema);
    const start = Date.now();

    const arr = [{ name: 'Star Wars' }, { name: 'The Empire Strikes Back' }];
    return Movie.insertMany(arr).
      then(docs => {
        assert.equal(docs.length, 2);
        assert.ok(!docs[0].isNew);
        assert.ok(!docs[1].isNew);
        assert.ok(docs[0].createdAt.valueOf() >= start);
        assert.ok(docs[1].createdAt.valueOf() >= start);
      }).
      then(() => Movie.find()).
      then(docs => {
        assert.equal(docs.length, 2);
        assert.ok(docs[0].createdAt.valueOf() >= start);
        assert.ok(docs[1].createdAt.valueOf() >= start);
      });
  });

  it('timestamps respect $timestamps() (gh-12117)', async function() {
    const schema = new Schema({ name: String }, { timestamps: true });
    const Movie = db.model('Movie', schema);
    const start = Date.now();

    const arr = [
      new Movie({ name: 'Star Wars' }),
      new Movie({ name: 'The Empire Strikes Back' })
    ];
    arr[1].$timestamps(false);

    await Movie.insertMany(arr);
    const docs = await Movie.find().sort({ name: 1 });
    assert.ok(docs[0].createdAt.valueOf() >= start);
    assert.ok(!docs[1].createdAt);
  });

  it('insertMany() with nested timestamps (gh-12060)', async function() {
    const childSchema = new Schema({ name: { type: String } }, {
      _id: false,
      timestamps: true
    });

    const parentSchema = new Schema({ child: childSchema }, {
      timestamps: true
    });

    const Test = db.model('Test', parentSchema);

    await Test.insertMany([{ child: { name: 'test' } }]);
    let docs = await Test.find();

    assert.equal(docs.length, 1);
    assert.equal(docs[0].child.name, 'test');
    assert.ok(docs[0].child.createdAt);
    assert.ok(docs[0].child.updatedAt);

    await Test.insertMany([{ child: { name: 'test2' } }], { timestamps: false });
    docs = await Test.find({ 'child.name': 'test2' });
    assert.equal(docs.length, 1);
    assert.equal(docs[0].child.name, 'test2');
    assert.ok(!docs[0].child.createdAt);
    assert.ok(!docs[0].child.updatedAt);
  });
  it('insertMany() (gh-723)', async function() {
    const schema = new Schema({
      name: String
    }, { timestamps: true });
    const Movie = db.model('Movie', schema);

    const arr = [{ name: 'Star Wars' }, { name: 'The Empire Strikes Back' }];
    let docs = await Movie.insertMany(arr);
    assert.equal(docs.length, 2);
    assert.ok(!docs[0].isNew);
    assert.ok(!docs[1].isNew);
    assert.ok(docs[0].createdAt);
    assert.ok(docs[1].createdAt);
    assert.strictEqual(docs[0].__v, 0);
    assert.strictEqual(docs[1].__v, 0);
    docs = await Movie.find({});
    assert.equal(docs.length, 2);
    assert.ok(docs[0].createdAt);
    assert.ok(docs[1].createdAt);
  });

  it('insertMany() ordered option for constraint errors (gh-3893)', async function() {
    const version = await start.mongodVersion();

    const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
    if (!mongo34) {
      return;
    }

    const schema = new Schema({
      name: { type: String, unique: true }
    });
    const Movie = db.model('Movie', schema);

    const arr = [
      { name: 'Star Wars' },
      { name: 'Star Wars' },
      { name: 'The Empire Strikes Back' }
    ];
    await Movie.init();

    const error = await Movie.insertMany(arr, { ordered: false }).then(() => null, err => err);

    assert.equal(error.message.indexOf('E11000'), 0);
    assert.equal(error.results.length, 3);
    assert.equal(error.results[0].name, 'Star Wars');
    assert.ok(error.results[1].err);
    assert.ok(error.results[1].err.errmsg.includes('E11000'));
    assert.equal(error.results[2].name, 'The Empire Strikes Back');
    const docs = await Movie.find({}).sort({ name: 1 }).exec();

    assert.equal(docs.length, 2);
    assert.equal(docs[0].name, 'Star Wars');
    assert.equal(docs[1].name, 'The Empire Strikes Back');
    await Movie.collection.drop();
  });

  describe('insertMany() lean option to bypass validation (gh-8234)', () => {
    const gh8234Schema = new Schema({
      name: String,
      age: { type: Number, required: true }
    });
    const arrGh8234 = [{ name: 'Rigas' }, { name: 'Tonis', age: 9 }];
    let Gh8234;
    before('init model', () => {
      Gh8234 = db.model('Test8234', gh8234Schema);

      return Gh8234.deleteMany({});
    });
    afterEach('delete inserted data', function() {
      return Gh8234.deleteMany({});
    });

    it('insertMany() should bypass validation if lean option set to `true`', async function() {
      let docs = await Gh8234.insertMany(arrGh8234, { lean: true });
      assert.equal(docs.length, 2);
      docs = await Gh8234.find({});
      assert.equal(docs.length, 2);
      assert.equal(arrGh8234[0].age, undefined);
      assert.equal(arrGh8234[1].age, 9);
    });

    it('insertMany() should validate if lean option not set', async function() {
      const error = await Gh8234.insertMany(arrGh8234).then(() => null, err => err);
      assert.ok(error);
      assert.equal(error.name, 'ValidationError');
      assert.equal(error.errors.age.kind, 'required');
    });

    it('insertMany() should validate if lean option set to `false`', async function() {
      const error = await Gh8234.insertMany(arrGh8234, { lean: false }).then(() => null, err => err);
      assert.ok(error);
      assert.equal(error.name, 'ValidationError');
      assert.equal(error.errors.age.kind, 'required');
    });
  });

  it('insertMany() ordered option for validation errors (gh-5068)', async function() {
    const version = await start.mongodVersion();

    const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
    if (!mongo34) {
      return;
    }

    const schema = new Schema({
      name: { type: String, required: true }
    });
    const Movie = db.model('Movie', schema);

    const arr = [
      { name: 'Star Wars' },
      { foo: 'Star Wars' },
      { name: 'The Empire Strikes Back' }
    ];
    await Movie.insertMany(arr, { ordered: false });

    const docs = await Movie.find({}).sort({ name: 1 }).exec();
    assert.equal(docs.length, 2);
    assert.equal(docs[0].name, 'Star Wars');
    assert.equal(docs[1].name, 'The Empire Strikes Back');
  });

  it('insertMany() `writeErrors` if only one error (gh-8938)', async function() {
    const QuestionType = new mongoose.Schema({
      code: { type: String, required: true, unique: true },
      text: String
    });
    const Question = db.model('Test', QuestionType);


    await Question.init();

    await Question.create({ code: 'MEDIUM', text: '123' });
    const data = [
      { code: 'MEDIUM', text: '1111' },
      { code: 'test', text: '222' },
      { code: 'HARD', text: '2222' }
    ];
    const opts = { ordered: false, rawResult: true };
    let err = await Question.insertMany(data, opts).catch(err => err);
    assert.ok(Array.isArray(err.writeErrors));
    assert.equal(err.writeErrors.length, 1);
    assert.equal(err.insertedDocs.length, 2);
    assert.equal(err.insertedDocs[0].code, 'test');
    assert.equal(err.insertedDocs[1].code, 'HARD');

    assert.equal(err.results.length, 3);
    assert.ok(err.results[0].err.errmsg.includes('E11000'));
    assert.equal(err.results[1].code, 'test');
    assert.equal(err.results[2].code, 'HARD');

    await Question.deleteMany({});
    await Question.create({ code: 'MEDIUM', text: '123' });
    await Question.create({ code: 'HARD', text: '123' });

    err = await Question.insertMany(data, opts).catch(err => err);
    assert.ok(Array.isArray(err.writeErrors));
    assert.equal(err.writeErrors.length, 2);
    assert.equal(err.insertedDocs.length, 1);
    assert.equal(err.insertedDocs[0].code, 'test');

  });

  it('insertMany() ordered option for single validation error', async function() {
    const version = start.mongodVersion();

    const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
    if (!mongo34) {
      return;
    }

    const schema = new Schema({
      name: { type: String, required: true }
    });
    const Movie = db.model('Movie', schema);

    const arr = [
      { foo: 'Star Wars' },
      { foo: 'The Fast and the Furious' }
    ];
    await Movie.insertMany(arr, { ordered: false });

    const docs = await Movie.find({}).sort({ name: 1 }).exec();

    assert.equal(docs.length, 0);
  });

  it('insertMany() hooks (gh-3846)', async function() {
    const schema = new Schema({
      name: String
    });
    let calledPre = 0;
    let calledPost = 0;
    schema.pre('insertMany', function(next, docs) {
      assert.equal(docs.length, 2);
      assert.equal(docs[0].name, 'Star Wars');
      ++calledPre;
      next();
    });
    schema.pre('insertMany', function(next, docs) {
      assert.equal(docs.length, 2);
      assert.equal(docs[0].name, 'Star Wars');
      docs[0].name = 'A New Hope';
      ++calledPre;
      next();
    });
    schema.post('insertMany', function() {
      ++calledPost;
    });
    const Movie = db.model('Movie', schema);

    const arr = [{ name: 'Star Wars' }, { name: 'The Empire Strikes Back' }];
    let docs = await Movie.insertMany(arr);
    assert.equal(docs.length, 2);
    assert.equal(calledPre, 2);
    assert.equal(calledPost, 1);
    docs = await Movie.find({}).sort({ name: 1 });
    assert.equal(docs[0].name, 'A New Hope');
    assert.equal(docs[1].name, 'The Empire Strikes Back');
  });

  it('returns empty array if no documents (gh-8130)', function() {
    const Movie = db.model('Movie', Schema({ name: String }));
    return Movie.insertMany([]).then(docs => assert.deepEqual(docs, []));
  });

  it('insertMany() multi validation error with ordered false (gh-5337)', async function() {
    const schema = new Schema({
      name: { type: String, required: true }
    });
    const Movie = db.model('Movie', schema);

    const arr = [
      { foo: 'The Phantom Menace' },
      { name: 'Star Wars' },
      { name: 'The Empire Strikes Back' },
      { foobar: 'The Force Awakens' }
    ];
    const opts = { ordered: false, rawResult: true };
    const res = await Movie.insertMany(arr, opts);
    assert.equal(res.mongoose.validationErrors.length, 2);
    assert.equal(res.mongoose.validationErrors[0].name, 'ValidationError');
    assert.equal(res.mongoose.validationErrors[1].name, 'ValidationError');
  });

  it('insertMany() validation error with ordered true when all documents are invalid', async function() {
    const schema = new Schema({
      name: { type: String, required: true }
    });
    const Movie = db.model('Movie', schema);

    const arr = [
      { foo: 'The Phantom Menace' },
      { foobar: 'The Force Awakens' }
    ];
    const opts = { ordered: true };
    const error = await Movie.insertMany(arr, opts).then(() => null, err => err);
    assert.ok(error);
    assert.equal(error.name, 'ValidationError');
  });

  it('insertMany() validation error with ordered false when all documents are invalid', async function() {
    const schema = new Schema({
      name: { type: String, required: true }
    });
    const Movie = db.model('Movie', schema);

    const arr = [
      { foo: 'The Phantom Menace' },
      { foobar: 'The Force Awakens' }
    ];
    const opts = { ordered: false };
    const res = await Movie.insertMany(arr, opts);
    assert.equal(res.length, 0);
  });

  it('insertMany() validation error with ordered false and rawResult for checking which documents failed (gh-12791)', async function() {
    const schema = new Schema({
      name: { type: String, required: true },
      year: { type: Number, required: true }
    });
    const Movie = db.model('Movie', schema);

    const id1 = new mongoose.Types.ObjectId();
    const id2 = new mongoose.Types.ObjectId();
    const id3 = new mongoose.Types.ObjectId();
    const arr = [
      { _id: id1, foo: 'The Phantom Menace', year: 1999 },
      { _id: id2, name: 'The Force Awakens', bar: 2015 },
      { _id: id3, name: 'The Empire Strikes Back', year: 1980 }
    ];
    const opts = { ordered: false, rawResult: true };
    const res = await Movie.insertMany(arr, opts);
    // {
    //   acknowledged: true,
    //   insertedCount: 1,
    //   insertedIds: { '0': new ObjectId("63b34b062cfe38622738e510") },
    //   mongoose: { validationErrors: [ [Error], [Error] ] }
    // }

    assert.equal(res.insertedCount, 1);
    assert.equal(res.insertedIds[0].toHexString(), id3.toHexString());
    assert.equal(res.mongoose.validationErrors.length, 2);
    assert.ok(res.mongoose.validationErrors[0].errors['name']);
    assert.ok(!res.mongoose.validationErrors[0].errors['year']);
    assert.ok(res.mongoose.validationErrors[1].errors['year']);
    assert.ok(!res.mongoose.validationErrors[1].errors['name']);

    assert.equal(res.mongoose.results.length, 3);
    assert.ok(res.mongoose.results[0].errors['name']);
    assert.ok(res.mongoose.results[1].errors['year']);
    assert.ok(res.mongoose.results[2].$__);
    assert.equal(res.mongoose.results[2].name, 'The Empire Strikes Back');
  });

  it('insertMany() validation error with ordered false and rawResult for mixed write and validation error (gh-12791)', async function() {
    const schema = new Schema({
      name: { type: String, required: true, unique: true },
      year: { type: Number, required: true }
    });
    const Movie = db.model('Movie', schema);
    await Movie.init();

    const arr = [
      { foo: 'The Phantom Menace', year: 1999 },
      { name: 'The Force Awakens', bar: 2015 },
      { name: 'The Empire Strikes Back', year: 1980 },
      { name: 'The Empire Strikes Back', year: 1980 }
    ];
    const opts = { ordered: false, rawResult: true };
    const err = await Movie.insertMany(arr, opts).then(() => null, err => err);

    assert.ok(err);
    assert.equal(err.insertedDocs.length, 1);
    assert.equal(err.insertedDocs[0].name, 'The Empire Strikes Back');
    assert.equal(err.writeErrors.length, 1);
    assert.equal(err.writeErrors[0].index, 3);
    assert.equal(err.mongoose.validationErrors.length, 2);
    assert.ok(err.mongoose.validationErrors[0].errors['name']);
    assert.ok(!err.mongoose.validationErrors[0].errors['year']);
    assert.ok(err.mongoose.validationErrors[1].errors['year']);
    assert.ok(!err.mongoose.validationErrors[1].errors['name']);
  });

  it('insertMany() populate option (gh-9720)', async function() {
    const schema = new Schema({
      name: { type: String, required: true }
    });
    const Movie = db.model('Movie', schema);
    const Person = db.model('Person', Schema({
      name: String,
      favoriteMovie: {
        type: 'ObjectId',
        ref: 'Movie'
      }
    }));


    const movies = await Movie.create([
      { name: 'The Empire Strikes Back' },
      { name: 'Jingle All The Way' }
    ]);

    const people = await Person.insertMany([
      { name: 'Test1', favoriteMovie: movies[1]._id },
      { name: 'Test2', favoriteMovie: movies[0]._id }
    ], { populate: 'favoriteMovie' });

    assert.equal(people.length, 2);
    assert.equal(people[0].favoriteMovie.name, 'Jingle All The Way');
    assert.equal(people[1].favoriteMovie.name, 'The Empire Strikes Back');

  });

  it('insertMany() sets `isNew` for inserted documents with `ordered = false` (gh-9677)', async function() {
    const schema = new Schema({
      title: { type: String, required: true, unique: true }
    });
    const Movie = db.model('Movie', schema);

    const arr = [{ title: 'The Phantom Menace' }, { title: 'The Phantom Menace' }];
    const opts = { ordered: false };

    await Movie.init();
    const err = await Movie.insertMany(arr, opts).then(() => err, err => err);
    assert.ok(err);
    assert.ok(err.insertedDocs);

    assert.equal(err.insertedDocs.length, 1);
    assert.strictEqual(err.insertedDocs[0].isNew, false);

  });

  it('insertMany() returns only inserted docs with `ordered = true`', async function() {
    const schema = new Schema({
      name: { type: String, required: true, unique: true }
    });
    const Movie = db.model('Movie', schema);

    const arr = [
      { name: 'The Phantom Menace' },
      { name: 'The Empire Strikes Back' },
      { name: 'The Phantom Menace' },
      { name: 'Jingle All The Way' }
    ];
    const opts = { ordered: true };

    await Movie.init();
    const err = await Movie.insertMany(arr, opts).then(() => err, err => err);
    assert.ok(err);
    assert.ok(err.insertedDocs);

    assert.equal(err.insertedDocs.length, 2);
    assert.strictEqual(err.insertedDocs[0].name, 'The Phantom Menace');
    assert.strictEqual(err.insertedDocs[1].name, 'The Empire Strikes Back');

  });

  it('insertMany() validation error with ordered true and rawResult true when all documents are invalid', async function() {
    const schema = new Schema({
      name: { type: String, required: true }
    });
    const Movie = db.model('Movie', schema);

    const arr = [
      { foo: 'The Phantom Menace' },
      { foobar: 'The Force Awakens' }
    ];
    const opts = { ordered: true, rawResult: true };
    const error = await Movie.insertMany(arr, opts).then(() => null, err => err);
    assert.ok(error);
    assert.equal(error.name, 'ValidationError');
  });

  it('insertMany() validation error with ordered false and rawResult true when all documents are invalid', async function() {
    const schema = new Schema({
      name: { type: String, required: true }
    });
    const Movie = db.model('Movie', schema);

    const arr = [
      { foo: 'The Phantom Menace' },
      { foobar: 'The Force Awakens' }
    ];
    const opts = { ordered: false, rawResult: true };
    const res = await Movie.insertMany(arr, opts);
    assert.equal(res.mongoose.validationErrors.length, 2);
    assert.equal(res.mongoose.validationErrors[0].name, 'ValidationError');
    assert.equal(res.mongoose.validationErrors[1].name, 'ValidationError');
  });

  it('insertMany() depopulate (gh-4590)', async function() {
    const personSchema = new Schema({
      name: String
    });
    const movieSchema = new Schema({
      name: String,
      leadActor: {
        type: Schema.Types.ObjectId,
        ref: 'gh4590'
      }
    });

    const Person = db.model('Person', personSchema);
    const Movie = db.model('Movie', movieSchema);

    const arnold = new Person({ name: 'Arnold Schwarzenegger' });
    const movies = [{ name: 'Predator', leadActor: arnold }];
    const docs = await Movie.insertMany(movies);
    assert.equal(docs.length, 1);
    const doc = await Movie.findOne({ name: 'Predator' });
    assert.equal(doc.leadActor.toHexString(), arnold._id.toHexString());
  });

  it('insertMany() with error handlers (gh-6228)', async function() {
    const schema = new Schema({
      name: { type: String, unique: true }
    }, { autoIndex: false });

    let postCalled = 0;
    let postErrorCalled = 0;
    schema.post('insertMany', (doc, next) => {
      ++postCalled;
      next();
    });

    schema.post('insertMany', (err, doc, next) => {
      ++postErrorCalled;
      next(err);
    });

    const Movie = db.model('Movie', schema);


    await Movie.createIndexes();

    let threw = false;
    try {
      await Movie.insertMany([
        { name: 'Star Wars' },
        { name: 'Star Wars' }
      ]);
    } catch (error) {
      assert.ok(error);
      threw = true;
    }

    assert.ok(threw);
    assert.equal(postCalled, 0);
    assert.equal(postErrorCalled, 1);

    await Movie.collection.drop();

  });

  it('insertMany() with non object array error can be catched (gh-8363)', function() {
    const schema = mongoose.Schema({
      _id: mongoose.Schema.Types.ObjectId,
      url: { type: String }
    });
    const Image = db.model('Test', schema);
    return Image.insertMany(['a', 'b', 'c']).then(
      () => assert.ok(false),
      (error) => {
        assert.equal(error.name, 'ObjectParameterError');
      }
    );
  });

  it('insertMany() return docs with empty modifiedPaths (gh-7852)', async function() {
    const schema = new Schema({
      name: { type: String }
    });

    const Food = db.model('Test', schema);


    const foods = await Food.insertMany([
      { name: 'Rice dumplings' },
      { name: 'Beef noodle' }
    ]);
    assert.equal(foods[0].modifiedPaths().length, 0);
    assert.equal(foods[1].modifiedPaths().length, 0);

  });

  it('insertMany with Decimal (gh-5190)', async function() {
    const version = start.mongodVersion();

    const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
    if (!mongo34) {
      return;
    }

    const schema = new mongoose.Schema({
      amount: mongoose.Schema.Types.Decimal
    });
    const Money = db.model('Test', schema);

    await Money.insertMany([{ amount: '123.45' }]);
  });
});
