/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;

describe('document modified', function() {
  let BlogPost;
  let db;

  before(function() {
    db = start();
  });
  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  beforeEach(function() {
    const Comments = new Schema();

    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    const BlogPostSchema = new Schema({
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
      nested: { array: [Number] }
    });

    BlogPostSchema
      .path('title')
      .get(function(v) {
        if (v) {
          return v.toUpperCase();
        }
        return v;
      });

    BlogPostSchema
      .virtual('titleWithAuthor')
      .get(function() {
        return this.get('title') + ' by ' + this.get('author');
      })
      .set(function(val) {
        const split = val.split(' by ');
        this.set('title', split[0]);
        this.set('author', split[1]);
      });

    BlogPostSchema.method('cool', function() {
      return this;
    });

    BlogPostSchema.static('woot', function() {
      return this;
    });

    BlogPost = db.model('BlogPost', BlogPostSchema);
  });

  describe('modified states', function() {
    it('reset after save', function(done) {
      const B = BlogPost;
      const b = new B();

      b.numbers.push(3);
      b.save(function(err) {
        assert.strictEqual(null, err);

        b.numbers.push(3);
        b.save(function(err1) {
          assert.strictEqual(null, err1);

          B.findById(b, function(err2, b) {
            assert.strictEqual(null, err2);
            assert.equal(b.numbers.length, 2);

            done();
          });
        });
      });
    });

    it('of embedded docs reset after save', function(done) {
      const post = new BlogPost({ title: 'hocus pocus' });
      post.comments.push({ title: 'Humpty Dumpty', comments: [{ title: 'nested' }] });
      post.save(function(err) {
        assert.strictEqual(null, err);
        const mFlag = post.comments[0].isModified('title');
        assert.equal(mFlag, false);
        assert.equal(post.isModified('title'), false);
        done();
      });
    });
  });

  describe('isDefault', function() {
    it('works', function() {
      const MyModel = db.model('Test',
        { name: { type: String, default: 'Val ' }, other: String });
      const m = new MyModel();
      assert.ok(m.$isDefault('name'));
      assert.ok(!m.$isDefault('other'));

      assert.ok(m.$isDefault(['name', 'other']));
      assert.ok(!m.$isDefault(['other']));
    });
  });

  describe('isModified', function() {
    it('should not throw with no argument', function() {
      const post = new BlogPost();

      assert.doesNotThrow(function() {
        post.isModified();
      });
    });

    it('when modifying keys', function() {
      const post = new BlogPost();
      post.init({
        title: 'Test',
        slug: 'test',
        date: new Date()
      });

      assert.equal(post.isModified('title'), false);
      post.set('title', 'test');
      assert.equal(post.isModified('title'), true);

      assert.equal(post.isModified('date'), false);
      post.set('date', new Date(post.date.getTime() + 10));
      assert.equal(post.isModified('date'), true);

      assert.equal(post.isModified('meta.date'), false);
    });

    it('setting a key identically to its current value should not dirty the key', function() {
      const post = new BlogPost();
      post.init({
        title: 'Test',
        slug: 'test',
        date: new Date()
      });

      assert.equal(post.isModified('title'), false);
      post.set('title', 'Test');
      assert.equal(post.isModified('title'), false);
    });

    describe('on DocumentArray', function() {
      it('work', function() {
        const post = new BlogPost();
        post.init({
          title: 'Test',
          slug: 'test',
          comments: [{ title: 'Test', date: new Date(), body: 'Test' }]
        });

        assert.equal(post.isModified('comments.0.title'), false);
        post.get('comments')[0].set('title', 'Woot');
        assert.equal(post.isModified('comments'), true);
        assert.equal(post.isDirectModified('comments'), false);
        assert.equal(post.isModified('comments.0.title'), true);
        assert.equal(post.isDirectModified('comments.0.title'), true);
      });
      it('with accessors', function() {
        const post = new BlogPost();
        post.init({
          title: 'Test',
          slug: 'test',
          comments: [{ title: 'Test', date: new Date(), body: 'Test' }]
        });

        assert.equal(post.isModified('comments.0.body'), false);
        post.get('comments')[0].body = 'Woot';
        assert.equal(post.isModified('comments'), true);
        assert.equal(post.isDirectModified('comments'), false);
        assert.equal(post.isDirectModified(['comments']), false);
        assert.equal(post.isModified('comments.0.body'), true);
        assert.equal(post.isDirectModified('comments.0.body'), true);
        assert.equal(post.isDirectModified(['comments.0.body', 'comments']), true);
      });
    });

    describe('on MongooseArray', function() {
      it('atomic methods', function() {
        const post = new BlogPost();
        assert.equal(post.isModified('owners'), false);
        post.get('owners').push(new DocumentObjectId());
        assert.equal(post.isModified('owners'), true);
      });
      it('native methods', function() {
        const post = new BlogPost();
        assert.equal(post.isModified('owners'), false);
      });
    });

    it('on entire document', function(done) {
      const doc = {
        title: 'Test',
        slug: 'test',
        date: new Date(),
        meta: {
          date: new Date(),
          visitors: 5
        },
        published: true,
        mixed: { x: [{ y: [1, 'yes', 2] }] },
        numbers: [],
        owners: [new DocumentObjectId(), new DocumentObjectId()],
        comments: [
          { title: 'Test', date: new Date(), body: 'Test' },
          { title: 'Super', date: new Date(), body: 'Cool' }
        ]
      };

      BlogPost.create(doc, function(err, post) {
        assert.ifError(err);
        BlogPost.findById(post.id, function(err, postRead) {
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
          const arr = postRead.comments.slice();
          arr[2] = postRead.comments.create({ title: 'index' });
          postRead.comments = arr;
          assert.equal(postRead.isModified('comments'), true);
          done();
        });
      });
    });

    it('should let you set ref paths (gh-1530)', async function() {
      const parentSchema = new Schema({
        child: { type: Schema.Types.ObjectId, ref: 'Child' }
      });
      const Parent = db.model('Parent', parentSchema);
      const childSchema = new Schema({
        name: String
      });

      let preCalls = 0;
      childSchema.pre('save', function(next) {
        ++preCalls;
        next();
      });

      let postCalls = 0;
      childSchema.post('save', function(doc, next) {
        ++postCalls;
        next();
      });
      const Child = db.model('Child', childSchema);

      const p = new Parent();
      const c = new Child({ name: 'Luke' });
      p.child = c;
      assert.equal(p.child.name, 'Luke');

      await p.save();

      assert.equal(p.child.name, 'Luke');
      const originalParent = p;

      const foundParent = await Parent.findOne({});

      assert.ok(foundParent.child);
      assert.ok(typeof foundParent.child.name === 'undefined');
      assert.equal(preCalls, 0);
      assert.equal(postCalls, 0);

      const child = await Child.findOne({ name: 'Luke' });
      assert.ok(!child);

      await originalParent.child.save();

      const child2 = await Child.findOne({ name: 'Luke' });

      assert.ok(child2);
      assert.equal(foundParent.child.toString(), child2._id.toString());
    });

    it('properly sets populated for gh-1530 (gh-2678)', function() {
      const parentSchema = new Schema({
        name: String,
        child: { type: Schema.Types.ObjectId, ref: 'Child' }
      });

      const Parent = db.model('Parent', parentSchema);
      const Child = db.model('Child', parentSchema);

      const child = new Child({ name: 'Mary' });
      const p = new Parent({ name: 'Alex', child: child });

      assert.equal(child._id.toString(), p.populated('child').toString());
    });

    describe('manually populating arrays', function() {
      let db;

      before(function() {
        db = start();
      });

      after(async function() {
        await db.close();
      });

      it('gh-1530 for arrays (gh-3575)', function() {
        const parentSchema = new Schema({
          name: String,
          children: [{ type: Schema.Types.ObjectId, ref: 'Child' }]
        });

        const Parent = db.model('Parent', parentSchema);
        const Child = db.model('Child', parentSchema);

        const child = new Child({ name: 'Luke' });
        const p = new Parent({ name: 'Anakin', children: [child] });

        assert.equal('Luke', p.children[0].name);
        assert.ok(p.populated('children'));
      });

      it('setting nested arrays (gh-3721)', function() {
        const userSchema = new Schema({
          name: { type: Schema.Types.String }
        });
        const User = db.model('User', userSchema);

        const accountSchema = new Schema({
          roles: [{
            name: { type: Schema.Types.String },
            users: [{ type: Schema.Types.ObjectId, ref: 'User' }]
          }]
        });

        const Account = db.model('Test', accountSchema);

        const user = new User({ name: 'Test' });
        const account = new Account({
          roles: [
            { name: 'test group', users: [user] }
          ]
        });

        assert.ok(account.roles[0].isModified('users'));
        return Promise.all([User.init(), Account.init()]);
      });

      it('with discriminators (gh-3575)', function() {
        const shapeSchema = new mongoose.Schema({}, { discriminatorKey: 'kind' });

        db.deleteModel(/Test/);
        const Shape = db.model('Test', shapeSchema);

        const Circle = Shape.discriminator('Circle', new mongoose.Schema({
          radius: { type: Number }
        }, { discriminatorKey: 'kind' }));

        const fooSchema = new mongoose.Schema({
          bars: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Test'
          }]
        });

        const Foo = db.model('Test1', fooSchema);

        const test = new Foo({});
        test.bars = [new Circle({}), new Circle({})];

        assert.ok(test.populated('bars'));
        assert.ok(test.bars[0]._id);
        assert.ok(test.bars[1]._id);
      });

      it('updates embedded doc parents upon direct assignment (gh-5189)', function(done) {
        const familySchema = new Schema({
          children: [{ name: { type: String, required: true } }]
        });
        db.deleteModel(/Test/);
        const Family = db.model('Test', familySchema);
        Family.create({
          children: [
            { name: 'John' },
            { name: 'Mary' }
          ]
        }, function(err, family) {
          family.set({ children: family.children.slice(1) });
          family.children.forEach(function(child) {
            child.set({ name: 'Maryanne' });
          });

          assert.equal(family.validateSync(), undefined);
          done();
        });
      });
    });

    it('should support setting mixed paths by string (gh-1418)', function(done) {
      const BlogPost = db.model('Test', new Schema({ mixed: {} }));
      let b = new BlogPost();
      b.init({ mixed: {} });

      let path = 'mixed.path';
      assert.ok(!b.isModified(path));

      b.set(path, 3);
      assert.ok(b.isModified(path));
      assert.equal(b.get(path), 3);

      b = new BlogPost();
      b.init({ mixed: {} });
      path = 'mixed.9a';
      b.set(path, 4);
      assert.ok(b.isModified(path));
      assert.equal(b.get(path), 4);

      b = new BlogPost({ mixed: {} });
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
            done();
          });
        });
      });
    });

    it('should mark multi-level nested schemas as modified (gh-1754)', async function() {
      const grandChildSchema = new Schema({
        name: String
      });

      const childSchema = new Schema({
        name: String,
        grandChild: [grandChildSchema]
      });

      const parentSchema = new Schema({
        name: String,
        child: [childSchema]
      });

      const Parent = db.model('Parent', parentSchema);
      const p = await Parent.create({ child: [{ name: 'Brian', grandChild: [{ name: 'Jake' }] }] });

      assert.ok(p);
      assert.equal(p.child.length, 1);
      assert.equal(p.child[0].grandChild.length, 1);
      p.child[0].grandChild[0].name = 'Jason';
      assert.ok(p.isModified('child.0.grandChild.0.name'));
      await p.save();

      assert.equal(p.child[0].grandChild[0].name, 'Jason');
    });

    it('should reset the modified state after calling unmarkModified', function(done) {
      const b = new BlogPost();
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
              done();
            });
          });
        });
      });
    });
  });
});
