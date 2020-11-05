/**
 * Module dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');
const co = require('co');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('QueryCursor', function() {
  let db;
  let Model;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  beforeEach(function() {
    const schema = new Schema({ name: String });
    schema.virtual('test').get(function() { return 'test'; });

    Model = db.model('Test', schema);

    return Model.create({ name: 'Axl' }, { name: 'Slash' });
  });

  describe('#next()', function() {
    it('with callbacks', function(done) {
      const cursor = Model.find().sort({ name: 1 }).cursor();
      cursor.next(function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.name, 'Axl');
        assert.equal(doc.test, 'test');
        cursor.next(function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.name, 'Slash');
          assert.equal(doc.test, 'test');
          done();
        });
      });
    });

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

    it('with limit (gh-4266)', function(done) {
      const cursor = Model.find().limit(1).sort({ name: 1 }).cursor();
      cursor.next(function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.name, 'Axl');
        cursor.next(function(error, doc) {
          assert.ifError(error);
          assert.ok(!doc);
          done();
        });
      });
    });

    it('with projection', function(done) {
      const personSchema = new Schema({
        name: String,
        born: String
      });
      const Person = db.model('Person', personSchema);
      const people = [
        { name: 'Axl Rose', born: 'William Bruce Rose' },
        { name: 'Slash', born: 'Saul Hudson' }
      ];
      Person.create(people, function(error) {
        assert.ifError(error);
        const cursor = Person.find({}, { _id: 0, name: 1 }).sort({ name: 1 }).cursor();
        cursor.next(function(error, doc) {
          assert.ifError(error);
          assert.equal(doc._id, undefined);
          assert.equal(doc.name, 'Axl Rose');
          assert.equal(doc.born, undefined);
          cursor.next(function(error, doc) {
            assert.ifError(error);
            assert.equal(doc._id, undefined);
            assert.equal(doc.name, 'Slash');
            assert.equal(doc.born, undefined);
            done();
          });
        });
      });
    });

    describe('with populate', function() {
      const bandSchema = new Schema({
        name: String,
        members: [{ type: mongoose.Schema.ObjectId, ref: 'Person' }]
      });
      const personSchema = new Schema({
        name: String
      });

      let Band;

      beforeEach(function(done) {
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
        Person.create(people, function(error, docs) {
          assert.ifError(error);
          const bands = [
            { name: 'Guns N\' Roses', members: [docs[0], docs[1]] },
            { name: 'Motley Crue', members: [docs[2], docs[3]] },
            { name: 'Nine Inch Nails', members: [docs[4]] },
            { name: 'Radiohead', members: [docs[5]] },
            { name: 'The Smashing Pumpkins', members: [docs[6]] }
          ];
          Band.create(bands, function(error) {
            assert.ifError(error);
            done();
          });
        });
      });

      it('with populate without specify batchSize', function(done) {
        const cursor =
          Band.find().sort({ name: 1 }).populate('members').cursor();
        cursor.next(function(error, doc) {
          assert.ifError(error);
          assert.equal(cursor.cursor.cursorState.currentLimit, 1);
          assert.equal(doc.name, 'Guns N\' Roses');
          assert.equal(doc.members.length, 2);
          assert.equal(doc.members[0].name, 'Axl Rose');
          assert.equal(doc.members[1].name, 'Slash');
          cursor.next(function(error, doc) {
            assert.ifError(error);
            assert.equal(cursor.cursor.cursorState.currentLimit, 2);
            assert.equal(doc.name, 'Motley Crue');
            assert.equal(doc.members.length, 2);
            assert.equal(doc.members[0].name, 'Nikki Sixx');
            assert.equal(doc.members[1].name, 'Vince Neil');
            cursor.next(function(error, doc) {
              assert.ifError(error);
              assert.equal(cursor.cursor.cursorState.currentLimit, 3);
              assert.equal(doc.name, 'Nine Inch Nails');
              assert.equal(doc.members.length, 1);
              assert.equal(doc.members[0].name, 'Trent Reznor');
              cursor.next(function(error, doc) {
                assert.ifError(error);
                assert.equal(cursor.cursor.cursorState.currentLimit, 4);
                assert.equal(doc.name, 'Radiohead');
                assert.equal(doc.members.length, 1);
                assert.equal(doc.members[0].name, 'Thom Yorke');
                cursor.next(function(error, doc) {
                  assert.ifError(error);
                  assert.equal(cursor.cursor.cursorState.currentLimit, 5);
                  assert.equal(doc.name, 'The Smashing Pumpkins');
                  assert.equal(doc.members.length, 1);
                  assert.equal(doc.members[0].name, 'Billy Corgan');
                  done();
                });
              });
            });
          });
        });
      });

      it('with populate using custom batchSize', function(done) {
        const cursor =
          Band.find().sort({ name: 1 }).populate('members').batchSize(3).cursor();
        cursor.next(function(error, doc) {
          assert.ifError(error);
          assert.equal(cursor.cursor.cursorState.currentLimit, 3);
          assert.equal(doc.name, 'Guns N\' Roses');
          assert.equal(doc.members.length, 2);
          assert.equal(doc.members[0].name, 'Axl Rose');
          assert.equal(doc.members[1].name, 'Slash');
          cursor.next(function(error, doc) {
            assert.ifError(error);
            assert.equal(cursor.cursor.cursorState.currentLimit, 3);
            assert.equal(doc.name, 'Motley Crue');
            assert.equal(doc.members.length, 2);
            assert.equal(doc.members[0].name, 'Nikki Sixx');
            assert.equal(doc.members[1].name, 'Vince Neil');
            cursor.next(function(error, doc) {
              assert.ifError(error);
              assert.equal(cursor.cursor.cursorState.currentLimit, 3);
              assert.equal(doc.name, 'Nine Inch Nails');
              assert.equal(doc.members.length, 1);
              assert.equal(doc.members[0].name, 'Trent Reznor');
              cursor.next(function(error, doc) {
                assert.ifError(error);
                assert.equal(cursor.cursor.cursorState.currentLimit, 5);
                assert.equal(doc.name, 'Radiohead');
                assert.equal(doc.members.length, 1);
                assert.equal(doc.members[0].name, 'Thom Yorke');
                cursor.next(function(error, doc) {
                  assert.ifError(error);
                  assert.equal(cursor.cursor.cursorState.currentLimit, 5);
                  assert.equal(doc.name, 'The Smashing Pumpkins');
                  assert.equal(doc.members.length, 1);
                  assert.equal(doc.members[0].name, 'Billy Corgan');
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('casting ObjectIds with where() (gh-4355)', function(done) {
      Model.findOne(function(error, doc) {
        assert.ifError(error);
        assert.ok(doc);
        const query = { _id: doc._id.toHexString() };
        Model.find().where(query).cursor().next(function(error, doc) {
          assert.ifError(error);
          assert.ok(doc);
          done();
        });
      });
    });

    it('cast errors (gh-4355)', function(done) {
      Model.find().where({ _id: 'BadId' }).cursor().next(function(error) {
        assert.ok(error);
        assert.equal(error.name, 'CastError');
        assert.equal(error.path, '_id');
        done();
      });
    });

    it('with pre-find hooks (gh-5096)', function() {
      const schema = new Schema({ name: String });
      let called = 0;
      schema.pre('find', function(next) {
        ++called;
        next();
      });

      db.deleteModel(/Test/);
      const Model = db.model('Test', schema);

      return co(function*() {
        yield Model.deleteMany({});
        yield Model.create({ name: 'Test' });

        const doc = yield Model.find().cursor().next();
        assert.equal(called, 1);
        assert.equal(doc.name, 'Test');
      });
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

    it('with #next', function(done) {
      const cursor = Model.find().sort({ name: 1 }).cursor()
        .map(function(obj) {
          obj.name += '_next';
          return obj;
        });

      cursor.next(function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.name, 'Axl_next');
        assert.equal(doc.test, 'test');
        cursor.next(function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.name, 'Slash_next');
          assert.equal(doc.test, 'test');
          done();
        });
      });
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

    it('lean = false (gh-7197)', function() {
      const cursor = Model.find().sort({ name: 1 }).lean(false).cursor();

      return co(function*() {
        const doc = yield cursor.next();
        assert.ok(doc instanceof mongoose.Document);
      });
    });
  });

  describe('#close()', function() {
    it('works (gh-4258)', function(done) {
      const cursor = Model.find().sort({ name: 1 }).cursor();
      cursor.next(function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.name, 'Axl');
        assert.equal(doc.test, 'test');

        let closed = false;
        cursor.on('close', function() {
          closed = true;
        });

        cursor.close(function(error) {
          assert.ifError(error);
          assert.ok(closed);
          cursor.next(function(error) {
            assert.ok(error);
            assert.equal(error.message, 'Cursor is closed');
            done();
          });
        });
      });
    });
  });

  it('handles non-boolean lean option (gh-7137)', function() {
    const schema = new Schema({ name: String });
    db.deleteModel(/Test/);
    const Model = db.model('Test', schema);

    return co(function*() {
      yield Model.deleteMany({});
      yield Model.create({ name: 'test' });

      let doc;
      yield Model.find().lean({ virtuals: true }).cursor().eachAsync(_doc => {
        assert.ok(!doc);
        doc = _doc;
      });

      assert.ok(!doc.$__);
    });
  });

  it('addCursorFlag (gh-4814)', function(done) {
    const userSchema = new mongoose.Schema({
      name: String
    });

    const User = db.model('User', userSchema);

    const cursor = User.find().cursor().addCursorFlag('noCursorTimeout', true);

    cursor.on('cursor', function() {
      assert.equal(cursor.cursor.cursorState.cmd.noCursorTimeout, true);
      done();
    });
  });

  it('data before close (gh-4998)', function(done) {
    const userSchema = new mongoose.Schema({
      name: String
    });

    const User = db.model('User', userSchema);
    const users = [];
    for (let i = 0; i < 100; i++) {
      users.push({
        _id: mongoose.Types.ObjectId(),
        name: 'Bob' + (i < 10 ? '0' : '') + i
      });
    }

    User.insertMany(users, function(error) {
      assert.ifError(error);

      const stream = User.find({}).cursor();
      const docs = [];

      stream.on('data', function(doc) {
        docs.push(doc);
      });

      stream.on('close', function() {
        assert.equal(docs.length, 100);
        done();
      });
    });
  });

  it('batchSize option (gh-8039)', function() {
    const User = db.model('gh8039', Schema({ name: String }));
    let cursor = User.find().cursor({ batchSize: 2000 });

    return new Promise(resolve => cursor.once('cursor', () => resolve())).
      then(() => assert.equal(cursor.cursor.cursorState.batchSize, 2000)).
      then(() => {
        cursor = User.find().batchSize(2001).cursor();
      }).
      then(() => new Promise(resolve => cursor.once('cursor', () => resolve()))).
      then(() => {
        assert.equal(cursor.cursor.cursorState.batchSize, 2001);
      });
  });

  it('pulls schema-level readPreference (gh-8421)', function() {
    const read = 'secondaryPreferred';
    const User = db.model('User', Schema({ name: String }, { read }));
    const cursor = User.find().cursor();

    assert.equal(cursor.options.readPreference.mode, read);
  });

  it('eachAsync() with parallel > numDocs (gh-8422)', function() {
    const schema = new mongoose.Schema({ name: String });
    const Movie = db.model('Movie', schema);

    return co(function*() {
      yield Movie.deleteMany({});
      yield Movie.create([
        { name: 'Kickboxer' },
        { name: 'Ip Man' },
        { name: 'Enter the Dragon' }
      ]);

      let numDone = 0;

      const test = co.wrap(function*() {
        yield new Promise((resolve) => setTimeout(resolve, 100));
        ++numDone;
      });

      yield Movie.find().cursor().eachAsync(test, { parallel: 4 });
      assert.equal(numDone, 3);
    });
  });

  it('eachAsync() with sort, parallel, and sync function (gh-8557)', function() {
    const User = db.model('User', Schema({ order: Number }));

    return co(function*() {
      yield User.create([{ order: 1 }, { order: 2 }, { order: 3 }]);

      const cursor = User.aggregate([{ $sort: { order: 1 } }]).
        cursor().
        exec();

      const docs = [];

      yield cursor.eachAsync((doc) => docs.push(doc), { parallel: 3 });

      assert.deepEqual(docs.map(d => d.order), [1, 2, 3]);
    });
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

    const cursor = User.aggregate([{ $match: {} }]).cursor().exec();
    cursor.on('data', () => {});

    let closeEventTriggeredCount = 0;
    cursor.on('close', () => closeEventTriggeredCount++);


    setTimeout(() => {
      assert.equal(closeEventTriggeredCount, 1);
      done();
    }, 20);
  });

  it('passes document index as the second argument for query cursor (gh-8972)', function() {
    return co(function *() {
      const User = db.model('User', Schema({ order: Number }));

      yield User.create([{ order: 1 }, { order: 2 }, { order: 3 }]);


      const docsWithIndexes = [];

      yield User.find().sort('order').cursor().eachAsync((doc, i) => {
        docsWithIndexes.push({ order: doc.order, i: i });
      });

      const expected = [
        { order: 1, i: 0 },
        { order: 2, i: 1 },
        { order: 3, i: 2 }
      ];

      assert.deepEqual(docsWithIndexes, expected);
    });
  });

  it('passes document index as the second argument for aggregation cursor (gh-8972)', function() {
    return co(function *() {
      const User = db.model('User', Schema({ order: Number }));

      yield User.create([{ order: 1 }, { order: 2 }, { order: 3 }]);


      const docsWithIndexes = [];

      yield User.aggregate([{ $sort: { order: 1 } }]).cursor().exec().eachAsync((doc, i) => {
        docsWithIndexes.push({ order: doc.order, i: i });
      });

      const expected = [
        { order: 1, i: 0 },
        { order: 2, i: 1 },
        { order: 3, i: 2 }
      ];

      assert.deepEqual(docsWithIndexes, expected);
    });
  });

  it('post hooks (gh-9435)', function() {
    const schema = new mongoose.Schema({ name: String });
    schema.post('find', function(doc) {
      doc.name = doc.name.toUpperCase();
    });
    const Movie = db.model('Movie', schema);

    return co(function*() {
      yield Movie.deleteMany({});
      yield Movie.create([
        { name: 'Kickboxer' },
        { name: 'Ip Man' },
        { name: 'Enter the Dragon' }
      ]);

      const arr = [];
      yield Movie.find().sort({ name: -1 }).cursor().
        eachAsync(doc => arr.push(doc.name));
      assert.deepEqual(arr, ['KICKBOXER', 'IP MAN', 'ENTER THE DRAGON']);
    });
  });
});
