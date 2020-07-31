'use strict';

const assert = require('assert');
const start = require('../common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('transactions', function() {
  let db;
  let _skipped = false;

  before(function() {
    if (!process.env.REPLICA_SET) {
      _skipped = true;
      this.skip();
    }
    db = start({ replicaSet: process.env.REPLICA_SET });

    return db.
      then(() => {
        // Skip if not a repl set
        if (db.client.topology.constructor.name !== 'ReplSet' &&
            !db.client.topology.s.description.type.includes('ReplicaSet')) {
          _skipped = true;
          this.skip();

          throw new Error('skip');
        }
      }).
      then(() => new Promise((resolve, reject) => {
        start.mongodVersion(function(err, version) {
          if (err) {
            return reject(err);
          }
          resolve(version);
        });
      })).
      then(version => {
        if (version[0] < 4) {
          _skipped = true;
          this.skip();
        }
      }).
      catch(() => {
        _skipped = true;
        this.skip();
      });
  });

  it('basic example', async function() {
    const Customer = db.model('Customer', new Schema({ name: String }));

    // acquit:ignore:start
    await Customer.createCollection();
    // acquit:ignore:end
    
    const session = await db.startSession();
    session.startTransaction();

    // This `create()` is part of the transaction because of the `session`
    // option.
    await Customer.create([{ name: 'Test' }], { session: session });

    // Transactions execute in isolation, so unless you pass a `session`
    // to `findOne()` you won't see the document until the transaction
    // is committed.
    let doc = await Customer.findOne({ name: 'Test' });
    assert.ok(!doc);

    // This `findOne()` will return the doc, because passing the `session`
    // means this `findOne()` will run as part of the transaction.
    doc = await Customer.findOne({ name: 'Test' }).session(session);
    assert.ok(doc);

    // Once the transaction is committed, the write operation becomes
    // visible outside of the transaction.
    await session.commitTransaction();
    doc = await Customer.findOne({ name: 'Test' });
    assert.ok(doc);

    session.endSession();
  });

  it('withTransaction', async function() {
    // acquit:ignore:start
    const Customer = db.model('Customer_withTrans', new Schema({ name: String }));
    await Customer.createCollection();
    // acquit:ignore:end

    const session = await Customer.startSession();

    // The `withTransaction()` function's first parameter is a function
    // that returns a promise.
    await session.withTransaction(() => {
      return Customer.create([{ name: 'Test' }], { session: session })
    });

    const count = await Customer.countDocuments();
    assert.strictEqual(count, 1);

    session.endSession();
  });

  it('abort', async function() {
    // acquit:ignore:start
    const Customer = db.model('Customer0', new Schema({ name: String }));
    await Customer.createCollection();
    // acquit:ignore:end
    const session = await Customer.startSession();
    session.startTransaction();

    await Customer.create([{ name: 'Test' }], { session: session });
    await Customer.create([{ name: 'Test2' }], { session: session });

    await session.abortTransaction();

    const count = await Customer.countDocuments();
    assert.strictEqual(count, 0);

    session.endSession();
  });

  it('save', async function() {
    const User = db.model('User', new Schema({ name: String }));
    // acquit:ignore:start
    await User.createCollection();
    // acquit:ignore:end
    const session = await db.startSession();
    session.startTransaction();

    await User.create({ name: 'foo' });

    const user = await User.findOne({ name: 'foo' }).session(session);
    // Getter/setter for the session associated with this document.
    assert.ok(user.$session());
    user.name = 'bar';
    // By default, `save()` uses the associated session
    await user.save();

    // Won't find the doc because `save()` is part of an uncommitted transaction
    let doc = await User.findOne({ name: 'bar' });
    assert.ok(!doc);

    await session.commitTransaction();
    session.endSession();

    doc = await User.findOne({ name: 'bar' });
    assert.ok(doc);
  });

  it('create (gh-6909)', async function() {
    // acquit:ignore:start
    const User = db.model('gh6909_User', new Schema({ name: String }));
    await User.createCollection();
    // acquit:ignore:end
    const session = await db.startSession();
    session.startTransaction();

    const users = await User.create([{ name: 'foo' }], { session: session });
    users[0].name = 'bar';
    await users[0].save();

    const user = await User.findOne({ name: 'bar' });
    assert.ok(!user);

    await session.commitTransaction();
    session.endSession();
  });

  it('aggregate', async function() {
    const Event = db.model('Event', new Schema({ createdAt: Date }), 'Event');
    // acquit:ignore:start
    await Event.createCollection();
    // acquit:ignore:end
    const session = await db.startSession();
    session.startTransaction();

    await Event.insertMany([
      { createdAt: new Date('2018-06-01') },
      { createdAt: new Date('2018-06-02') },
      { createdAt: new Date('2017-06-01') },
      { createdAt: new Date('2017-05-31') }
    ], { session: session });

    const res = await Event.aggregate([
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1, '_id.year': -1, '_id.month': -1 } }
    ]).session(session);

    assert.deepEqual(res, [
      { _id: { month: 6, year: 2018 }, count: 2 },
      { _id: { month: 6, year: 2017 }, count: 1 },
      { _id: { month: 5, year: 2017 }, count: 1 }
    ]);

    await session.commitTransaction();
    session.endSession();
  });

  describe('populate (gh-6754)', function() {
    let Author;
    let Article;
    let session;

    before(function() {
      if (_skipped) {
        this.skip();
        return; // https://github.com/mochajs/mocha/issues/2546
      }

      Author = db.model('Author', new Schema({ name: String }), 'Author');
      Article = db.model('Article', new Schema({
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Author'
        }
      }), 'Article');

      return Author.createCollection().
        then(() => Article.createCollection());
    });

    beforeEach(function() {
      return Author.deleteMany({}).
        then(() => Article.deleteMany({})).
        then(() => db.startSession()).
        then(_session => {
          session = _session;
          session.startTransaction();
        });
    });

    afterEach(async function() {
      await session.commitTransaction();
      session.endSession();
    });

    it('`populate()` uses the querys session', async function() {
      const authors = await Author.create([{ name: 'Val' }], { session: session });
      const articles = await Article.create([{ author: authors[0]._id }], { session: session });

      const article = await Article.
        findById(articles[0]._id).
        session(session).
        populate('author');
      assert.equal(article.author.name, 'Val');
    });

    it('can override `populate()` session', async function() {
      const authors = await Author.create([{ name: 'Val' }], { session: session });
      // Article created _outside_ the transaction
      const articles = await Article.create([{ author: authors[0]._id }]);
      const article = await Article.
        findById(articles[0]._id).
        populate({ path: 'author', options: { session: session } });

      assert.equal(article.author.name, 'Val');
    });

    it('`execPopulate()` uses the documents `$session()` by default', async function() {
      const authors = await Author.create([{ name: 'Val' }], { session: session });
      const articles = await Article.create([{ author: authors[0]._id }], { session: session });

      // By default, the populate query should use the associated `$session()`
      const article = await Article.findById(articles[0]._id).session(session);

      assert.ok(article.$session());
      await article.populate('author').execPopulate();

      assert.equal(article.author.name, 'Val');
    });

    it('`execPopulate()` supports overwriting the session', async function() {
      const authors = await Author.create([{ name: 'Val' }], { session: session });
      await Article.create([{ author: authors[0]._id }], { session: session });

      const article = await Article.findOne().session(session);

      await article.
        populate({ path: 'author', options: { session: null } }).
        execPopulate();
      assert.ok(!article.author);
    });
  });

  it('deleteOne and deleteMany (gh-7857)(gh-6805)', async function() {
    const Character = db.model('Character', new Schema({ name: String }), 'Character');
    // acquit:ignore:start
    await Character.createCollection();
    // acquit:ignore:end
    const session = await db.startSession();
    session.startTransaction();

    await Character.insertMany([
      { name: 'Tyrion Lannister' },
      { name: 'Cersei Lannister' },
      { name: 'Jon Snow' },
      { name: 'Daenerys Targaryen' }
    ], { session: session });

    await Character.deleteMany({ name: /Lannister/ }, { session: session });
    await Character.deleteOne({ name: 'Jon Snow' }, { session: session });

    const res = await Character.find({}).session(session);
    assert.equal(res.length, 1);
    
    await session.commitTransaction();
    session.endSession();
  });

  it('remove, update, updateOne (gh-7455)', async function() {
    const Character = db.model('gh7455_Character', new Schema({ name: String, title: String }, { versionKey: false }));

    await Character.create({ name: 'Tyrion Lannister' });

    const session = await db.startSession();
    session.startTransaction();

    const tyrion = await Character.findOne().session(session);
    await tyrion.updateOne({ title: 'Hand of the King' });

    // Session isn't committed
    assert.equal(await Character.countDocuments({ title: /hand/i }), 0);

    await tyrion.remove();

    // Undo both update and delete since doc should pull from `$session()`
    await session.abortTransaction();
    session.endSession();

    const fromDb = await Character.findOne().then(doc => doc.toObject());
    assert.deepEqual(fromDb.name, 'Tyrion Lannister');
  });

  it('save() with no changes (gh-8571)', async function() {
    const Test = db.model('Test', Schema({ name: String }));

    await Test.createCollection();
    const session = await db.startSession();
    await session.withTransaction(async () => {
      const test = await Test.create([{}], { session }).then(res => res[0]);
      await test.save(); // throws DocumentNotFoundError
    });
    session.endSession();
  });

  it('correct `isNew` after abort (gh-8852)', async function() {
    const schema = Schema({ name: String });

    const Test = db.model('gh8852', schema);

    await Test.createCollection();
    const doc = new Test({ name: 'foo' });
    await db.
      transaction(async (session) =>  {
        await doc.save({ session });
        assert.ok(!doc.isNew);
        throw new Error('Oops');
      }).
      catch(err => assert.equal(err.message, 'Oops'));
    assert.ok(doc.isNew);
  });

  it('can save document after aborted transaction (gh-8380)', async function() {
    const schema = Schema({ name: String, arr: [String], arr2: [String] });

    const Test = db.model('gh8380', schema);

    await Test.createCollection();
    await Test.create({ name: 'foo', arr: ['bar'], arr2: ['foo'] });
    const doc = await Test.findOne();
    await db.
      transaction(async (session) => {
        doc.arr.pull('bar');
        doc.arr2.push('bar');

        await doc.save({ session });
        doc.name = 'baz';
        throw new Error('Oops');
      }).
      catch(err => {
        assert.equal(err.message, 'Oops');
      });

    const changes = doc.$__delta()[1];
    assert.equal(changes.$set.name, 'baz');
    assert.deepEqual(changes.$pullAll.arr, ['bar']);
    assert.deepEqual(changes.$push.arr2, { $each: ['bar'] });
    assert.ok(!changes.$set.arr2);

    await doc.save({ session: null });

    const newDoc = await Test.collection.findOne();
    assert.equal(newDoc.name, 'baz');
    assert.deepEqual(newDoc.arr, []);
    assert.deepEqual(newDoc.arr2, ['foo', 'bar']);
  });
});
