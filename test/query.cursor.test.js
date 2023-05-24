/**
 * Module dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('QueryCursor', function() {
  let db;
  let Model;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  beforeEach(async function() {
    const schema = new Schema({ name: String });
    schema.virtual('test').get(function() { return 'test'; });

    Model = db.model('Test', schema);

    await Model.deleteMany({});
    await Model.create({ name: 'Axl' }, { name: 'Slash' });
  });

  describe('#next()', function() {
    it('with promises', function(done) {
      const cursor = Model.find().sort({ name: 1 }).cursor();
      cursor.next().then(function(doc) {
        assert.equal(doc.name, 'Axl');
        assert.equal(doc.test, 'test');
        cursor.next().then(function(doc) {
          assert.equal(doc.name, 'Slash');
          assert.equal(doc.test, 'test');
          done();
        });
      });
    });

    it('with limit (gh-4266)', async function() {
      const cursor = Model.find().limit(1).sort({ name: 1 }).cursor();
      const doc = await cursor.next();
      assert.equal(doc.name, 'Axl');
      const doc2 = await cursor.next();
      assert.ok(!doc2);
    });

    it('with projection', async function() {
      const personSchema = new Schema({
        name: String,
        born: String
      });
      const Person = db.model('Person', personSchema);
      const people = [
        { name: 'Axl Rose', born: 'William Bruce Rose' },
        { name: 'Slash', born: 'Saul Hudson' }
      ];
      await Person.create(people);
      const cursor = Person.find({}, { _id: 0, name: 1 }).sort({ name: 1 }).cursor();
      const doc1 = await cursor.next();
      assert.equal(doc1._id, undefined);
      assert.equal(doc1.name, 'Axl Rose');
      assert.equal(doc1.born, undefined);
      const doc2 = await cursor.next();
      assert.equal(doc2._id, undefined);
      assert.equal(doc2.name, 'Slash');
      assert.equal(doc2.born, undefined);
    });

    describe('with populate', function() {
      let populateCalls = 0;

      const bandSchema = new Schema({
        name: String,
        members: [{ type: mongoose.Schema.ObjectId, ref: 'Person' }]
      });
      const personSchema = new Schema({
        name: String
      });
      personSchema.pre('find', () => { ++populateCalls; });

      let Band;

      beforeEach(async function() {
        const Person = db.model('Person', personSchema);
        Band = db.model('Band', bandSchema);

        const people = [
          { name: 'Axl Rose' },
          { name: 'Slash' },
          { name: 'Nikki Sixx' },
          { name: 'Vince Neil' },
          { name: 'Trent Reznor' },
          { name: 'Thom Yorke' },
          { name: 'Billy Corgan' }
        ];
        const docs = await Person.create(people);

        const bands = [
          { name: 'Guns N\' Roses', members: [docs[0], docs[1]] },
          { name: 'Motley Crue', members: [docs[2], docs[3]] },
          { name: 'Nine Inch Nails', members: [docs[4]] },
          { name: 'Radiohead', members: [docs[5]] },
          { name: 'The Smashing Pumpkins', members: [docs[6]] }
        ];
        await Band.create(bands);
      });

      it('with populate without specify batchSize', async function() {
        const cursor = Band.find().sort({ name: 1 }).populate('members').cursor();

        let doc = await cursor.next();
        assert.equal(doc.name, 'Guns N\' Roses');
        assert.equal(doc.members.length, 2);
        assert.equal(doc.members[0].name, 'Axl Rose');
        assert.equal(doc.members[1].name, 'Slash');

        doc = await cursor.next();
        assert.equal(doc.name, 'Motley Crue');
        assert.equal(doc.members.length, 2);
        assert.equal(doc.members[0].name, 'Nikki Sixx');
        assert.equal(doc.members[1].name, 'Vince Neil');

        doc = await cursor.next();
        assert.equal(doc.name, 'Nine Inch Nails');
        assert.equal(doc.members.length, 1);
        assert.equal(doc.members[0].name, 'Trent Reznor');

        doc = await cursor.next();
        assert.equal(doc.name, 'Radiohead');
        assert.equal(doc.members.length, 1);
        assert.equal(doc.members[0].name, 'Thom Yorke');

        doc = await cursor.next();
        assert.equal(doc.name, 'The Smashing Pumpkins');
        assert.equal(doc.members.length, 1);
        assert.equal(doc.members[0].name, 'Billy Corgan');
      });

      it('with populate using custom batchSize', async function() {
        populateCalls = 0;
        const cursor =
          Band.find().sort({ name: 1 }).populate('members').batchSize(3).cursor();

        let doc = await cursor.next();
        assert.equal(doc.name, 'Guns N\' Roses');
        assert.equal(doc.members.length, 2);
        assert.equal(doc.members[0].name, 'Axl Rose');
        assert.equal(doc.members[1].name, 'Slash');

        doc = await cursor.next();
        assert.equal(doc.name, 'Motley Crue');
        assert.equal(doc.members.length, 2);
        assert.equal(doc.members[0].name, 'Nikki Sixx');
        assert.equal(doc.members[1].name, 'Vince Neil');

        doc = await cursor.next();
        assert.equal(doc.name, 'Nine Inch Nails');
        assert.equal(doc.members.length, 1);
        assert.equal(doc.members[0].name, 'Trent Reznor');

        doc = await cursor.next();
        assert.equal(doc.members.length, 1);
        assert.equal(doc.members[0].name, 'Thom Yorke');

        doc = await cursor.next();
        assert.equal(doc.name, 'The Smashing Pumpkins');
        assert.equal(doc.members.length, 1);
        assert.equal(doc.members[0].name, 'Billy Corgan');

        assert.equal(populateCalls, 2);
      });
    });

    it('casting ObjectIds with where() (gh-4355)', async function() {
      let doc = await Model.findOne();
      assert.ok(doc);
      const query = { _id: doc._id.toHexString() };
      doc = await Model.find().where(query).cursor().next();
      assert.ok(doc);
    });

    it('cast errors (gh-4355)', async function() {
      try {
        await Model.find().where({ _id: 'BadId' }).cursor().next();
        assert.ok(false);
      } catch (error) {
        assert.ok(error);
        assert.equal(error.name, 'CastError');
        assert.equal(error.path, '_id');
      }
    });

    it('with pre-find hooks (gh-5096)', async function() {
      const schema = new Schema({ name: String });
      let called = 0;
      schema.pre('find', function(next) {
        ++called;
        next();
      });

      db.deleteModel(/Test/);
      const Model = db.model('Test', schema);

      await Model.deleteMany({});
      await Model.create({ name: 'Test' });

      const doc = await Model.find().cursor().next();
      assert.equal(called, 1);
      assert.equal(doc.name, 'Test');
    });
  });

  it('as readable stream', function(done) {
    const cursor = Model.find().sort({ name: 1 }).cursor();

    const expectedNames = ['Axl', 'Slash'];
    let cur = 0;
    cursor.on('data', function(doc) {
      assert.equal(doc.name, expectedNames[cur++]);
      assert.equal(doc.test, 'test');
    });

    cursor.on('error', function(error) {
      done(error);
    });

    cursor.on('end', function() {
      assert.equal(cur, 2);
      done();
    });
  });

  describe('`transform` option', function() {
    it('transforms document', function(done) {
      const cursor = Model.find().sort({ name: 1 }).cursor({
        transform: function(doc) {
          doc.name += '_transform';
          return doc;
        }
      });

      const expectedNames = ['Axl_transform', 'Slash_transform'];
      let cur = 0;
      cursor.on('data', function(doc) {
        assert.equal(doc.name, expectedNames[cur++]);
        assert.equal(doc.test, 'test');
      });

      cursor.on('error', function(error) {
        done(error);
      });

      cursor.on('end', function() {
        assert.equal(cur, 2);
        done();
      });
    });
  });

  describe('#map', function() {
    it('maps documents', function(done) {
      const cursor = Model.find().sort({ name: 1 }).cursor()
        .map(function(obj) {
          obj.name += '_mapped';
          return obj;
        })
        .map(function(obj) {
          obj.name += '_mappedagain';
          return obj;
        });

      const expectedNames = ['Axl_mapped_mappedagain', 'Slash_mapped_mappedagain'];
      let cur = 0;
      cursor.on('data', function(doc) {
        assert.equal(doc.name, expectedNames[cur++]);
        assert.equal(doc.test, 'test');
      });

      cursor.on('error', function(error) {
        done(error);
      });

      cursor.on('end', function() {
        assert.equal(cur, 2);
        done();
      });
    });

    it('with #next', async function() {
      const cursor = Model.find().sort({ name: 1 }).cursor()
        .map(function(obj) {
          obj.name += '_next';
          return obj;
        });

      const doc = await cursor.next();
      assert.equal(doc.name, 'Axl_next');
      assert.equal(doc.test, 'test');

      const doc2 = await cursor.next();
      assert.equal(doc2.name, 'Slash_next');
      assert.equal(doc2.test, 'test');
    });
  });

  describe('#eachAsync()', function() {
    it('iterates one-by-one, stopping for promises', function(done) {
      const cursor = Model.find().sort({ name: 1 }).cursor();

      const expectedNames = ['Axl', 'Slash'];
      let cur = 0;

      const checkDoc = function(doc) {
        const _cur = cur;
        assert.equal(doc.name, expectedNames[cur]);
        return {
          then: function(resolve) {
            setTimeout(function() {
              assert.equal(_cur, cur++);
              resolve();
            }, 50);
          }
        };
      };
      cursor.eachAsync(checkDoc).then(function() {
        assert.equal(cur, 2);
        done();
      }).catch(done);
    });

    it('parallelization', function(done) {
      const cursor = Model.find().sort({ name: 1 }).cursor();

      const names = [];
      const resolves = [];
      const checkDoc = function(doc) {
        names.push(doc.name);
        const p = new Promise(resolve => {
          resolves.push(resolve);
        });

        if (names.length === 2) {
          setTimeout(() => resolves.forEach(r => r()), 0);
        }

        return p;
      };
      cursor.eachAsync(checkDoc, { parallel: 2 }).then(function() {
        assert.equal(names.length, 2);
        assert.deepEqual(names.sort(), ['Axl', 'Slash']);
        done();
      }).catch(done);
    });
  });

  describe('#lean()', function() {
    it('lean', function(done) {
      const cursor = Model.find().sort({ name: 1 }).lean().cursor();

      const expectedNames = ['Axl', 'Slash'];
      let cur = 0;
      cursor.on('data', function(doc) {
        assert.equal(doc.name, expectedNames[cur++]);
        assert.strictEqual(doc instanceof mongoose.Document, false);
      });

      cursor.on('error', function(error) {
        done(error);
      });

      cursor.on('end', function() {
        assert.equal(cur, 2);
        done();
      });
    });

    it('lean = false (gh-7197)', async function() {
      const cursor = Model.find().sort({ name: 1 }).lean(false).cursor();

      const doc = await cursor.next();
      assert.ok(doc instanceof mongoose.Document);
    });
  });

  describe('#close()', function() {
    it('works (gh-4258)', async function() {
      const cursor = Model.find().sort({ name: 1 }).cursor();
      const doc = await cursor.next();
      assert.equal(doc.name, 'Axl');
      assert.equal(doc.test, 'test');

      let closed = false;
      cursor.on('close', function() {
        closed = true;
      });

      await cursor.close();
      assert.ok(closed);
      try {
        await cursor.next();
        assert.ok(false);
      } catch (error) {
        assert.equal(error.name, 'MongoCursorExhaustedError');
      }
    });
  });

  it('handles non-boolean lean option (gh-7137)', async function() {
    const schema = new Schema({ name: String });
    db.deleteModel(/Test/);
    const Model = db.model('Test', schema);

    await Model.deleteMany({});
    await Model.create({ name: 'test' });

    let doc;
    await Model.find().lean({ virtuals: true }).cursor().eachAsync(_doc => {
      assert.ok(!doc);
      doc = _doc;
    });

    assert.ok(!doc.$__);
  });

  it('data before close (gh-4998)', async function() {
    const userSchema = new mongoose.Schema({
      name: String
    });

    const User = db.model('User', userSchema);
    const users = [];
    for (let i = 0; i < 100; i++) {
      users.push({
        _id: new mongoose.Types.ObjectId(),
        name: 'Bob' + (i < 10 ? '0' : '') + i
      });
    }

    await User.insertMany(users);

    const stream = User.find({}).cursor();
    const docs = [];

    stream.on('data', function(doc) {
      docs.push(doc);
    });

    await new Promise(resolve => {
      stream.on('close', resolve);
    });
    assert.equal(docs.length, 100);
  });

  it('pulls schema-level readPreference (gh-8421)', function() {
    const read = 'secondaryPreferred';
    const User = db.model('User', Schema({ name: String }, { read }));
    const cursor = User.find().cursor();

    assert.equal(cursor.options.readPreference, read);
  });

  it('eachAsync() with parallel > numDocs (gh-8422)', async function() {
    const schema = new mongoose.Schema({ name: String });
    const Movie = db.model('Movie', schema);

    await Movie.deleteMany({});
    await Movie.create([
      { name: 'Kickboxer' },
      { name: 'Ip Man' },
      { name: 'Enter the Dragon' }
    ]);

    let numDone = 0;

    await Movie.find().cursor().eachAsync(async function() {
      await delay(100);
      ++numDone;
    }, { parallel: 4 });
    assert.equal(numDone, 3);
  });

  it('eachAsync() with sort, parallel, and sync function (gh-8557)', async function() {
    const User = db.model('User', Schema({ order: Number }));

    await User.create([{ order: 1 }, { order: 2 }, { order: 3 }]);

    const cursor = User.aggregate([{ $sort: { order: 1 } }]).
      cursor();

    const docs = [];

    await cursor.eachAsync((doc) => docs.push(doc), { parallel: 3 });

    assert.deepEqual(docs.map(d => d.order), [1, 2, 3]);
  });

  it('closing query cursor emits `close` event only once (gh-8835)', function(done) {
    const User = db.model('User', new Schema({ name: String }));

    const cursor = User.find().cursor();
    cursor.on('data', () => {});

    let closeEventTriggeredCount = 0;
    cursor.on('close', () => closeEventTriggeredCount++);
    setTimeout(() => {
      assert.equal(closeEventTriggeredCount, 1);
      done();
    }, 20);
  });

  it('closing aggregation cursor emits `close` event only once (gh-8835)', function(done) {
    const User = db.model('User', new Schema({ name: String }));

    const cursor = User.aggregate([{ $match: {} }]).cursor();
    cursor.on('data', () => {});

    let closeEventTriggeredCount = 0;
    cursor.on('close', () => closeEventTriggeredCount++);


    setTimeout(() => {
      assert.equal(closeEventTriggeredCount, 1);
      done();
    }, 20);
  });

  it('closing query cursor emits `close` event only once with stream pause/resume (gh-10876)', function(done) {
    const User = db.model('User', new Schema({ name: String }));

    User.create({ name: 'First' }, { name: 'Second' })
      .then(() => {
        const cursor = User.find().cursor();
        cursor.on('data', () => {
          cursor.pause();
          setTimeout(() => cursor.resume(), 50);
        });

        let closeEventTriggeredCount = 0;
        cursor.on('close', () => closeEventTriggeredCount++);
        setTimeout(() => {
          assert.equal(closeEventTriggeredCount, 1);
          done();
        }, 200);
      });
  });

  it('closing aggregation cursor emits `close` event only once with stream pause/resume (gh-10876)', function(done) {
    const User = db.model('User', new Schema({ name: String }));

    User.create({ name: 'First' }, { name: 'Second' })
      .then(() => {
        const cursor = User.aggregate([{ $match: {} }]).cursor();
        cursor.on('data', () => {
          cursor.pause();
          setTimeout(() => cursor.resume(), 50);
        });

        let closeEventTriggeredCount = 0;
        cursor.on('close', () => closeEventTriggeredCount++);

        setTimeout(() => {
          assert.equal(closeEventTriggeredCount, 1);
          done();
        }, 200);
      });
  });

  it('query cursor emit end event (gh-10902)', function(done) {
    const User = db.model('User', new Schema({ name: String }));

    User.create({ name: 'First' }, { name: 'Second' })
      .then(() => {
        const cursor = User.find({}).cursor();
        cursor.on('data', () => {
          cursor.pause();
          setTimeout(() => cursor.resume(), 50);
        });

        let endEventTriggeredCount = 0;
        cursor.on('end', () => endEventTriggeredCount++);

        setTimeout(() => {
          assert.equal(endEventTriggeredCount, 1);
          done();
        }, 200);
      });
  });

  it('aggregate cursor emit end event (gh-10902)', function(done) {
    const User = db.model('User', new Schema({ name: String }));

    User.create({ name: 'First' }, { name: 'Second' })
      .then(() => {
        const cursor = User.aggregate([{ $match: {} }]).cursor();
        cursor.on('data', () => {
          cursor.pause();
          setTimeout(() => cursor.resume(), 50);
        });

        let endEventTriggeredCount = 0;
        cursor.on('end', () => endEventTriggeredCount++);

        setTimeout(() => {
          assert.equal(endEventTriggeredCount, 1);
          done();
        }, 200);
      });
  });

  it('query cursor emit end event before close event (gh-10902)', function(done) {
    const User = db.model('User', new Schema({ name: String }));

    User.create({ name: 'First' }, { name: 'Second' })
      .then(() => {
        const cursor = User.find({}).cursor();
        cursor.on('data', () => {
          cursor.pause();
          setTimeout(() => cursor.resume(), 50);
        });

        let endEventTriggeredCount = 0;
        cursor.on('end', () => endEventTriggeredCount++);
        cursor.on('close', () => {
          assert.equal(endEventTriggeredCount, 1);
          done();
        });
      });
  });

  it('aggregate cursor emit end event before close event (gh-10902)', function(done) {
    const User = db.model('User', new Schema({ name: String }));

    User.create({ name: 'First' }, { name: 'Second' })
      .then(() => {
        const cursor = User.aggregate([{ $match: {} }]).cursor();
        cursor.on('data', () => {
          cursor.pause();
          setTimeout(() => cursor.resume(), 50);
        });

        let endEventTriggeredCount = 0;
        cursor.on('end', () => endEventTriggeredCount++);
        cursor.on('close', () => {
          assert.equal(endEventTriggeredCount, 1);
          done();
        });
      });
  });

  it('passes document index as the second argument for query cursor (gh-8972)', async function() {
    const User = db.model('User', Schema({ order: Number }));

    await User.create([{ order: 1 }, { order: 2 }, { order: 3 }]);

    const docsWithIndexes = [];

    await User.find().sort('order').cursor().eachAsync((doc, i) => {
      docsWithIndexes.push({ order: doc.order, i: i });
    });

    const expected = [
      { order: 1, i: 0 },
      { order: 2, i: 1 },
      { order: 3, i: 2 }
    ];

    assert.deepEqual(docsWithIndexes, expected);
  });

  it('passes document index as the second argument for aggregation cursor (gh-8972)', async function() {
    const User = db.model('User', Schema({ order: Number }));

    await User.create([{ order: 1 }, { order: 2 }, { order: 3 }]);


    const docsWithIndexes = [];

    await User.aggregate([{ $sort: { order: 1 } }]).cursor().eachAsync((doc, i) => {
      docsWithIndexes.push({ order: doc.order, i: i });
    });

    const expected = [
      { order: 1, i: 0 },
      { order: 2, i: 1 },
      { order: 3, i: 2 }
    ];

    assert.deepEqual(docsWithIndexes, expected);
  });

  it('post hooks (gh-9435)', async function() {
    const schema = new mongoose.Schema({ name: String });
    schema.post('find', function(docs) {
      docs.forEach(doc => { doc.name = doc.name.toUpperCase(); });
    });
    const Movie = db.model('Movie', schema);

    await Movie.deleteMany({});
    await Movie.create([
      { name: 'Kickboxer' },
      { name: 'Ip Man' },
      { name: 'Enter the Dragon' }
    ]);

    const arr = [];
    await Movie.find().sort({ name: -1 }).cursor().
      eachAsync(doc => arr.push(doc.name));
    assert.deepEqual(arr, ['KICKBOXER', 'IP MAN', 'ENTER THE DRAGON']);
  });

  it('reports CastError with noCursorTimeout set (gh-10150)', async function() {
    const schema = new mongoose.Schema({ name: String });
    const Movie = db.model('Movie', schema);

    await Movie.deleteMany({});
    await Movie.create([
      { name: 'Kickboxer' },
      { name: 'Ip Man' },
      { name: 'Enter the Dragon' }
    ]);

    const arr = [];
    const err = await Movie.find({ name: { lt: 'foo' } }).cursor().
      addCursorFlag('noCursorTimeout', true).
      eachAsync(doc => arr.push(doc.name)).
      then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.name, 'CastError');
  });

  it('reports error in pre save hook (gh-10785)', async function() {
    const schema = new mongoose.Schema({ name: String });

    schema.pre('find', async() => {
      await new Promise(resolve => setTimeout(resolve, 10));
      throw new Error('Oops!');
    });

    const Movie = db.model('Movie', schema);

    await Movie.deleteMany({});
    await Movie.create([
      { name: 'Kickboxer' },
      { name: 'Ip Man' },
      { name: 'Enter the Dragon' }
    ]);

    const arr = [];
    const err = await Movie.find({ name: { $lt: 'foo' } }).cursor().
      eachAsync(doc => arr.push(doc.name)).
      then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.message, 'Oops!');
  });

  it('applies selected fields when using discriminators (gh-11130)', async function() {
    const schemaOptions = { discriminatorKey: 'type' };
    const schema = new Schema({
      type: { type: String, enum: ['type1', 'type2'] },
      foo: { type: String, default: 'foo' },
      bar: { type: String }
    }, schemaOptions);

    const Example = db.model('Example', schema);

    Example.discriminator('type1', Schema({ type1: String }, schemaOptions), 'type1');
    Example.discriminator('type2', Schema({ type2: String }, schemaOptions), 'type2');

    await Example.create({
      type: 'type1',
      foo: 'example1',
      bar: 'example1',
      type1: 'example1'
    });
    await Example.create({
      type: 'type2',
      foo: 'example2',
      bar: 'example2',
      type2: 'example2'
    });

    const cursor = Example.find().select('bar type');
    const dirty = [];
    for await (const doc of cursor) {
      dirty.push(doc.$__dirty());
      await doc.save();
    }
    assert.deepStrictEqual(dirty, [[], []]);

    const docs = await Example.find().sort('foo');
    assert.deepStrictEqual(docs.map(d => d.foo), ['example1', 'example2']);
  });
  it('should allow middleware to run before applying _optionsForExec() gh-13417', async function() {
    const testSchema = new Schema({
      a: Number,
      b: Number,
      c: Number
    });
    testSchema.pre('find', function() {
      this.select('-c');
    });
    const Test = db.model('gh13417', testSchema);
    await Test.create([{ a: 1, b: 1, c: 1 }, { a: 2, b: 2, c: 2 }]);
    const cursorMiddleSelect = [];
    let r;
    const cursor = Test.find().select('-b').sort({ a: 1 }).cursor();
    // eslint-disable-next-line no-cond-assign
    while (r = await cursor.next()) {
      cursorMiddleSelect.push(r);
    }
    assert.equal(typeof cursorMiddleSelect[0].b, 'undefined');
    assert.equal(typeof cursorMiddleSelect[1].b, 'undefined');
    assert.equal(typeof cursorMiddleSelect[0].c, 'undefined');
    assert.equal(typeof cursorMiddleSelect[1].c, 'undefined');
  });

  it('handles skipMiddlewareFunction() (gh-13411)', async function() {
    const schema = new mongoose.Schema({ name: String });

    schema.pre('find', async() => {
      throw mongoose.skipMiddlewareFunction();
    });

    const Movie = db.model('Movie', schema);

    await Movie.deleteMany({});
    await Movie.create([
      { name: 'Kickboxer' },
      { name: 'Ip Man' },
      { name: 'Enter the Dragon' }
    ]);

    const arr = [];
    await Movie.find({}).cursor().eachAsync(doc => arr.push(doc.name));
    assert.strictEqual(arr.length, 0);
  });

  it('throws if calling skipMiddlewareFunction() with non-empty array (gh-13411)', async function() {
    const schema = new mongoose.Schema({ name: String });

    schema.pre('find', (next) => {
      next(mongoose.skipMiddlewareFunction([{ name: 'bar' }]));
    });

    const Movie = db.model('Movie', schema);

    await Movie.deleteMany({});
    await Movie.create([
      { name: 'Kickboxer' },
      { name: 'Ip Man' },
      { name: 'Enter the Dragon' }
    ]);

    const err = await Movie.find().cursor().
      eachAsync(() => {}).
      then(() => null, err => err);
    assert.ok(err);
    assert.ok(err.message.includes('skipMiddlewareFunction'), err.message);
  });
});

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
