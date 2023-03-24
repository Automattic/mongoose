'use strict';

const assert = require('assert');
const start = require('../common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('transactions', function() {
  let db;
  let _skipped = false;
  this.timeout(10000);

  before(async function() {
    if (!process.env.REPLICA_SET) {
      _skipped = true;
      this.skip();
    }
    db = start({ replicaSet: process.env.REPLICA_SET });
    try {
      await db.asPromise();

      // Skip if not a repl set
      if (db.client.topology.constructor.name !== 'ReplSet' &&
      !db.client.topology.s.description.type.includes('ReplicaSet')) {
        _skipped = true;
        this.skip();

        throw new Error('skip');
      }

      const version = await start.mongodVersion();

      if (version[0] < 4) {
        _skipped = true;
        this.skip();
      }
    } catch (err) {
      _skipped = true;
      this.skip();
    }
  });

  it('basic example', function() {
    const Customer = db.model('Customer', new Schema({ name: String }));

    let session = null;
    return Customer.createCollection().
      then(() => db.startSession()).
      then(_session => {
        session = _session;
        // Start a transaction
        session.startTransaction();
        // This `create()` is part of the transaction because of the `session`
        // option.
        return Customer.create([{ name: 'Test' }], { session: session });
      }).
      // Transactions execute in isolation, so unless you pass a `session`
      // to `findOne()` you won't see the document until the transaction
      // is committed.
      then(() => Customer.findOne({ name: 'Test' })).
      then(doc => assert.ok(!doc)).
      // This `findOne()` will return the doc, because passing the `session`
      // means this `findOne()` will run as part of the transaction.
      then(() => Customer.findOne({ name: 'Test' }).session(session)).
      then(doc => assert.ok(doc)).
      // Once the transaction is committed, the write operation becomes
      // visible outside of the transaction.
      then(() => session.commitTransaction()).
      then(() => Customer.findOne({ name: 'Test' })).
      then(doc => assert.ok(doc)).
      then(() => session.endSession());
  });

  it('withTransaction', function() {
    // acquit:ignore:start
    const Customer = db.model('Customer_withTrans', new Schema({ name: String }));
    // acquit:ignore:end
    let session = null;
    return Customer.createCollection().
      then(() => Customer.startSession()).
      // The `withTransaction()` function's first parameter is a function
      // that returns a promise.
      then(_session => {
        session = _session;
        return session.withTransaction(() => {
          return Customer.create([{ name: 'Test' }], { session: session });
        });
      }).
      then(() => Customer.countDocuments()).
      then(count => assert.strictEqual(count, 1)).
      then(() => session.endSession());
  });

  it('abort', function() {
    // acquit:ignore:start
    const Customer = db.model('Customer0', new Schema({ name: String }));
    // acquit:ignore:end
    let session = null;
    return Customer.createCollection().
      then(() => Customer.startSession()).
      then(_session => {
        session = _session;
        session.startTransaction();
        return Customer.create([{ name: 'Test' }], { session: session });
      }).
      then(() => Customer.create([{ name: 'Test2' }], { session: session })).
      then(() => session.abortTransaction()).
      then(() => Customer.countDocuments()).
      then(count => assert.strictEqual(count, 0)).
      then(() => session.endSession());
  });

  it('save', function() {
    const User = db.model('User', new Schema({ name: String }));

    let session = null;
    return User.createCollection().
      then(() => db.startSession()).
      then(_session => {
        session = _session;
        return User.create({ name: 'foo' });
      }).
      then(() => {
        session.startTransaction();
        return User.findOne({ name: 'foo' }).session(session);
      }).
      then(user => {
        // Getter/setter for the session associated with this document.
        assert.ok(user.$session());
        user.name = 'bar';
        // By default, `save()` uses the associated session
        return user.save();
      }).
      then(() => User.findOne({ name: 'bar' })).
      // Won't find the doc because `save()` is part of an uncommitted transaction
      then(doc => assert.ok(!doc)).
      then(() => session.commitTransaction()).
      then(() => session.endSession()).
      then(() => User.findOne({ name: 'bar' })).
      then(doc => assert.ok(doc));
  });

  it('create (gh-6909)', function() {
    const User = db.model('gh6909_User', new Schema({ name: String }));

    let session = null;
    return User.createCollection().
      then(() => db.startSession()).
      then(_session => {
        session = _session;
        session.startTransaction();
        return User.create([{ name: 'foo' }], { session: session });
      }).
      then(users => {
        users[0].name = 'bar';
        return users[0].save();
      }).
      then(() => User.findOne({ name: 'bar' })).
      then(user => {
        // Not in transaction, shouldn't find it
        assert.ok(!user);

        session.commitTransaction();
      });
  });

  it('aggregate', function() {
    const Event = db.model('Event', new Schema({ createdAt: Date }), 'Event');

    let session = null;
    return Event.createCollection().
      then(() => db.startSession()).
      then(_session => {
        session = _session;
        session.startTransaction();
        return Event.insertMany([
          { createdAt: new Date('2018-06-01') },
          { createdAt: new Date('2018-06-02') },
          { createdAt: new Date('2017-06-01') },
          { createdAt: new Date('2017-05-31') }
        ], { session: session });
      }).
      then(() => Event.aggregate([
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
      ]).session(session)).
      then(res => assert.deepEqual(res, [
        { _id: { month: 6, year: 2018 }, count: 2 },
        { _id: { month: 6, year: 2017 }, count: 1 },
        { _id: { month: 5, year: 2017 }, count: 1 }
      ])).
      then(() => session.commitTransaction()).
      then(() => session.endSession());
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
          return session.startTransaction();
        });
    });

    afterEach(async function() {
      await session.commitTransaction();
      return session.endSession();
    });

    it('`populate()` uses the querys session', function() {
      return Author.create([{ name: 'Val' }], { session: session }).
        then(authors => Article.create([{ author: authors[0]._id }], { session: session })).
        then(articles => {
          return Article.
            findById(articles[0]._id).
            session(session).
            populate('author');
        }).
        then(article => assert.equal(article.author.name, 'Val'));
    });

    it('can override `populate()` session', function() {
      return Author.create([{ name: 'Val' }], { session: session }).
        // Article created _outside_ the transaction
        then(authors => Article.create([{ author: authors[0]._id }])).
        then(articles => {
          return Article.
            findById(articles[0]._id).
            populate({ path: 'author', options: { session: session } });
        }).
        then(article => assert.equal(article.author.name, 'Val'));
    });

    it('`Document#populate()` uses the documents `$session()` by default', function() {
      return Author.create([{ name: 'Val' }], { session: session }).
        then(authors => Article.create([{ author: authors[0]._id }], { session: session })).
        // By default, the populate query should use the associated `$session()`
        then(articles => Article.findById(articles[0]._id).session(session)).
        then(article => {
          assert.ok(article.$session());
          return article.populate('author');
        }).
        then(article => assert.equal(article.author.name, 'Val'));
    });

    it('`Document#populate()` supports overwriting the session', function() {
      return Author.create([{ name: 'Val' }], { session: session }).
        then(authors => Article.create([{ author: authors[0]._id }], { session: session })).
        then(() => Article.findOne().session(session)).
        then(article => {
          return article.
            populate({ path: 'author', options: { session: null } });
        }).
        then(article => assert.ok(!article.author));
    });
  });

  it('deleteOne and deleteMany (gh-7857)(gh-6805)', function() {
    const Character = db.model('Character', new Schema({ name: String }), 'Character');

    let session = null;
    return Character.createCollection().
      then(() => db.startSession()).
      then(_session => {
        session = _session;
        session.startTransaction();
        return Character.insertMany([
          { name: 'Tyrion Lannister' },
          { name: 'Cersei Lannister' },
          { name: 'Jon Snow' },
          { name: 'Daenerys Targaryen' }
        ], { session: session });
      }).
      then(() => Character.deleteMany({ name: /Lannister/ }, { session: session })).
      then(() => Character.deleteOne({ name: 'Jon Snow' }, { session: session })).
      then(() => Character.find({}).session(session)).
      then(res => assert.equal(res.length, 1)).
      then(() => session.commitTransaction()).
      then(() => session.endSession());
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
    delete fromDb._id;
    assert.deepEqual(fromDb, { name: 'Tyrion Lannister' });
  });

  it('save() with no changes (gh-8571)', async function() {
    const Test = db.model('Test', Schema({ name: String }));

    await Test.createCollection();
    const session = await db.startSession();
    await session.withTransaction(async() => {
      const test = await Test.create([{}], { session }).then(res => res[0]);
      await test.save(); // throws DocumentNotFoundError
    });
    await session.endSession();
  });
});
