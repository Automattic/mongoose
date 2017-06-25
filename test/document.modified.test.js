/**
 * Test dependencies.
 */

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    random = require('../lib/utils').random,
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
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
  comments: [Comments],
  nested: {array: [Number]}
});

BlogPost
    .path('title')
    .get(function(v) {
      if (v) {
        return v.toUpperCase();
      }
      return v;
    });

BlogPost
    .virtual('titleWithAuthor')
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

var modelName = 'docuemnt.modified.blogpost';
mongoose.model(modelName, BlogPost);

var collection = 'blogposts_' + random();

describe('document modified', function() {
  describe('modified states', function() {
    it('reset after save', function(done) {
      var db = start(),
          B = db.model(modelName, collection);

      var b = new B;

      b.numbers.push(3);
      b.save(function(err) {
        assert.strictEqual(null, err);

        b.numbers.push(3);
        b.save(function(err1) {
          assert.strictEqual(null, err1);

          B.findById(b, function(err2, b) {
            assert.strictEqual(null, err2);
            assert.equal(b.numbers.length, 2);

            db.close();
            done();
          });
        });
      });
    });

    it('of embedded docs reset after save', function(done) {
      var db = start(),
          BlogPost = db.model(modelName, collection);

      var post = new BlogPost({title: 'hocus pocus'});
      post.comments.push({title: 'Humpty Dumpty', comments: [{title: 'nested'}]});
      post.save(function(err) {
        db.close();
        assert.strictEqual(null, err);
        var mFlag = post.comments[0].isModified('title');
        assert.equal(mFlag, false);
        assert.equal(post.isModified('title'), false);
        done();
      });
    });
  });

  describe('isDefault', function() {
    it('works', function(done) {
      var db = start();

      var MyModel = db.model('test',
          {name: {type: String, default: 'Val '}});
      var m = new MyModel();
      assert.ok(m.$isDefault('name'));
      db.close(done);
    });
  });

  describe('isModified', function() {
    it('should not throw with no argument', function(done) {
      var db = start();
      var BlogPost = db.model(modelName, collection);
      var post = new BlogPost;
      db.close();

      var threw = false;
      try {
        post.isModified();
      } catch (err) {
        threw = true;
      }

      assert.equal(threw, false);
      done();
    });

    it('when modifying keys', function(done) {
      var db = start(),
          BlogPost = db.model(modelName, collection);

      db.close();
      var post = new BlogPost;
      post.init({
        title: 'Test',
        slug: 'test',
        date: new Date
      });

      assert.equal(post.isModified('title'), false);
      post.set('title', 'test');
      assert.equal(post.isModified('title'), true);

      assert.equal(post.isModified('date'), false);
      post.set('date', new Date(post.date.getTime() + 10));
      assert.equal(post.isModified('date'), true);

      assert.equal(post.isModified('meta.date'), false);
      done();
    });

    it('setting a key identically to its current value should not dirty the key', function(done) {
      var db = start(),
          BlogPost = db.model(modelName, collection);

      db.close();
      var post = new BlogPost;
      post.init({
        title: 'Test',
        slug: 'test',
        date: new Date
      });

      assert.equal(post.isModified('title'), false);
      post.set('title', 'Test');
      assert.equal(post.isModified('title'), false);
      done();
    });

    describe('on DocumentArray', function() {
      it('work', function(done) {
        var db = start(),
            BlogPost = db.model(modelName, collection);

        var post = new BlogPost();
        post.init({
          title: 'Test',
          slug: 'test',
          comments: [{title: 'Test', date: new Date, body: 'Test'}]
        });

        assert.equal(post.isModified('comments.0.title'), false);
        post.get('comments')[0].set('title', 'Woot');
        assert.equal(post.isModified('comments'), true);
        assert.equal(post.isDirectModified('comments'), false);
        assert.equal(post.isModified('comments.0.title'), true);
        assert.equal(post.isDirectModified('comments.0.title'), true);

        db.close(done);
      });
      it('with accessors', function(done) {
        var db = start(),
            BlogPost = db.model(modelName, collection);

        var post = new BlogPost();
        post.init({
          title: 'Test',
          slug: 'test',
          comments: [{title: 'Test', date: new Date, body: 'Test'}]
        });

        assert.equal(post.isModified('comments.0.body'), false);
        post.get('comments')[0].body = 'Woot';
        assert.equal(post.isModified('comments'), true);
        assert.equal(post.isDirectModified('comments'), false);
        assert.equal(post.isModified('comments.0.body'), true);
        assert.equal(post.isDirectModified('comments.0.body'), true);

        db.close();
        done();
      });
    });

    describe('on MongooseArray', function() {
      it('atomic methods', function(done) {
        // COMPLETEME
        var db = start(),
            BlogPost = db.model(modelName, collection);

        db.close();
        var post = new BlogPost();
        assert.equal(post.isModified('owners'), false);
        post.get('owners').push(new DocumentObjectId);
        assert.equal(post.isModified('owners'), true);
        done();
      });
      it('native methods', function(done) {
        // COMPLETEME
        var db = start(),
            BlogPost = db.model(modelName, collection);

        db.close();
        var post = new BlogPost;
        assert.equal(post.isModified('owners'), false);
        done();
      });
    });

    it('on entire document', function(done) {
      var db = start(),
          BlogPost = db.model(modelName, collection);

      var doc = {
        title: 'Test',
        slug: 'test',
        date: new Date,
        meta: {
          date: new Date,
          visitors: 5
        },
        published: true,
        mixed: {x: [{y: [1, 'yes', 2]}]},
        numbers: [],
        owners: [new DocumentObjectId, new DocumentObjectId],
        comments: [
          {title: 'Test', date: new Date, body: 'Test'},
          {title: 'Super', date: new Date, body: 'Cool'}
        ]
      };

      BlogPost.create(doc, function(err, post) {
        assert.ifError(err);
        BlogPost.findById(post.id, function(err, postRead) {
          db.close();
          assert.ifError(err);
          // set the same data again back to the document.
          // expected result, nothing should be set to modified
          assert.equal(postRead.isModified('comments'), false);
          assert.equal(postRead.isNew, false);
          postRead.set(postRead.toObject());

          assert.equal(postRead.isModified('title'), false);
          assert.equal(postRead.isModified('slug'), false);
          assert.equal(postRead.isModified('date'), false);
          assert.equal(postRead.isModified('meta.date'), false);
          assert.equal(postRead.isModified('meta.visitors'), false);
          assert.equal(postRead.isModified('published'), false);
          assert.equal(postRead.isModified('mixed'), false);
          assert.equal(postRead.isModified('numbers'), false);
          assert.equal(postRead.isModified('owners'), false);
          assert.equal(postRead.isModified('comments'), false);
          var arr = postRead.comments.slice();
          arr[2] = postRead.comments.create({title: 'index'});
          postRead.comments = arr;
          assert.equal(postRead.isModified('comments'), true);
          done();
        });
      });
    });

    it('should let you set ref paths (gh-1530)', function(done) {
      var db = start();

      var parentSchema = new Schema({
        child: {type: Schema.Types.ObjectId, ref: 'gh-1530-2'}
      });
      var Parent = db.model('gh-1530-1', parentSchema);
      var childSchema = new Schema({
        name: String
      });

      var preCalls = 0;
      childSchema.pre('save', function(next) {
        ++preCalls;
        next();
      });

      var postCalls = 0;
      childSchema.post('save', function(doc, next) {
        ++postCalls;
        next();
      });
      var Child = db.model('gh-1530-2', childSchema);

      var p = new Parent();
      var c = new Child({ name: 'Luke' });
      p.child = c;
      assert.equal(p.child.name, 'Luke');

      p.save(function(error) {
        assert.ifError(error);
        assert.equal(p.child.name, 'Luke');
        var originalParent = p;
        Parent.findOne({}, function(error, p) {
          assert.ifError(error);
          assert.ok(p.child);
          assert.ok(typeof p.child.name === 'undefined');
          assert.equal(preCalls, 0);
          assert.equal(postCalls, 0);
          Child.findOne({name: 'Luke'}, function(error, child) {
            assert.ifError(error);
            assert.ok(!child);
            originalParent.child.save(function(error) {
              assert.ifError(error);
              Child.findOne({name: 'Luke'}, function(error, child) {
                assert.ifError(error);
                assert.ok(child);
                assert.equal(p.child.toString(), child._id.toString());
                db.close(done);
              });
            });
          });
        });
      });
    });

    it('properly sets populated for gh-1530 (gh-2678)', function(done) {
      var db = start();

      var parentSchema = new Schema({
        name: String,
        child: {type: Schema.Types.ObjectId, ref: 'Child'}
      });

      var Parent = db.model('Parent', parentSchema, 'parents');
      var Child = db.model('Child', parentSchema, 'children');

      var child = new Child({name: 'Mary'});
      var p = new Parent({name: 'Alex', child: child});

      assert.equal(child._id.toString(), p.populated('child').toString());
      db.close(done);
    });

    describe('manually populating arrays', function() {
      var db;

      before(function() {
        db = start();
      });

      after(function(done) {
        db.close(done);
      });

      it('gh-1530 for arrays (gh-3575)', function(done) {
        var parentSchema = new Schema({
          name: String,
          children: [{type: Schema.Types.ObjectId, ref: 'Child'}]
        });

        var Parent = db.model('Parent', parentSchema, 'parents');
        var Child = db.model('Child', parentSchema, 'children');

        var child = new Child({name: 'Luke'});
        var p = new Parent({name: 'Anakin', children: [child]});

        assert.equal('Luke', p.children[0].name);
        assert.ok(p.populated('children'));
        done();
      });

      it('setting nested arrays (gh-3721)', function(done) {
        var userSchema = new Schema({
          name: {type: Schema.Types.String}
        });
        var User = db.model('User', userSchema);

        var accountSchema = new Schema({
          roles: [{
            name: {type: Schema.Types.String},
            users: [{type: Schema.Types.ObjectId, ref: 'User'}]
          }]
        });

        var Account = db.model('Account', accountSchema);

        var user = new User({name: 'Test'});
        var account = new Account({
          roles: [
            {name: 'test group', users: [user]}
          ]
        });

        assert.ok(account.roles[0].users[0].isModified);
        done();
      });

      it('with discriminators (gh-3575)', function(done) {
        var shapeSchema = new mongoose.Schema({}, {discriminatorKey: 'kind'});

        var Shape = mongoose.model('gh3575', shapeSchema);

        var Circle = Shape.discriminator('gh3575_0', new mongoose.Schema({
          radius: { type: Number }
        }, {discriminatorKey: 'kind'}));

        var fooSchema = new mongoose.Schema({
          bars: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'gh3575'
          }]
        });

        var Foo = mongoose.model('Foo', fooSchema);

        var test = new Foo({});
        test.bars = [new Circle({}), new Circle({})];

        assert.ok(test.populated('bars'));
        assert.ok(test.bars[0]._id);
        assert.ok(test.bars[1]._id);

        done();
      });

      it('updates embedded doc parents upon direct assignment (gh-5189)', function(done) {
        var db = start();
        var familySchema = new Schema({
          children: [{name: {type: String, required: true}}]
        });
        var Family = db.model('Family', familySchema);
        Family.create({
          children: [
            {name: 'John'},
            {name: 'Mary'}
          ]
        }, function(err, family) {
          family.set({children: family.children.slice(1)});
          family.children.forEach(function(child) {
            child.set({name: 'Maryanne'});
          });

          assert.equal(family.validateSync(), undefined);
          done();
        });
      });
    });

    it('should support setting mixed paths by string (gh-1418)', function(done) {
      var db = start();
      var BlogPost = db.model('1418', new Schema({mixed: {}}));
      var b = new BlogPost;
      b.init({mixed: {}});

      var path = 'mixed.path';
      assert.ok(!b.isModified(path));

      b.set(path, 3);
      assert.ok(b.isModified(path));
      assert.equal(b.get(path), 3);

      b = new BlogPost;
      b.init({mixed: {}});
      path = 'mixed.9a';
      b.set(path, 4);
      assert.ok(b.isModified(path));
      assert.equal(b.get(path), 4);

      b = new BlogPost({mixed: {}});
      b.save(function(err) {
        assert.ifError(err);

        path = 'mixed.9a.x';
        b.set(path, 8);
        assert.ok(b.isModified(path));
        assert.equal(b.get(path), 8);

        b.save(function(err) {
          assert.ifError(err);
          BlogPost.findById(b, function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.get(path), 8);
            db.close(done);
          });
        });
      });
    });

    it('should mark multi-level nested schemas as modified (gh-1754)', function(done) {
      var db = start();

      var grandChildSchema = new Schema({
        name: String
      });

      var childSchema = new Schema({
        name: String,
        grandChild: [grandChildSchema]
      });

      var parentSchema = new Schema({
        name: String,
        child: [childSchema]
      });

      var Parent = db.model('gh-1754', parentSchema);
      Parent.create(
          {child: [{name: 'Brian', grandChild: [{name: 'Jake'}]}]},
          function(error, p) {
            assert.ifError(error);
            assert.ok(p);
            assert.equal(p.child.length, 1);
            assert.equal(p.child[0].grandChild.length, 1);
            p.child[0].grandChild[0].name = 'Jason';
            assert.ok(p.isModified('child.0.grandChild.0.name'));
            p.save(function(error1, inDb) {
              assert.ifError(error1);
              assert.equal(inDb.child[0].grandChild[0].name, 'Jason');
              db.close(done);
            });
          });
    });

    it('should reset the modified state after calling unmarkModified', function(done) {
      var db = start();
      var BlogPost = db.model(modelName, collection);

      var b = new BlogPost();
      assert.equal(b.isModified('author'), false);
      b.author = 'foo';
      assert.equal(b.isModified('author'), true);
      assert.equal(b.isModified(), true);
      b.unmarkModified('author');
      assert.equal(b.isModified('author'), false);
      assert.equal(b.isModified(), false);

      b.save(function(err) {
        assert.strictEqual(null, err);

        BlogPost.findById(b._id, function(err2, b2) {
          assert.strictEqual(null, err2);

          assert.equal(b2.isModified('author'), false);
          assert.equal(b2.isModified(), false);
          b2.author = 'bar';
          assert.equal(b2.isModified('author'), true);
          assert.equal(b2.isModified(), true);
          b2.unmarkModified('author');
          assert.equal(b2.isModified('author'), false);
          assert.equal(b2.isModified(), false);

          b2.save(function(err3) {
            assert.strictEqual(err3, null);
            BlogPost.findById(b._id, function(err4, b3) {
              assert.strictEqual(err4, null);
              // was not saved because modified state was unset
              assert.equal(b3.author, 'foo');
              db.close();
              done();
            });
          });
        });
      });
    });
  });
});
