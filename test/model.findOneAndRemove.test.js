'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const co = require('co');
const random = require('../lib/utils').random;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;

describe('model: findOneAndRemove:', function() {
  let Comments;
  let BlogPost;
  let modelname;
  let collection;
  let strictSchema;
  let db;

  before(function() {
    Comments = new Schema;

    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    BlogPost = new Schema({
      title: String,
      author: String,
      slug: String,
      date: Date,
      meta: {
        date: Date,
        visitors: Number
      },
      published: Boolean,
      mixed: {},
      numbers: [Number],
      owners: [ObjectId],
      comments: [Comments]
    });

    BlogPost.virtual('titleWithAuthor')
      .get(function() {
        return this.get('title') + ' by ' + this.get('author');
      })
      .set(function(val) {
        const split = val.split(' by ');
        this.set('title', split[0]);
        this.set('author', split[1]);
      });

    BlogPost.method('cool', function() {
      return this;
    });

    BlogPost.static('woot', function() {
      return this;
    });

    modelname = 'RemoveOneBlogPost';
    mongoose.model(modelname, BlogPost);

    collection = 'removeoneblogposts_' + random();

    strictSchema = new Schema({name: String}, {strict: true});
    mongoose.model('RemoveOneStrictSchema', strictSchema);

    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  it('returns the original document', function() {
    const M = db.model(modelname, collection);
    const title = 'remove muah';

    const post = new M({title: title});

    return co(function*() {
      yield post.save();

      const doc = yield M.findOneAndRemove({title: title});

      assert.equal(post.id, doc.id);

      const gone = yield M.findById(post.id);
      assert.equal(gone, null);
    });
  });

  it('options/conditions/doc are merged when no callback is passed', function(done) {
    const M = db.model(modelname, collection);

    const now = new Date;
    let query;

    // Model.findOneAndRemove
    query = M.findOneAndRemove({author: 'aaron'}, {select: 'author'});
    assert.equal(query._fields.author, 1);
    assert.equal(query._conditions.author, 'aaron');

    query = M.findOneAndRemove({author: 'aaron'});
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions.author, 'aaron');

    query = M.findOneAndRemove();
    assert.equal(query.options.new, undefined);
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions.author, undefined);

    // Query.findOneAndRemove
    query = M.where('author', 'aaron').findOneAndRemove({date: now});
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions.date, now);
    assert.equal(query._conditions.author, 'aaron');

    query = M.find().findOneAndRemove({author: 'aaron'}, {select: 'author'});
    assert.equal(query._fields.author, 1);
    assert.equal(query._conditions.author, 'aaron');

    query = M.find().findOneAndRemove();
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions.author, undefined);
    done();
  });

  it('executes when a callback is passed', function(done) {
    const M = db.model(modelname, collection + random());
    let pending = 5;

    M.findOneAndRemove({name: 'aaron1'}, {select: 'name'}, cb);
    M.findOneAndRemove({name: 'aaron1'}, cb);
    M.where().findOneAndRemove({name: 'aaron1'}, {select: 'name'}, cb);
    M.where().findOneAndRemove({name: 'aaron1'}, cb);
    M.where('name', 'aaron1').findOneAndRemove(cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.equal(doc, null); // no previously existing doc
      if (--pending) return;
      done();
    }
  });

  it('executed with only a callback throws', function(done) {
    const M = db.model(modelname, collection);
    let err;

    try {
      M.findOneAndRemove(function() {});
    } catch (e) {
      err = e;
    }

    assert.ok(/First argument must not be a function/.test(err));
    done();
  });

  it('executed with only a callback throws', function(done) {
    const M = db.model(modelname, collection);
    let err;

    try {
      M.findByIdAndRemove(function() {});
    } catch (e) {
      err = e;
    }

    assert.ok(/First argument must not be a function/.test(err));
    done();
  });

  it('executes when a callback is passed', function(done) {
    const M = db.model(modelname, collection + random());
    const _id = new DocumentObjectId;
    let pending = 2;

    M.findByIdAndRemove(_id, {select: 'name'}, cb);
    M.findByIdAndRemove(_id, cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.equal(doc, null); // no previously existing doc
      if (--pending) return;
      done();
    }
  });

  it('returns the original document', function(done) {
    const M = db.model(modelname, collection);
    const title = 'remove muah pleez';

    const post = new M({title: title});
    post.save(function(err) {
      assert.ifError(err);
      M.findByIdAndRemove(post.id, function(err, doc) {
        assert.ifError(err);
        assert.equal(post.id, doc.id);
        M.findById(post.id, function(err, gone) {
          assert.ifError(err);
          assert.equal(gone, null);
          done();
        });
      });
    });
  });

  it('options/conditions/doc are merged when no callback is passed', function(done) {
    const M = db.model(modelname, collection);
    const _id = new DocumentObjectId;

    let query;

    // Model.findByIdAndRemove
    query = M.findByIdAndRemove(_id, {select: 'author'});
    assert.equal(query._fields.author, 1);
    assert.equal(query._conditions._id.toString(), _id.toString());

    query = M.findByIdAndRemove(_id.toString());
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions._id, _id.toString());

    query = M.findByIdAndRemove();
    assert.equal(query.options.new, undefined);
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions._id, undefined);
    done();
  });

  it('supports v3 select string syntax', function(done) {
    const M = db.model(modelname, collection);
    const _id = new DocumentObjectId;

    let query;

    query = M.findByIdAndRemove(_id, {select: 'author -title'});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndRemove({}, {select: 'author -title'});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
    done();
  });

  it('supports v3 select object syntax', function(done) {
    const M = db.model(modelname, collection);
    const _id = new DocumentObjectId;

    let query;

    query = M.findByIdAndRemove(_id, {select: {author: 1, title: 0}});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndRemove({}, {select: {author: 1, title: 0}});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
    done();
  });

  it('supports v3 sort string syntax', function(done) {
    const M = db.model(modelname, collection);
    const _id = new DocumentObjectId;

    let query;

    query = M.findByIdAndRemove(_id, {sort: 'author -title'});
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);

    query = M.findOneAndRemove({}, {sort: 'author -title'});
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);
    done();
  });

  it('supports v3 sort object syntax', function(done) {
    const M = db.model(modelname, collection);
    const _id = new DocumentObjectId;

    let query;

    query = M.findByIdAndRemove(_id, {sort: {author: 1, title: -1}});
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);

    query = M.findOneAndRemove(_id, {sort: {author: 1, title: -1}});
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);
    done();
  });

  it('supports population (gh-1395)', function(done) {
    const M = db.model('A', {name: String});
    const N = db.model('B', {a: {type: Schema.ObjectId, ref: 'A'}, i: Number});

    M.create({name: 'i am an A'}, function(err, a) {
      if (err) return done(err);
      N.create({a: a._id, i: 10}, function(err, b) {
        if (err) return done(err);

        N.findOneAndRemove({_id: b._id}, {select: 'a -_id'})
          .populate('a')
          .exec(function(err, doc) {
            if (err) return done(err);
            assert.ok(doc);
            assert.equal(doc._id, undefined);
            assert.ok(doc.a);
            assert.equal('i am an A', doc.a.name);
            done();
          });
      });
    });
  });

  it('only calls setters once (gh-6203)', function() {
    return co(function*() {
      const calls = [];
      const userSchema = new mongoose.Schema({
        name: String,
        foo: {
          type: String,
          set: function(val) {
            calls.push(val);
            return val + val;
          }
        }
      });
      const Model = db.model('gh6203', userSchema);

      yield Model.findOneAndRemove({ foo: '123' }, { name: 'bar' });

      assert.deepEqual(calls, ['123']);
    });
  });

  describe('middleware', function() {
    it('works', function(done) {
      const s = new Schema({
        topping: {type: String, default: 'bacon'},
        base: String
      });

      let preCount = 0;
      s.pre('findOneAndRemove', function() {
        ++preCount;
      });

      let postCount = 0;
      s.post('findOneAndRemove', function() {
        ++postCount;
      });

      const Breakfast = db.model('gh-439', s);
      const breakfast = new Breakfast({
        base: 'eggs'
      });

      breakfast.save(function(error) {
        assert.ifError(error);

        Breakfast.findOneAndRemove(
          {base: 'eggs'},
          {},
          function(error, breakfast) {
            assert.ifError(error);
            assert.equal(breakfast.base, 'eggs');
            assert.equal(preCount, 1);
            assert.equal(postCount, 1);
            done();
          });
      });
    });

    it('works with exec() (gh-439)', function(done) {
      const s = new Schema({
        topping: {type: String, default: 'bacon'},
        base: String
      });

      let preCount = 0;
      s.pre('findOneAndRemove', function() {
        ++preCount;
      });

      let postCount = 0;
      s.post('findOneAndRemove', function() {
        ++postCount;
      });

      const Breakfast = db.model('Breakfast', s);
      const breakfast = new Breakfast({
        base: 'eggs'
      });

      breakfast.save(function(error) {
        assert.ifError(error);

        Breakfast.
          findOneAndRemove({base: 'eggs'}, {}).
          exec(function(error, breakfast) {
            assert.ifError(error);
            assert.equal(breakfast.base, 'eggs');
            assert.equal(preCount, 1);
            assert.equal(postCount, 1);
            done();
          });
      });
    });
  });
});
