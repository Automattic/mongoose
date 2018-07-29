'use strict';

const assert = require('assert');
const start = require('../common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('transactions', function() {
  let db;
  let _skipped = false;

  before(function() {
    db = start({ replicaSet: 'rs' });

    return db.
      then(() => {
        // Skip if not a repl set
        if (db.client.topology.constructor.name !== 'ReplSet') {
          _skipped = true;
          this.skip();
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

  it('basic example', function() {
    const Customer = db.model('Customer', new Schema({ name: String }));

    let session = null;
    return db.createCollection('customers').
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
      then(doc => assert.ok(doc));
  });

  it('save', function() {
    const User = db.model('User', new Schema({ name: String }));

    let session = null;
    return db.createCollection('users').
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
      then(() => {
        session.commitTransaction();
        return User.findOne({ name: 'bar' });
      }).
      then(doc => assert.ok(doc));
  });

  it('aggregate', function() {
    const Event = db.model('Event', new Schema({ createdAt: Date }), 'Event');

    let session = null;
    return db.createCollection('Event').
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
      then(res => {
        assert.deepEqual(res, [
          { _id: { month: 6, year: 2018 }, count: 2 },
          { _id: { month: 6, year: 2017 }, count: 1 },
          { _id: { month: 5, year: 2017 }, count: 1 }
        ]);
        session.commitTransaction();
      });
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

      return db.createCollection('Author').
        then(() => db.createCollection('Article'));
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

    afterEach(function(done) {
      session.commitTransaction();
      done();
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

    it('`execPopulate()` uses the documents `$session()` by default', function() {
      return Author.create([{ name: 'Val' }], { session: session }).
        then(authors => Article.create([{ author: authors[0]._id }], { session: session })).
        // By default, the populate query should use the associated `$session()`
        then(articles => Article.findById(articles[0]._id).session(session)).
        then(article => {
          assert.ok(article.$session());
          return article.populate('author').execPopulate();
        }).
        then(article => assert.equal(article.author.name, 'Val'));
    });

    it('`execPopulate()` supports overwriting the session', function() {
      return Author.create([{ name: 'Val' }], { session: session }).
        then(authors => Article.create([{ author: authors[0]._id }], { session: session })).
        then(() => Article.findOne().session(session)).
        then(article => {
          return article.
            populate({ path: 'author', options: { session: null } }).
            execPopulate();
        }).
        then(article => assert.ok(!article.author));
    });
  });
});
