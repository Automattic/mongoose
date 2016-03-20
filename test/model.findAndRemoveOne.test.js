
/**
 * Test dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    random = require('../lib/utils').random,
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    DocumentObjectId = mongoose.Types.ObjectId;

/**
 * Setup.
 */

var Comments = new Schema;

Comments.add({
  title: String,
  date: Date,
  body: String,
  comments: [Comments]
});

var BlogPost = new Schema({
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
    var split = val.split(' by ');
    this.set('title', split[0]);
    this.set('author', split[1]);
  });

BlogPost.method('cool', function() {
  return this;
});

BlogPost.static('woot', function() {
  return this;
});

var modelname = 'RemoveOneBlogPost';
mongoose.model(modelname, BlogPost);

var collection = 'removeoneblogposts_' + random();

var strictSchema = new Schema({name: String}, {strict: true});
mongoose.model('RemoveOneStrictSchema', strictSchema);

describe('model: findOneAndRemove:', function() {
  it('returns the original document', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        title = 'remove muah';

    var post = new M({title: title});
    post.save(function(err) {
      assert.ifError(err);
      M.findOneAndRemove({title: title}, function(err, doc) {
        assert.ifError(err);
        assert.equal(doc.id, post.id);
        M.findById(post.id, function(err, gone) {
          db.close();
          assert.ifError(err);
          assert.equal(null, gone);
          done();
        });
      });
    });
  });

  it('options/conditions/doc are merged when no callback is passed', function(done) {
    var db = start(),
        M = db.model(modelname, collection);

    db.close();

    var now = new Date,
        query;

    // Model.findOneAndRemove
    query = M.findOneAndRemove({author: 'aaron'}, {select: 'author'});
    assert.equal(1, query._fields.author);
    assert.equal('aaron', query._conditions.author);

    query = M.findOneAndRemove({author: 'aaron'});
    assert.equal(undefined, query._fields);
    assert.equal('aaron', query._conditions.author);

    query = M.findOneAndRemove();
    assert.equal(undefined, query.options.new);
    assert.equal(undefined, query._fields);
    assert.equal(undefined, query._conditions.author);

    // Query.findOneAndRemove
    query = M.where('author', 'aaron').findOneAndRemove({date: now});
    assert.equal(undefined, query._fields);
    assert.equal(now, query._conditions.date);
    assert.equal('aaron', query._conditions.author);

    query = M.find().findOneAndRemove({author: 'aaron'}, {select: 'author'});
    assert.equal(1, query._fields.author);
    assert.equal('aaron', query._conditions.author);

    query = M.find().findOneAndRemove();
    assert.equal(undefined, query._fields);
    assert.equal(undefined, query._conditions.author);
    done();
  });

  it('executes when a callback is passed', function(done) {
    var db = start(),
        M = db.model(modelname, collection + random()),
        pending = 5;

    M.findOneAndRemove({name: 'aaron1'}, {select: 'name'}, cb);
    M.findOneAndRemove({name: 'aaron1'}, cb);
    M.where().findOneAndRemove({name: 'aaron1'}, {select: 'name'}, cb);
    M.where().findOneAndRemove({name: 'aaron1'}, cb);
    M.where('name', 'aaron1').findOneAndRemove(cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.equal(null, doc); // no previously existing doc
      if (--pending) return;
      db.close();
      done();
    }
  });

  it('executed with only a callback throws', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        err;

    try {
      M.findOneAndRemove(function() {});
    } catch (e) {
      err = e;
    }

    db.close();
    assert.ok(/First argument must not be a function/.test(err));
    done();
  });
});

describe('model: findByIdAndRemove:', function() {
  it('executed with only a callback throws', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        err;

    try {
      M.findByIdAndRemove(function() {});
    } catch (e) {
      err = e;
    }

    db.close();
    assert.ok(/First argument must not be a function/.test(err));
    done();
  });

  it('executes when a callback is passed', function(done) {
    var db = start(),
        M = db.model(modelname, collection + random()),
        _id = new DocumentObjectId,
        pending = 2;

    M.findByIdAndRemove(_id, {select: 'name'}, cb);
    M.findByIdAndRemove(_id, cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.equal(null, doc); // no previously existing doc
      if (--pending) return;
      db.close();
      done();
    }
  });

  it('returns the original document', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        title = 'remove muah pleez';

    var post = new M({title: title});
    post.save(function(err) {
      assert.ifError(err);
      M.findByIdAndRemove(post.id, function(err, doc) {
        assert.ifError(err);
        assert.equal(doc.id, post.id);
        M.findById(post.id, function(err, gone) {
          db.close();
          assert.ifError(err);
          assert.equal(null, gone);
          done();
        });
      });
    });
  });

  it('options/conditions/doc are merged when no callback is passed', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        _id = new DocumentObjectId;

    db.close();

    var query;

    // Model.findByIdAndRemove
    query = M.findByIdAndRemove(_id, {select: 'author'});
    assert.equal(1, query._fields.author);
    assert.equal(_id.toString(), query._conditions._id.toString());

    query = M.findByIdAndRemove(_id.toString());
    assert.equal(undefined, query._fields);
    assert.equal(_id.toString(), query._conditions._id);

    query = M.findByIdAndRemove();
    assert.equal(undefined, query.options.new);
    assert.equal(undefined, query._fields);
    assert.equal(undefined, query._conditions._id);
    done();
  });

  it('supports v3 select string syntax', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        _id = new DocumentObjectId;

    db.close();

    var query;

    query = M.findByIdAndRemove(_id, {select: 'author -title'});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndRemove({}, {select: 'author -title'});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
    done();
  });

  it('supports v3 select object syntax', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        _id = new DocumentObjectId;

    db.close();

    var query;

    query = M.findByIdAndRemove(_id, {select: {author: 1, title: 0}});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndRemove({}, {select: {author: 1, title: 0}});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
    done();
  });

  it('supports v3 sort string syntax', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        _id = new DocumentObjectId;

    db.close();

    var query;

    query = M.findByIdAndRemove(_id, {sort: 'author -title'});
    assert.equal(2, Object.keys(query.options.sort).length);
    assert.equal(1, query.options.sort.author);
    assert.equal(-1, query.options.sort.title);

    query = M.findOneAndRemove({}, {sort: 'author -title'});
    assert.equal(2, Object.keys(query.options.sort).length);
    assert.equal(1, query.options.sort.author);
    assert.equal(-1, query.options.sort.title);
    done();
  });

  it('supports v3 sort object syntax', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        _id = new DocumentObjectId;

    var query;

    query = M.findByIdAndRemove(_id, {sort: {author: 1, title: -1}});
    assert.equal(2, Object.keys(query.options.sort).length);
    assert.equal(1, query.options.sort.author);
    assert.equal(-1, query.options.sort.title);

    query = M.findOneAndRemove(_id, {sort: {author: 1, title: -1}});
    assert.equal(2, Object.keys(query.options.sort).length);
    assert.equal(1, query.options.sort.author);
    assert.equal(-1, query.options.sort.title);
    db.close(done);
  });

  it('supports population (gh-1395)', function(done) {
    var db = start();
    var M = db.model('A', {name: String});
    var N = db.model('B', {a: {type: Schema.ObjectId, ref: 'A'}, i: Number});

    M.create({name: 'i am an A'}, function(err, a) {
      if (err) return done(err);
      N.create({a: a._id, i: 10}, function(err, b) {
        if (err) return done(err);

        N.findOneAndRemove({_id: b._id}, {select: 'a -_id'})
        .populate('a')
        .exec(function(err, doc) {
          if (err) return done(err);
          assert.ok(doc);
          assert.equal(undefined, doc._id);
          assert.ok(doc.a);
          assert.equal(doc.a.name, 'i am an A');
          db.close(done);
        });
      });
    });
  });

  describe('middleware', function() {
    var db;

    beforeEach(function() {
      db = start();
    });

    afterEach(function(done) {
      db.close(done);
    });

    it('works', function(done) {
      var s = new Schema({
        topping: {type: String, default: 'bacon'},
        base: String
      });

      var preCount = 0;
      s.pre('findOneAndRemove', function() {
        ++preCount;
      });

      var postCount = 0;
      s.post('findOneAndRemove', function() {
        ++postCount;
      });

      var Breakfast = db.model('gh-439', s);
      var breakfast = new Breakfast({
        base: 'eggs'
      });

      breakfast.save(function(error) {
        assert.ifError(error);

        Breakfast.findOneAndRemove(
          {base: 'eggs'},
          {},
          function(error, breakfast) {
            assert.ifError(error);
            assert.equal('eggs', breakfast.base);
            assert.equal(1, preCount);
            assert.equal(1, postCount);
            done();
          });
      });
    });

    it('works with exec()', function(done) {
      var s = new Schema({
        topping: {type: String, default: 'bacon'},
        base: String
      });

      var preCount = 0;
      s.pre('findOneAndRemove', function() {
        ++preCount;
      });

      var postCount = 0;
      s.post('findOneAndRemove', function() {
        ++postCount;
      });

      var Breakfast = db.model('gh-439', s);
      var breakfast = new Breakfast({
        base: 'eggs'
      });

      breakfast.save(function(error) {
        assert.ifError(error);

        Breakfast.
          findOneAndRemove({base: 'eggs'}, {}).
          exec(function(error, breakfast) {
            assert.ifError(error);
            assert.equal('eggs', breakfast.base);
            assert.equal(1, preCount);
            assert.equal(1, postCount);
            done();
          });
      });
    });
  });
});
