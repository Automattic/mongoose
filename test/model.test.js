'use strict';

/**
 * Test dependencies.
 */
const sinon = require('sinon');
const start = require('./common');

const assert = require('assert');
const random = require('./util').random;
const util = require('./util');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ValidatorError = mongoose.Error.ValidatorError;
const ValidationError = mongoose.Error.ValidationError;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;
const EmbeddedDocument = mongoose.Types.Subdocument;
const MongooseError = mongoose.Error;

describe('Model', function() {
  let db;
  let Comments;
  let BlogPost;

  beforeEach(() => db.deleteModel(/.*/));

  beforeEach(function() {
    Comments = new Schema();

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
      comments: [Comments],
      nested: { array: [Number] }
    });

    BlogPost
      .virtual('titleWithAuthor')
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

    BlogPost = db.model('BlogPost', BlogPost);
  });

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  afterEach(() => util.clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('can be created using _id as embedded document', async function() {
    const Test = db.model('Test', Schema({
      _id: { first_name: String, age: Number },
      last_name: String,
      doc_embed: {
        some: String
      }
    }));
    const t = new Test({
      _id: {
        first_name: 'Daniel',
        age: 21
      },
      last_name: 'Alabi',
      doc_embed: {
        some: 'a'
      }
    });

    await t.save();

    const doc = await Test.findOne();

    assert.ok('last_name' in doc);
    assert.ok('_id' in doc);
    assert.ok('first_name' in doc._id);
    assert.equal(doc._id.first_name, 'Daniel');
    assert.ok('age' in doc._id);
    assert.equal(doc._id.age, 21);

    assert.ok('doc_embed' in doc);
    assert.ok('some' in doc.doc_embed);
    assert.equal(doc.doc_embed.some, 'a');
  });

  describe('constructor', function() {
    it('works without "new" keyword', function(done) {
      const B = BlogPost;
      let b = B();
      assert.ok(b instanceof B);
      b = B();
      assert.ok(b instanceof B);
      done();
    });
    it('works "new" keyword', function(done) {
      const B = BlogPost;
      let b = new B();
      assert.ok(b instanceof B);
      b = new B();
      assert.ok(b instanceof B);
      done();
    });
  });
  describe('isNew', function() {
    it('is true on instantiation', function(done) {
      const post = new BlogPost();
      assert.equal(post.isNew, true);
      done();
    });
  });

  it('gh-2140', function(done) {
    db.deleteModel(/Test/);
    const S = new Schema({
      field: [{ text: String }]
    });

    const Model = db.model('Test', S);
    const s = new Model();
    s.field = [null];
    s.field = [{ text: 'text' }];

    assert.ok(s.field[0]);
    done();
  });

  describe('schema', function() {
    it('should exist', function(done) {
      assert.ok(BlogPost.schema instanceof Schema);
      assert.ok(BlogPost.prototype.schema instanceof Schema);
      done();
    });
    it('emits init event', function(done) {
      const schema = new Schema({ name: String });
      let model;

      schema.on('init', function(model_) {
        model = model_;
      });

      db.deleteModel(/Test/);
      const Named = db.model('Test', schema);
      assert.equal(model, Named);
      done();
    });
  });

  describe('structure', function() {
    it('default when instantiated', function(done) {
      const post = new BlogPost();
      assert.equal(post.db.model('BlogPost').modelName, 'BlogPost');
      assert.equal(post.constructor.modelName, 'BlogPost');

      assert.ok(post.get('_id') instanceof DocumentObjectId);

      assert.equal(post.get('title'), undefined);
      assert.equal(post.get('slug'), undefined);
      assert.equal(post.get('date'), undefined);

      assert.equal(typeof post.get('meta'), 'object');
      assert.deepEqual(post.get('meta'), {});
      assert.equal(post.get('meta.date'), undefined);
      assert.equal(post.get('meta.visitors'), undefined);
      assert.equal(post.get('published'), undefined);
      assert.equal(Object.keys(post.get('nested')).length, 1);
      assert.ok(Array.isArray(post.get('nested').array));

      assert.ok(post.get('numbers').isMongooseArray);
      assert.ok(post.get('owners').isMongooseArray);
      assert.ok(post.get('comments').isMongooseDocumentArray);
      assert.ok(post.get('nested.array').isMongooseArray);
      done();
    });

    describe('array', function() {
      describe('defaults', function() {
        it('to a non-empty array', function(done) {
          const DefaultArraySchema = new Schema({
            arr: { type: Array, cast: String, default: ['a', 'b', 'c'] },
            single: { type: Array, cast: String, default: ['a'] }
          });
          const DefaultArray = db.model('Test', DefaultArraySchema);
          const arr = new DefaultArray();
          assert.equal(arr.get('arr').length, 3);
          assert.equal(arr.get('arr')[0], 'a');
          assert.equal(arr.get('arr')[1], 'b');
          assert.equal(arr.get('arr')[2], 'c');
          assert.equal(arr.get('single').length, 1);
          assert.equal(arr.get('single')[0], 'a');
          done();
        });

        it('empty', function(done) {
          const DefaultZeroCardArraySchema = new Schema({
            arr: { type: Array, cast: String, default: [] },
            auto: [Number]
          });
          const DefaultZeroCardArray = db.model('Test', DefaultZeroCardArraySchema);
          const arr = new DefaultZeroCardArray();
          assert.equal(arr.get('arr').length, 0);
          assert.equal(arr.arr.length, 0);
          assert.equal(arr.auto.length, 0);
          done();
        });
      });
    });

    it('a hash with one null value', function(done) {
      const post = new BlogPost({
        title: null
      });
      assert.strictEqual(null, post.title);
      done();
    });

    it('when saved', function(done) {
      let pending = 2;

      function cb() {
        if (--pending) {
          return;
        }
        done();
      }

      const post = new BlogPost();
      post.on('save', function(post) {
        assert.ok(post.get('_id') instanceof DocumentObjectId);

        assert.equal(post.get('title'), undefined);
        assert.equal(post.get('slug'), undefined);
        assert.equal(post.get('date'), undefined);
        assert.equal(post.get('published'), undefined);

        assert.equal(typeof post.get('meta'), 'object');
        assert.deepEqual(post.get('meta'), {});
        assert.equal(post.get('meta.date'), undefined);
        assert.equal(post.get('meta.visitors'), undefined);

        assert.ok(post.get('owners').isMongooseArray);
        assert.ok(post.get('comments').isMongooseDocumentArray);
        cb();
      });

      post.save(function(err, post) {
        assert.ifError(err);
        assert.ok(post.get('_id') instanceof DocumentObjectId);

        assert.equal(post.get('title'), undefined);
        assert.equal(post.get('slug'), undefined);
        assert.equal(post.get('date'), undefined);
        assert.equal(post.get('published'), undefined);

        assert.equal(typeof post.get('meta'), 'object');
        assert.deepEqual(post.get('meta'), {});
        assert.equal(post.get('meta.date'), undefined);
        assert.equal(post.get('meta.visitors'), undefined);

        assert.ok(post.get('owners').isMongooseArray);
        assert.ok(post.get('comments').isMongooseDocumentArray);
        cb();
      });
    });

    describe('init', function() {
      it('works', function(done) {
        const post = new BlogPost();

        post.init({
          title: 'Test',
          slug: 'test',
          date: new Date(),
          meta: {
            date: new Date(),
            visitors: 5
          },
          published: true,
          owners: [new DocumentObjectId(), new DocumentObjectId()],
          comments: [
            { title: 'Test', date: new Date(), body: 'Test' },
            { title: 'Super', date: new Date(), body: 'Cool' }
          ]
        });

        assert.equal(post.get('title'), 'Test');
        assert.equal(post.get('slug'), 'test');
        assert.ok(post.get('date') instanceof Date);
        assert.equal(typeof post.get('meta'), 'object');
        assert.ok(post.get('meta').date instanceof Date);
        assert.equal(typeof post.get('meta').visitors, 'number');
        assert.equal(post.get('published'), true);

        assert.equal(post.title, 'Test');
        assert.equal(post.slug, 'test');
        assert.ok(post.date instanceof Date);
        assert.equal(typeof post.meta, 'object');
        assert.ok(post.meta.date instanceof Date);
        assert.equal(typeof post.meta.visitors, 'number');
        assert.equal(post.published, true);

        assert.ok(post.get('owners').isMongooseArray);
        assert.ok(post.get('owners')[0] instanceof DocumentObjectId);
        assert.ok(post.get('owners')[1] instanceof DocumentObjectId);

        assert.ok(post.owners.isMongooseArray);
        assert.ok(post.owners[0] instanceof DocumentObjectId);
        assert.ok(post.owners[1] instanceof DocumentObjectId);

        assert.ok(post.get('comments').isMongooseDocumentArray);
        assert.ok(post.get('comments')[0] instanceof EmbeddedDocument);
        assert.ok(post.get('comments')[1] instanceof EmbeddedDocument);

        assert.ok(post.comments.isMongooseDocumentArray);
        assert.ok(post.comments[0] instanceof EmbeddedDocument);
        assert.ok(post.comments[1] instanceof EmbeddedDocument);
        done();
      });

      it('partially', function(done) {
        const post = new BlogPost();
        post.init({
          title: 'Test',
          slug: 'test',
          date: new Date()
        });

        assert.equal(post.get('title'), 'Test');
        assert.equal(post.get('slug'), 'test');
        assert.ok(post.get('date') instanceof Date);
        assert.equal(typeof post.get('meta'), 'object');

        assert.deepEqual(post.get('meta'), {});
        assert.equal(post.get('meta.date'), undefined);
        assert.equal(post.get('meta.visitors'), undefined);
        assert.equal(post.get('published'), undefined);

        assert.ok(post.get('owners').isMongooseArray);
        assert.ok(post.get('comments').isMongooseDocumentArray);
        done();
      });

      it('with partial hash', function(done) {
        const post = new BlogPost({
          meta: {
            date: new Date(),
            visitors: 5
          }
        });

        assert.equal(post.get('meta.visitors').valueOf(), 5);
        done();
      });

      it('isNew on embedded documents', function(done) {
        const post = new BlogPost();
        post.init({
          title: 'Test',
          slug: 'test',
          comments: [{ title: 'Test', date: new Date(), body: 'Test' }]
        });

        assert.equal(post.get('comments')[0].isNew, false);
        done();
      });

      it('isNew on embedded documents after saving', function(done) {
        const post = new BlogPost({ title: 'hocus pocus' });
        post.comments.push({ title: 'Humpty Dumpty', comments: [{ title: 'nested' }] });
        assert.equal(post.get('comments')[0].isNew, true);
        assert.equal(post.get('comments')[0].comments[0].isNew, true);
        post.invalidate('title'); // force error
        post.save(function() {
          assert.equal(post.isNew, true);
          assert.equal(post.get('comments')[0].isNew, true);
          assert.equal(post.get('comments')[0].comments[0].isNew, true);
          post.save(function(err) {
            assert.strictEqual(null, err);
            assert.equal(post.isNew, false);
            assert.equal(post.get('comments')[0].isNew, false);
            assert.equal(post.get('comments')[0].comments[0].isNew, false);
            done();
          });
        });
      });
    });
  });

  it('collection name can be specified through schema', function(done) {
    const schema = new Schema({ name: String }, { collection: 'tests' });
    const Named = mongoose.model('CollectionNamedInSchema1', schema);
    assert.equal(Named.prototype.collection.name, 'tests');

    const users2schema = new Schema({ name: String }, { collection: 'tests' });
    const Named2 = db.model('FooBar', users2schema);
    assert.equal(Named2.prototype.collection.name, 'tests');
    done();
  });

  it('saving a model with a null value should perpetuate that null value to the db', function(done) {
    const post = new BlogPost({
      title: null
    });
    assert.strictEqual(null, post.title);
    post.save(function(err) {
      assert.strictEqual(err, null);
      BlogPost.findById(post.id, function(err, found) {
        assert.strictEqual(err, null);
        assert.strictEqual(found.title, null);
        done();
      });
    });
  });

  it('saves subdocuments middleware correctly', function(done) {
    let child_hook;
    let parent_hook;
    const childSchema = new Schema({
      name: String
    });

    childSchema.pre('save', function(next) {
      child_hook = this.name;
      next();
    });

    const parentSchema = new Schema({
      name: String,
      children: [childSchema]
    });

    parentSchema.pre('save', function(next) {
      parent_hook = this.name;
      next();
    });

    const Parent = db.model('Parent', parentSchema);

    const parent = new Parent({
      name: 'Bob',
      children: [{
        name: 'Mary'
      }]
    });

    parent.save(function(err, parent) {
      assert.equal(parent_hook, 'Bob');
      assert.equal(child_hook, 'Mary');
      assert.ifError(err);
      parent.children[0].name = 'Jane';
      parent.save(function(err) {
        assert.equal(child_hook, 'Jane');
        assert.ifError(err);
        done();
      });
    });
  });

  it('instantiating a model with a hash that maps to at least 1 undefined value', function(done) {
    const post = new BlogPost({
      title: undefined
    });
    assert.strictEqual(undefined, post.title);
    post.save(function(err) {
      assert.strictEqual(null, err);
      BlogPost.findById(post.id, function(err, found) {
        assert.strictEqual(err, null);
        assert.strictEqual(found.title, undefined);
        done();
      });
    });
  });

  it('modified nested objects which contain MongoseNumbers should not cause a RangeError on save (gh-714)', function(done) {
    const schema = new Schema({
      nested: {
        num: Number
      }
    });

    const M = db.model('Test', schema);
    const m = new M();
    m.nested = null;
    m.save(function(err) {
      assert.ifError(err);

      M.findById(m, function(err, m) {
        assert.ifError(err);
        m.nested.num = 5;
        m.save(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });
  });

  it('no RangeError on remove() of a doc with Number _id (gh-714)', function(done) {
    const MySchema = new Schema({
      _id: { type: Number },
      name: String
    });

    const MyModel = db.model('Test', MySchema);

    const instance = new MyModel({
      name: 'test',
      _id: 35
    });
    instance.save(function(err) {
      assert.ifError(err);

      MyModel.findById(35, function(err, doc) {
        assert.ifError(err);

        doc.remove({}, function(err) {
          assert.ifError(err);
          done();
        });
      });
    });
  });

  it('over-writing a number should persist to the db (gh-342)', function(done) {
    const post = new BlogPost({
      meta: {
        date: new Date(),
        visitors: 10
      }
    });

    post.save(function(err) {
      assert.ifError(err);
      post.set('meta.visitors', 20);
      post.save(function(err) {
        assert.ifError(err);
        BlogPost.findById(post.id, function(err, found) {
          assert.ifError(err);
          assert.equal(found.get('meta.visitors').valueOf(), 20);
          done();
        });
      });
    });
  });

  describe('methods', function() {
    it('can be defined', function(done) {
      const post = new BlogPost();
      assert.equal(post.cool(), post);
      done();
    });

    it('can be defined on embedded documents', function(done) {
      const ChildSchema = new Schema({ name: String });
      ChildSchema.method('talk', function() {
        return 'gaga';
      });

      const ParentSchema = new Schema({
        children: [ChildSchema]
      });

      const ChildA = db.model('Child', ChildSchema);
      const ParentA = db.model('Parent', ParentSchema);

      const c = new ChildA();
      assert.equal(typeof c.talk, 'function');

      const p = new ParentA();
      p.children.push({});
      assert.equal(typeof p.children[0].talk, 'function');
      done();
    });

    it('can be defined with nested key', function(done) {
      const NestedKeySchema = new Schema({});
      NestedKeySchema.method('foo', {
        bar: function() {
          return this;
        }
      });
      const NestedKey = db.model('Test', NestedKeySchema);
      const n = new NestedKey();
      assert.equal(n.foo.bar(), n);
      done();
    });
  });

  describe('statics', function() {
    it('can be defined', function(done) {
      assert.equal(BlogPost.woot(), BlogPost);
      done();
    });
  });

  describe('casting as validation errors', function() {
    it('error', function(done) {
      let threw = false;

      let post;
      try {
        post = new BlogPost({ date: 'Test', meta: { date: 'Test' } });
      } catch (e) {
        threw = true;
      }

      assert.equal(threw, false);

      try {
        post.set('title', 'Test');
      } catch (e) {
        threw = true;
      }

      assert.equal(threw, false);

      post.save(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);
        assert.equal(Object.keys(err.errors).length, 2);
        post.date = new Date();
        post.meta.date = new Date();
        post.save(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });
    it('nested error', function(done) {
      let threw = false;

      const post = new BlogPost();

      try {
        post.init({
          meta: {
            date: 'Test'
          }
        });
      } catch (e) {
        threw = true;
      }

      assert.equal(threw, false);

      try {
        post.set('meta.date', 'Test');
      } catch (e) {
        threw = true;
      }

      assert.equal(threw, false);

      post.save(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);
        done();
      });
    });


    it('subdocument cast error', function(done) {
      const post = new BlogPost({
        title: 'Test',
        slug: 'test',
        comments: [{ title: 'Test', date: new Date(), body: 'Test' }]
      });

      post.get('comments')[0].set('date', 'invalid');

      post.save(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);
        done();
      });
    });


    it('subdocument validation error', function(done) {
      function failingvalidator() {
        return false;
      }

      db.deleteModel(/BlogPost/);
      const subs = new Schema({
        str: {
          type: String, validate: failingvalidator
        }
      });
      const BlogPost = db.model('BlogPost', { subs: [subs] });

      const post = new BlogPost();
      post.init({
        subs: [{ str: 'gaga' }]
      });

      post.save(function(err) {
        assert.ok(err instanceof ValidationError);
        done();
      });
    });


    it('subdocument error when adding a subdoc', function(done) {
      let threw = false;

      const post = new BlogPost();

      try {
        post.get('comments').push({
          date: 'Bad date'
        });
      } catch (e) {
        threw = true;
      }

      assert.equal(threw, false);

      post.save(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);
        done();
      });
    });


    it('updates', function(done) {
      const post = new BlogPost();
      post.set('title', '1');

      const id = post.get('_id');

      post.save(function(err) {
        assert.ifError(err);

        BlogPost.updateOne({ title: 1, _id: id }, { title: 2 }, function(err) {
          assert.ifError(err);

          BlogPost.findOne({ _id: post.get('_id') }, function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.get('title'), '2');
            done();
          });
        });
      });
    });

    it('$pull', function(done) {
      const post = new BlogPost();

      post.get('numbers').push('3');
      assert.equal(post.get('numbers')[0], 3);
      done();
    });

    it('$push', function(done) {
      const post = new BlogPost();

      post.get('numbers').push(1, 2, 3, 4);
      post.save(function() {
        BlogPost.findById(post.get('_id'), function(err, found) {
          assert.equal(found.get('numbers').length, 4);
          found.get('numbers').pull('3');
          found.save(function() {
            BlogPost.findById(found.get('_id'), function(err, found2) {
              assert.ifError(err);
              assert.equal(found2.get('numbers').length, 3);
              done();
            });
          });
        });
      });
    });

    it('Number arrays', function(done) {
      const post = new BlogPost();
      post.numbers.push(1, '2', 3);

      post.save(function(err) {
        assert.strictEqual(err, null);

        BlogPost.findById(post._id, function(err, doc) {
          assert.ifError(err);

          assert.ok(~doc.numbers.indexOf(1));
          assert.ok(~doc.numbers.indexOf(2));
          assert.ok(~doc.numbers.indexOf(3));

          done();
        });
      });
    });

    it('date casting compat with datejs (gh-502)', function(done) {
      Date.prototype.toObject = function() {
        return {
          millisecond: 86,
          second: 42,
          minute: 47,
          hour: 17,
          day: 13,
          week: 50,
          month: 11,
          year: 2011
        };
      };

      const S = new Schema({
        name: String,
        description: String,
        sabreId: String,
        data: {
          lastPrice: Number,
          comm: String,
          curr: String,
          rateName: String
        },
        created: { type: Date, default: Date.now },
        valid: { type: Boolean, default: true }
      });

      const M = db.model('Test', S);

      const m = new M();
      m.save(function(err) {
        assert.ifError(err);
        M.findById(m._id, function(err, m) {
          assert.ifError(err);
          m.save(function(err) {
            assert.ifError(err);
            M.deleteOne({}, function(err) {
              delete Date.prototype.toObject;
              assert.ifError(err);
              done();
            });
          });
        });
      });
    });
  });

  describe('validation', function() {
    it('works', function(done) {
      function dovalidate() {
        assert.equal(this.asyncScope, 'correct');
        return true;
      }

      function dovalidateAsync() {
        assert.equal(this.scope, 'correct');
        return global.Promise.resolve(true);
      }

      const TestValidation = db.model('Test', new Schema({
        simple: { type: String, required: true },
        scope: { type: String, validate: [dovalidate, 'scope failed'], required: true },
        asyncScope: { type: String, validate: [dovalidateAsync, 'async scope failed'], required: true }
      }));

      const post = new TestValidation();
      post.set('simple', '');
      post.set('scope', 'correct');
      post.set('asyncScope', 'correct');

      post.save(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);

        post.set('simple', 'here');
        post.save(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    it('custom messaging', function(done) {
      function validate(val) {
        return val === 'abc';
      }

      const TestValidationMessage = db.model('Test', new Schema({
        simple: { type: String, validate: [validate, 'must be abc'] }
      }));

      const post = new TestValidationMessage();
      post.set('simple', '');

      post.save(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);
        assert.ok(err.errors.simple instanceof ValidatorError);
        assert.equal(err.errors.simple.message, 'must be abc');
        assert.equal(post.errors.simple.message, 'must be abc');

        post.set('simple', 'abc');
        post.save(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    it('with Model.schema.path introspection (gh-272)', function(done) {
      const IntrospectionValidationSchema = new Schema({
        name: String
      });
      const IntrospectionValidation = db.model('Test', IntrospectionValidationSchema);
      IntrospectionValidation.schema.path('name').validate(function(value) {
        return value.length < 2;
      }, 'Name cannot be greater than 1 character for path "{PATH}" with value `{VALUE}`');
      const doc = new IntrospectionValidation({ name: 'hi' });
      doc.save(function(err) {
        assert.equal(err.errors.name.message, 'Name cannot be greater than 1 character for path "name" with value `hi`');
        assert.equal(err.name, 'ValidationError');
        assert.ok(err.message.indexOf('Test validation failed') !== -1, err.message);
        done();
      });
    });

    it('of required undefined values', function(done) {
      const TestUndefinedValidation = db.model('Test', new Schema({
        simple: { type: String, required: true }
      }));

      const post = new TestUndefinedValidation();

      post.save(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);

        post.set('simple', 'here');
        post.save(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    it('save callback should only execute once (gh-319)', function(done) {
      const D = db.model('Test', new Schema({
        username: { type: String, validate: /^[a-z]{6}$/i },
        email: { type: String, validate: /^[a-z]{6}$/i },
        password: { type: String, validate: /^[a-z]{6}$/i }
      }));

      const post = new D({
        username: 'nope',
        email: 'too',
        password: 'short'
      });

      let timesCalled = 0;

      post.save(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);

        assert.equal(++timesCalled, 1);

        assert.equal(Object.keys(err.errors).length, 3);
        assert.ok(err.errors.password instanceof ValidatorError);
        assert.ok(err.errors.email instanceof ValidatorError);
        assert.ok(err.errors.username instanceof ValidatorError);
        assert.equal(err.errors.password.message, 'Validator failed for path `password` with value `short`');
        assert.equal(err.errors.email.message, 'Validator failed for path `email` with value `too`');
        assert.equal(err.errors.username.message, 'Validator failed for path `username` with value `nope`');

        assert.equal(Object.keys(post.errors).length, 3);
        assert.ok(post.errors.password instanceof ValidatorError);
        assert.ok(post.errors.email instanceof ValidatorError);
        assert.ok(post.errors.username instanceof ValidatorError);
        assert.equal(post.errors.password.message, 'Validator failed for path `password` with value `short`');
        assert.equal(post.errors.email.message, 'Validator failed for path `email` with value `too`');
        assert.equal(post.errors.username.message, 'Validator failed for path `username` with value `nope`');
        done();
      });
    });

    it('query result', function(done) {
      const TestV = db.model('Test', new Schema({
        resultv: { type: String, required: true }
      }));

      const post = new TestV();

      post.validate(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);

        post.resultv = 'yeah';
        post.save(function(err) {
          assert.ifError(err);
          TestV.findOne({ _id: post.id }, function(err, found) {
            assert.ifError(err);
            assert.equal(found.resultv, 'yeah');
            found.save(function(err) {
              assert.ifError(err);
              done();
            });
          });
        });
      });
    });

    it('of required previously existing null values', function(done) {
      const TestP = db.model('Test', new Schema({
        previous: { type: String, required: true },
        a: String
      }));

      const doc = { a: null, previous: null };
      TestP.collection.insertOne(doc, {}, function(err) {
        assert.ifError(err);
        TestP.findOne({ _id: doc._id }, function(err, found) {
          assert.ifError(err);
          assert.equal(found.isNew, false);
          assert.strictEqual(found.get('previous'), null);

          found.validate(function(err) {
            assert.ok(err instanceof MongooseError);
            assert.ok(err instanceof ValidationError);

            found.set('previous', 'yoyo');
            found.save(function(err) {
              assert.strictEqual(err, null);
              done();
            });
          });
        });
      });
    });

    it('nested', function(done) {
      const TestNestedValidation = db.model('Test', new Schema({
        nested: {
          required: { type: String, required: true }
        }
      }));

      const post = new TestNestedValidation();
      post.set('nested.required', null);

      post.save(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);

        post.set('nested.required', 'here');
        post.save(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    it('of nested subdocuments', function(done) {
      const Subsubdocs = new Schema({ required: { type: String, required: true } });

      const Subdocs = new Schema({
        required: { type: String, required: true },
        subs: [Subsubdocs]
      });

      const TestSubdocumentsValidation = db.model('Test', new Schema({
        items: [Subdocs]
      }));

      const post = new TestSubdocumentsValidation();

      post.get('items').push({ required: '', subs: [{ required: '' }] });

      post.save(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);
        assert.ok(err.errors['items.0.subs.0.required'] instanceof ValidatorError);
        assert.equal(err.errors['items.0.subs.0.required'].message, 'Path `required` is required.');
        assert.ok(post.errors['items.0.subs.0.required'] instanceof ValidatorError);
        assert.equal(post.errors['items.0.subs.0.required'].message, 'Path `required` is required.');

        assert.ok(err.errors['items.0.required']);
        assert.ok(post.errors['items.0.required']);

        post.items[0].subs[0].set('required', true);
        assert.equal(post.$__.validationError, undefined);

        post.save(function(err) {
          assert.ok(err);
          assert.ok(err.errors);
          assert.ok(err.errors['items.0.required'] instanceof ValidatorError);
          assert.equal(err.errors['items.0.required'].message, 'Path `required` is required.');

          assert.ok(!err.errors['items.0.subs.0.required']);
          assert.ok(!err.errors['items.0.subs.0.required']);
          assert.ok(!post.errors['items.0.subs.0.required']);
          assert.ok(!post.errors['items.0.subs.0.required']);

          post.get('items')[0].set('required', true);
          post.save(function(err) {
            assert.ok(!post.errors);
            assert.ifError(err);
            done();
          });
        });
      });
    });

    it('without saving', function(done) {
      const TestCallingValidation = db.model('Test', new Schema({
        item: { type: String, required: true }
      }));

      const post = new TestCallingValidation();

      assert.equal(post.schema.path('item').isRequired, true);
      assert.strictEqual(post.isNew, true);

      post.validate(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);
        assert.strictEqual(post.isNew, true);

        post.item = 'yo';
        post.validate(function(err) {
          assert.equal(err, null);
          assert.strictEqual(post.isNew, true);
          done();
        });
      });
    });

    it('when required is set to false', function(done) {
      function validator() {
        return true;
      }

      const TestV = db.model('Test', new Schema({
        result: { type: String, validate: [validator, 'chump validator'], required: false }
      }));

      const post = new TestV();

      assert.equal(post.schema.path('result').isRequired, false);
      done();
    });

    describe('middleware', function() {
      it('works', function(done) {
        let ValidationMiddlewareSchema = null,
            Post = null,
            post = null;

        ValidationMiddlewareSchema = new Schema({
          baz: { type: String }
        });

        ValidationMiddlewareSchema.pre('validate', function(next) {
          if (this.get('baz') === 'bad') {
            this.invalidate('baz', 'bad');
          }
          next();
        });

        Post = db.model('Test', ValidationMiddlewareSchema);
        post = new Post();
        post.set({ baz: 'bad' });

        post.save(function(err) {
          assert.ok(err instanceof MongooseError);
          assert.ok(err instanceof ValidationError);
          assert.equal(err.errors.baz.kind, 'user defined');
          assert.equal(err.errors.baz.path, 'baz');

          post.set('baz', 'good');
          post.save(function(err) {
            assert.ifError(err);
            done();
          });
        });
      });

      it('async', function(done) {
        let AsyncValidationMiddlewareSchema = null;
        let Post = null;
        let post = null;

        AsyncValidationMiddlewareSchema = new Schema({
          prop: { type: String }
        });

        AsyncValidationMiddlewareSchema.pre('validate', true, function(next, done) {
          const _this = this;
          setTimeout(function() {
            if (_this.get('prop') === 'bad') {
              _this.invalidate('prop', 'bad');
            }
            done();
          }, 5);
          next();
        });

        Post = db.model('Test', AsyncValidationMiddlewareSchema);
        post = new Post();
        post.set({ prop: 'bad' });

        post.save(function(err) {
          assert.ok(err instanceof MongooseError);
          assert.ok(err instanceof ValidationError);
          assert.equal(err.errors.prop.kind, 'user defined');
          assert.equal(err.errors.prop.path, 'prop');

          post.set('prop', 'good');
          post.save(function(err) {
            assert.ifError(err);
            done();
          });
        });
      });

      it('complex', function(done) {
        let ComplexValidationMiddlewareSchema = null;
        let Post = null;
        let post = null;
        const abc = v => v === 'abc';

        ComplexValidationMiddlewareSchema = new Schema({
          baz: { type: String },
          abc: { type: String, validate: [abc, 'must be abc'] },
          test: { type: String, validate: [/test/, 'must also be abc'] },
          required: { type: String, required: true }
        });

        ComplexValidationMiddlewareSchema.pre('validate', true, function(next, done) {
          const _this = this;
          setTimeout(function() {
            if (_this.get('baz') === 'bad') {
              _this.invalidate('baz', 'bad');
            }
            done();
          }, 5);
          next();
        });

        Post = db.model('Test', ComplexValidationMiddlewareSchema);
        post = new Post();
        post.set({
          baz: 'bad',
          abc: 'not abc',
          test: 'fail'
        });

        post.save(function(err) {
          assert.ok(err instanceof MongooseError);
          assert.ok(err instanceof ValidationError);
          assert.equal(Object.keys(err.errors).length, 4);
          assert.ok(err.errors.baz instanceof ValidatorError);
          assert.equal(err.errors.baz.kind, 'user defined');
          assert.equal(err.errors.baz.path, 'baz');
          assert.ok(err.errors.abc instanceof ValidatorError);
          assert.equal(err.errors.abc.kind, 'user defined');
          assert.equal(err.errors.abc.message, 'must be abc');
          assert.equal(err.errors.abc.path, 'abc');
          assert.ok(err.errors.test instanceof ValidatorError);
          assert.equal(err.errors.test.message, 'must also be abc');
          assert.equal(err.errors.test.kind, 'user defined');
          assert.equal(err.errors.test.path, 'test');
          assert.ok(err.errors.required instanceof ValidatorError);
          assert.equal(err.errors.required.kind, 'required');
          assert.equal(err.errors.required.path, 'required');

          post.set({
            baz: 'good',
            abc: 'abc',
            test: 'test',
            required: 'here'
          });

          post.save(function(err) {
            assert.ifError(err);
            done();
          });
        });
      });
    });
  });

  describe('defaults application', function() {
    it('works', function(done) {
      const now = Date.now();

      const TestDefaults = db.model('Test', new Schema({
        date: { type: Date, default: now }
      }));

      const post = new TestDefaults();
      assert.ok(post.get('date') instanceof Date);
      assert.equal(+post.get('date'), now);
      done();
    });

    it('nested', function(done) {
      const now = Date.now();

      const TestDefaults = db.model('Test', new Schema({
        nested: {
          date: { type: Date, default: now }
        }
      }));

      const post = new TestDefaults();
      assert.ok(post.get('nested.date') instanceof Date);
      assert.equal(+post.get('nested.date'), now);
      done();
    });

    it('subdocument', function(done) {
      const now = Date.now();

      const Items = new Schema({
        date: { type: Date, default: now }
      });

      const TestSubdocumentsDefaults = db.model('Test', new Schema({
        items: [Items]
      }));

      const post = new TestSubdocumentsDefaults();
      post.get('items').push({});
      assert.ok(post.get('items')[0].get('date') instanceof Date);
      assert.equal(+post.get('items')[0].get('date'), now);
      done();
    });

    it('allows nulls', function(done) {
      const T = db.model('Test', new Schema({ name: { type: String, default: null } }));
      const t = new T();

      assert.strictEqual(null, t.name);

      t.save(function(err) {
        assert.ifError(err);

        T.findById(t._id, function(err, t) {
          assert.ifError(err);
          assert.strictEqual(null, t.name);
          done();
        });
      });
    });
  });

  describe('virtuals', function() {
    it('getters', function(done) {
      const post = new BlogPost({
        title: 'Letters from Earth',
        author: 'Mark Twain'
      });

      assert.equal(post.get('titleWithAuthor'), 'Letters from Earth by Mark Twain');
      assert.equal(post.titleWithAuthor, 'Letters from Earth by Mark Twain');
      done();
    });

    it('set()', function(done) {
      const post = new BlogPost();

      post.set('titleWithAuthor', 'Huckleberry Finn by Mark Twain');
      assert.equal(post.get('title'), 'Huckleberry Finn');
      assert.equal(post.get('author'), 'Mark Twain');
      done();
    });

    it('should not be saved to the db', function(done) {
      const post = new BlogPost();

      post.set('titleWithAuthor', 'Huckleberry Finn by Mark Twain');

      post.save(function(err) {
        assert.ifError(err);

        BlogPost.findById(post.get('_id'), function(err, found) {
          assert.ifError(err);

          assert.equal(found.get('title'), 'Huckleberry Finn');
          assert.equal(found.get('author'), 'Mark Twain');
          assert.ok(!('titleWithAuthor' in found.toObject()));
          done();
        });
      });
    });

    it('nested', function(done) {
      const PersonSchema = new Schema({
        name: {
          first: String,
          last: String
        }
      });

      PersonSchema.
        virtual('name.full').
        get(function() {
          return this.get('name.first') + ' ' + this.get('name.last');
        }).
        set(function(fullName) {
          const split = fullName.split(' ');
          this.set('name.first', split[0]);
          this.set('name.last', split[1]);
        });

      const Person = db.model('Person', PersonSchema);
      const person = new Person({
        name: {
          first: 'Michael',
          last: 'Sorrentino'
        }
      });

      assert.equal(person.get('name.full'), 'Michael Sorrentino');
      person.set('name.full', 'The Situation');
      assert.equal(person.get('name.first'), 'The');
      assert.equal(person.get('name.last'), 'Situation');

      assert.equal(person.name.full, 'The Situation');
      person.name.full = 'Michael Sorrentino';
      assert.equal(person.name.first, 'Michael');
      assert.equal(person.name.last, 'Sorrentino');
      done();
    });
  });

  describe('.remove()', function() {
    it('works', function(done) {
      BlogPost.create({ title: 1 }, { title: 2 }, function(err) {
        assert.ifError(err);

        BlogPost.remove({ title: 1 }, function(err) {
          assert.ifError(err);

          BlogPost.find({}, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0].title, '2');
            done();
          });
        });
      });
    });

    it('errors when id deselected (gh-3118)', function(done) {
      BlogPost.create({ title: 1 }, { title: 2 }, function(err) {
        assert.ifError(err);
        BlogPost.findOne({ title: 1 }, { _id: 0 }, function(error, doc) {
          assert.ifError(error);
          doc.remove(function(err) {
            assert.ok(err);
            assert.equal(err.message, 'No _id found on document!');
            done();
          });
        });
      });
    });

    it('should not remove any records when deleting by id undefined', function(done) {
      BlogPost.create({ title: 1 }, { title: 2 }, function(err) {
        assert.ifError(err);

        BlogPost.remove({ _id: undefined }, function(err) {
          assert.ifError(err);
          BlogPost.find({}, function(err, found) {
            assert.equal(found.length, 2, 'Should not remove any records');
            done();
          });
        });
      });
    });

    it('should not remove all documents in the collection (gh-3326)', function(done) {
      BlogPost.create({ title: 1 }, { title: 2 }, function(err) {
        assert.ifError(err);
        BlogPost.findOne({ title: 1 }, function(error, doc) {
          assert.ifError(error);
          doc.remove(function(err) {
            assert.ifError(err);
            BlogPost.find(function(err, found) {
              assert.ifError(err);
              assert.equal(found.length, 1);
              assert.equal(found[0].title, '2');
              done();
            });
          });
        });
      });
    });
  });

  describe('#remove()', function() {
    it('passes the removed document (gh-1419)', function(done) {
      BlogPost.create({}, function(err, post) {
        assert.ifError(err);
        BlogPost.findById(post, function(err, found) {
          assert.ifError(err);

          found.remove(function(err, doc) {
            assert.ifError(err);
            assert.ok(doc);
            assert.ok(doc.equals(found));
            done();
          });
        });
      });
    });

    it('works as a promise', function(done) {
      BlogPost.create({}, function(err, post) {
        assert.ifError(err);
        BlogPost.findById(post, function(err, found) {
          assert.ifError(err);

          found.remove().then(function(doc) {
            assert.ok(doc);
            assert.ok(doc.equals(found));
            done();
          }).catch(done);
        });
      });
    });

    it('works as a promise with a hook', function(done) {
      let called = 0;
      const RHS = new Schema({
        name: String
      });
      RHS.pre('remove', function(next) {
        called++;
        return next();
      });

      const RH = db.model('Test', RHS);

      RH.create({ name: 'to be removed' }, function(err, post) {
        assert.ifError(err);
        assert.ok(post);
        RH.findById(post, function(err, found) {
          assert.ifError(err);
          assert.ok(found);

          found.remove().then(function(doc) {
            assert.ifError(err);
            assert.equal(called, 1);
            assert.ok(doc);
            assert.ok(doc.equals(found));
            done();
          }).catch(done);
        });
      });
    });

    it('handles query vs document middleware (gh-3054)', async function() {
      const schema = new Schema({ name: String });

      let docMiddleware = 0;
      let queryMiddleware = 0;

      schema.pre('remove', { query: true, document: false }, function() {
        ++queryMiddleware;
        assert.ok(this instanceof Model.Query);
      });

      schema.pre('remove', { query: false, document: true }, function() {
        ++docMiddleware;
        assert.ok(this instanceof Model);
      });

      const Model = db.model('Test', schema);


      const doc = await Model.create({ name: String });

      assert.equal(docMiddleware, 0);
      assert.equal(queryMiddleware, 0);
      await doc.remove();

      assert.equal(docMiddleware, 1);
      assert.equal(queryMiddleware, 0);

      await Model.remove({});
      assert.equal(docMiddleware, 1);
      assert.equal(queryMiddleware, 1);
    });

    describe('when called multiple times', function() {
      it('always executes the passed callback gh-1210', function(done) {
        const post = new BlogPost();

        post.save(function(err) {
          assert.ifError(err);

          let pending = 2;

          post.remove(function() {
            if (--pending) {
              return;
            }
            done();
          });
          post.remove(function() {
            if (--pending) {
              return;
            }
            done();
          });
        });
      });
    });
  });

  describe('getters', function() {
    it('with same name on embedded docs do not class', function(done) {
      const Post = new Schema({
        title: String,
        author: { name: String },
        subject: { name: String }
      });

      db.deleteModel(/BlogPost/);
      const PostModel = db.model('BlogPost', Post);

      const post = new PostModel({
        title: 'Test',
        author: { name: 'A' },
        subject: { name: 'B' }
      });

      assert.equal(post.author.name, 'A');
      assert.equal(post.subject.name, 'B');
      assert.equal(post.author.name, 'A');
      done();
    });

    it('should not be triggered at construction (gh-685)', function(done) {
      let called = false;

      const schema = new mongoose.Schema({
        number: {
          type: Number,
          set: function(x) {
            return x / 2;
          },
          get: function(x) {
            called = true;
            return x * 2;
          }
        }
      });

      const A = db.model('Test', schema);

      const a = new A({ number: 100 });
      assert.equal(called, false);
      let num = a.number;
      assert.equal(called, true);
      assert.equal(num.valueOf(), 100);
      assert.equal(a.$__getValue('number').valueOf(), 50);

      called = false;
      const b = new A();
      b.init({ number: 50 });
      assert.equal(called, false);
      num = b.number;
      assert.equal(called, true);
      assert.equal(num.valueOf(), 100);
      assert.equal(b.$__getValue('number').valueOf(), 50);
      done();
    });

    it('with type defined with { type: Native } (gh-190)', function(done) {
      const schema = new Schema({ date: { type: Date } });

      const ShortcutGetter = db.model('Test', schema);
      const post = new ShortcutGetter();

      post.set('date', Date.now());
      assert.ok(post.date instanceof Date);
      done();
    });

    describe('nested', function() {
      it('works', function(done) {
        const schema = new Schema({
          first: {
            second: [Number]
          }
        });
        const ShortcutGetterNested = db.model('Test', schema);
        const doc = new ShortcutGetterNested();

        assert.equal(typeof doc.first, 'object');
        assert.ok(doc.first.second.isMongooseArray);
        done();
      });

      it('works with object literals', function(done) {
        const date = new Date();

        const meta = {
          date: date,
          visitors: 5
        };

        const post = new BlogPost();
        post.init({
          meta: meta
        });

        assert.ok(post.get('meta').date instanceof Date);
        assert.ok(post.meta.date instanceof Date);

        let threw = false;
        let getter1;
        let getter2;
        try {
          JSON.stringify(meta);
          getter1 = JSON.stringify(post.get('meta'));
          getter2 = JSON.stringify(post.meta);
        } catch (err) {
          threw = true;
        }

        assert.equal(threw, false);
        getter1 = JSON.parse(getter1);
        getter2 = JSON.parse(getter2);
        assert.equal(getter1.visitors, 5);
        assert.equal(getter2.visitors, 5);
        assert.equal(getter1.date, getter2.date);

        post.meta.date = new Date() - 1000;
        assert.ok(post.meta.date instanceof Date);
        assert.ok(post.get('meta').date instanceof Date);

        post.meta.visitors = 2;
        assert.equal(typeof post.get('meta').visitors, 'number');
        assert.equal(typeof post.meta.visitors, 'number');

        const newmeta = {
          date: date - 2000,
          visitors: 234
        };

        post.set(newmeta, 'meta');

        assert.ok(post.meta.date instanceof Date);
        assert.ok(post.get('meta').date instanceof Date);
        assert.equal(typeof post.meta.visitors, 'number');
        assert.equal(typeof post.get('meta').visitors, 'number');
        assert.equal((+post.meta.date), date - 2000);
        assert.equal((+post.get('meta').date), date - 2000);
        assert.equal((+post.meta.visitors), 234);
        assert.equal((+post.get('meta').visitors), 234);

        // set object directly
        post.meta = {
          date: date - 3000,
          visitors: 4815162342
        };

        assert.ok(post.meta.date instanceof Date);
        assert.ok(post.get('meta').date instanceof Date);
        assert.equal(typeof post.meta.visitors, 'number');
        assert.equal(typeof post.get('meta').visitors, 'number');
        assert.equal((+post.meta.date), date - 3000);
        assert.equal((+post.get('meta').date), date - 3000);
        assert.equal((+post.meta.visitors), 4815162342);
        assert.equal((+post.get('meta').visitors), 4815162342);
        done();
      });

      it('object property access works when root initd with null', function(done) {
        const schema = new Schema({
          nest: {
            st: String
          }
        });

        const T = db.model('Test', schema);

        const t = new T({ nest: null });

        assert.strictEqual(t.nest.st, undefined);
        t.nest = { st: 'jsconf rules' };
        assert.deepEqual(t.nest.toObject(), { st: 'jsconf rules' });
        assert.equal(t.nest.st, 'jsconf rules');

        t.save(function(err) {
          assert.ifError(err);
          done();
        });
      });

      it('object property access works when root initd with undefined', function(done) {
        const schema = new Schema({
          nest: {
            st: String
          }
        });

        const T = db.model('Test', schema);

        const t = new T({ nest: undefined });

        assert.strictEqual(t.nest.st, undefined);
        t.nest = { st: 'jsconf rules' };
        assert.deepEqual(t.nest.toObject(), { st: 'jsconf rules' });
        assert.equal(t.nest.st, 'jsconf rules');

        t.save(function(err) {
          assert.ifError(err);
          done();
        });
      });

      it('pre-existing null object re-save', function(done) {
        const schema = new Schema({
          nest: {
            st: String,
            yep: String
          }
        });

        const T = db.model('Test', schema);

        const t = new T({ nest: null });

        t.save(function(err) {
          assert.ifError(err);

          t.nest = { st: 'jsconf rules', yep: 'it does' };

          // check that entire `nest` object is being $set
          const u = t.$__delta()[1];
          assert.ok(u.$set);
          assert.ok(u.$set.nest);
          assert.equal(Object.keys(u.$set.nest).length, 2);
          assert.ok(u.$set.nest.yep);
          assert.ok(u.$set.nest.st);

          t.save(function(err) {
            assert.ifError(err);

            T.findById(t.id, function(err, t) {
              assert.ifError(err);
              assert.equal(t.nest.st, 'jsconf rules');
              assert.equal(t.nest.yep, 'it does');

              t.nest = null;
              t.save(function(err) {
                assert.ifError(err);
                assert.strictEqual(t._doc.nest, null);
                done();
              });
            });
          });
        });
      });

      it('array of Mixed on existing doc can be pushed to', function(done) {
        const DooDad = db.model('Test', new Schema({
          nested: {
            arrays: []
          }
        }));
        const doodad = new DooDad({ nested: { arrays: [] } });
        const date = 1234567890;

        doodad.nested.arrays.push(['+10', 'yup', date]);

        doodad.save(function(err) {
          assert.ifError(err);

          DooDad.findById(doodad._id, function(err, doodad) {
            assert.ifError(err);

            assert.deepEqual(doodad.nested.arrays.toObject(), [['+10', 'yup', date]]);

            doodad.nested.arrays.push(['another', 1]);

            doodad.save(function(err) {
              assert.ifError(err);

              DooDad.findById(doodad._id, function(err, doodad) {
                assert.ifError(err);
                assert.deepEqual(doodad.nested.arrays.toObject(), [['+10', 'yup', date], ['another', 1]]);
                done();
              });
            });
          });
        });
      });

      it('props can be set directly when property was named "type"', function(done) {
        function def() {
          return [{ x: 1 }, { x: 2 }, { x: 3 }];
        }

        const DooDad = db.model('Test', new Schema({
          nested: {
            type: { type: String, default: 'yep' },
            array: {
              type: Array, default: def
            }
          }
        }));
        const doodad = new DooDad();

        doodad.save(function(err) {
          assert.ifError(err);

          DooDad.findById(doodad._id, function(err, doodad) {
            assert.ifError(err);

            assert.equal(doodad.nested.type, 'yep');
            assert.deepEqual(doodad.nested.array.toObject(), [{ x: 1 }, { x: 2 }, { x: 3 }]);

            doodad.nested.type = 'nope';
            doodad.nested.array = ['some', 'new', 'stuff'];

            doodad.save(function(err) {
              assert.ifError(err);

              DooDad.findById(doodad._id, function(err, doodad) {
                assert.ifError(err);
                assert.equal(doodad.nested.type, 'nope');
                assert.deepEqual(doodad.nested.array.toObject(), ['some', 'new', 'stuff']);
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('setters', function() {
    it('are used on embedded docs (gh-365 gh-390 gh-422)', function(done) {
      function setLat(val) {
        return parseInt(val, 10);
      }

      let tick = 0;

      function uptick() {
        return ++tick;
      }

      let Location = new Schema({
        lat: { type: Number, default: 0, set: setLat },
        long: { type: Number, set: uptick }
      });

      let Deal = new Schema({
        title: String,
        locations: [Location]
      });

      Location = db.model('Location', Location);
      Deal = db.model('Test', Deal);

      const location = new Location({ lat: 1.2, long: 10 });
      assert.equal(location.lat.valueOf(), 1);
      assert.equal(location.long.valueOf(), 1);

      const deal = new Deal({ title: 'My deal', locations: [{ lat: 1.2, long: 33 }] });
      assert.equal(deal.locations[0].lat.valueOf(), 1);
      assert.equal(deal.locations[0].long.valueOf(), 2);

      deal.save(function(err) {
        assert.ifError(err);
        Deal.findById(deal._id, function(err, deal) {
          assert.ifError(err);
          assert.equal(deal.locations[0].lat.valueOf(), 1);
          // GH-422
          assert.equal(deal.locations[0].long.valueOf(), 2);
          done();
        });
      });
    });
  });

  it('changing a number non-atomically (gh-203)', function(done) {
    const post = new BlogPost();

    post.meta.visitors = 5;

    post.save(function(err) {
      assert.ifError(err);

      BlogPost.findById(post._id, function(err, doc) {
        assert.ifError(err);

        doc.meta.visitors -= 2;

        doc.save(function(err) {
          assert.ifError(err);

          BlogPost.findById(post._id, function(err, doc) {
            assert.ifError(err);
            assert.equal(+doc.meta.visitors, 3);
            done();
          });
        });
      });
    });
  });

  describe('atomic subdocument', function() {
    it('saving', function(done) {
      let totalDocs = 4;
      const saveQueue = [];

      const post = new BlogPost();

      function complete() {
        BlogPost.findOne({ _id: post.get('_id') }, function(err, doc) {

          assert.ifError(err);
          assert.equal(doc.get('comments').length, 5);

          let v = doc.get('comments').some(function(comment) {
            return comment.get('title') === '1';
          });

          assert.ok(v);

          v = doc.get('comments').some(function(comment) {
            return comment.get('title') === '2';
          });

          assert.ok(v);

          v = doc.get('comments').some(function(comment) {
            return comment.get('title') === '3';
          });

          assert.ok(v);

          v = doc.get('comments').some(function(comment) {
            return comment.get('title') === '4';
          });

          assert.ok(v);

          v = doc.get('comments').some(function(comment) {
            return comment.get('title') === '5';
          });

          assert.ok(v);
          done();
        });
      }

      function save(doc) {
        saveQueue.push(doc);
        if (saveQueue.length === 4) {
          saveQueue.forEach(function(doc) {
            doc.save(function(err) {
              assert.ifError(err);
              --totalDocs || complete();
            });
          });
        }
      }

      post.save(function(err) {
        assert.ifError(err);

        BlogPost.findOne({ _id: post.get('_id') }, function(err, doc) {
          assert.ifError(err);
          doc.get('comments').push({ title: '1' });
          save(doc);
        });

        BlogPost.findOne({ _id: post.get('_id') }, function(err, doc) {
          assert.ifError(err);
          doc.get('comments').push({ title: '2' });
          save(doc);
        });

        BlogPost.findOne({ _id: post.get('_id') }, function(err, doc) {
          assert.ifError(err);
          doc.get('comments').push({ title: '3' });
          save(doc);
        });

        BlogPost.findOne({ _id: post.get('_id') }, function(err, doc) {
          assert.ifError(err);
          doc.get('comments').push({ title: '4' }, { title: '5' });
          save(doc);
        });
      });
    });

    it('setting (gh-310)', function(done) {
      BlogPost.create({
        comments: [{ title: 'first-title', body: 'first-body' }]
      }, function(err, blog) {
        assert.ifError(err);
        BlogPost.findById(blog.id, function(err, agent1blog) {
          assert.ifError(err);
          BlogPost.findById(blog.id, function(err, agent2blog) {
            assert.ifError(err);
            agent1blog.get('comments')[0].title = 'second-title';
            agent1blog.save(function(err) {
              assert.ifError(err);
              agent2blog.get('comments')[0].body = 'second-body';
              agent2blog.save(function(err) {
                assert.ifError(err);
                BlogPost.findById(blog.id, function(err, foundBlog) {
                  assert.ifError(err);
                  const comment = foundBlog.get('comments')[0];
                  assert.equal(comment.title, 'second-title');
                  assert.equal(comment.body, 'second-body');
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  it('doubly nested array saving and loading', function(done) {
    const Inner = new Schema({
      arr: [Number]
    });

    let Outer = new Schema({
      inner: [Inner]
    });
    Outer = db.model('Test', Outer);

    const outer = new Outer();
    outer.inner.push({});
    outer.save(function(err) {
      assert.ifError(err);
      assert.ok(outer.get('_id') instanceof DocumentObjectId);

      Outer.findById(outer.get('_id'), function(err, found) {
        assert.ifError(err);
        assert.equal(found.inner.length, 1);
        found.inner[0].arr.push(5);
        found.save(function(err) {
          assert.ifError(err);
          assert.ok(found.get('_id') instanceof DocumentObjectId);
          Outer.findById(found.get('_id'), function(err, found2) {
            assert.ifError(err);
            assert.equal(found2.inner.length, 1);
            assert.equal(found2.inner[0].arr.length, 1);
            assert.equal(found2.inner[0].arr[0], 5);
            done();
          });
        });
      });
    });
  });

  it('multiple number push() calls', function(done) {
    const schema = new Schema({
      nested: {
        nums: [Number]
      }
    });

    const Temp = db.model('Test', schema);

    Temp.create({}, function(err, t) {
      assert.ifError(err);
      t.nested.nums.push(1);
      t.nested.nums.push(2);

      assert.equal(t.nested.nums.length, 2);

      t.save(function(err) {
        assert.ifError(err);
        assert.equal(t.nested.nums.length, 2);
        Temp.findById(t._id, function(err) {
          assert.ifError(err);
          assert.equal(t.nested.nums.length, 2);
          done();
        });
      });
    });
  });

  it('multiple push() calls', function(done) {
    const schema = new Schema({
      nested: {
        nums: [Number]
      }
    });

    const Temp = db.model('Test', schema);

    Temp.create({}, function(err, t) {
      assert.ifError(err);
      t.nested.nums.push(1);
      t.nested.nums.push(2, 3);
      assert.equal(t.nested.nums.length, 3);

      t.save(function(err) {
        assert.ifError(err);
        assert.equal(t.nested.nums.length, 3);
        Temp.findById(t._id, function(err, found) {
          assert.ifError(err);
          assert.equal(found.nested.nums.length, 3);
          done();
        });
      });
    });
  });

  it('activePaths should be updated for nested modifieds', function(done) {
    const schema = new Schema({
      nested: {
        nums: [Number]
      }
    });

    const Temp = db.model('Test', schema);

    Temp.create({ nested: { nums: [1, 2, 3, 4, 5] } }, function(err, t) {
      assert.ifError(err);
      t.nested.nums.pull(1);
      t.nested.nums.pull(2);
      assert.equal(t.$__.activePaths.paths['nested.nums'], 'modify');
      done();
    });
  });


  it('activePaths should be updated for nested modifieds as promise', function(done) {
    const schema = new Schema({
      nested: {
        nums: [Number]
      }
    });

    const Temp = db.model('Test', schema);

    const p1 = Temp.create({ nested: { nums: [1, 2, 3, 4, 5] } });
    p1.then(function(t) {
      t.nested.nums.pull(1);
      t.nested.nums.pull(2);
      assert.equal(t.$__.activePaths.paths['nested.nums'], 'modify');
      done();
    }).catch(done);
  });

  it('$pull should affect what you see in an array before a save', function(done) {
    const schema = new Schema({
      nested: {
        nums: [Number]
      }
    });

    const Temp = db.model('Test', schema);

    Temp.create({ nested: { nums: [1, 2, 3, 4, 5] } }, function(err, t) {
      assert.ifError(err);
      t.nested.nums.pull(1);
      assert.equal(t.nested.nums.length, 4);
      done();
    });
  });

  it('$shift', function(done) {
    const schema = new Schema({
      nested: {
        nums: [Number]
      }
    });

    const Temp = db.model('Test', schema);

    Temp.create({ nested: { nums: [1, 2, 3] } }, function(err, t) {
      assert.ifError(err);

      Temp.findById(t._id, function(err, found) {
        assert.ifError(err);
        assert.equal(found.nested.nums.length, 3);
        found.nested.nums.$pop();
        assert.equal(found.nested.nums.length, 2);
        assert.equal(found.nested.nums[0], 1);
        assert.equal(found.nested.nums[1], 2);

        found.save(function(err) {
          assert.ifError(err);
          Temp.findById(t._id, function(err, found) {
            assert.ifError(err);
            assert.equal(found.nested.nums.length, 2);
            assert.equal(found.nested.nums[0], 1, 1);
            assert.equal(found.nested.nums[1], 2, 2);
            found.nested.nums.$shift();
            assert.equal(found.nested.nums.length, 1);
            assert.equal(found.nested.nums[0], 2);

            found.save(function(err) {
              assert.ifError(err);
              Temp.findById(t._id, function(err, found) {
                assert.ifError(err);
                assert.equal(found.nested.nums.length, 1);
                assert.equal(found.nested.nums[0], 2);
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('saving embedded arrays', function() {
    it('of Numbers atomically', function(done) {
      const TempSchema = new Schema({
        nums: [Number]
      });
      let totalDocs = 2;
      const saveQueue = [];

      const Temp = db.model('Test', TempSchema);

      const t = new Temp();

      function complete() {
        Temp.findOne({ _id: t.get('_id') }, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.get('nums').length, 3);

          let v = doc.get('nums').some(function(num) {
            return num.valueOf() === 1;
          });
          assert.ok(v);

          v = doc.get('nums').some(function(num) {
            return num.valueOf() === 2;
          });
          assert.ok(v);

          v = doc.get('nums').some(function(num) {
            return num.valueOf() === 3;
          });
          assert.ok(v);
          done();
        });
      }

      function save(doc) {
        saveQueue.push(doc);
        if (saveQueue.length === totalDocs) {
          saveQueue.forEach(function(doc) {
            doc.save(function(err) {
              assert.ifError(err);
              --totalDocs || complete();
            });
          });
        }
      }

      t.save(function(err) {
        assert.ifError(err);

        Temp.findOne({ _id: t.get('_id') }, function(err, doc) {
          assert.ifError(err);
          doc.get('nums').push(1);
          save(doc);
        });

        Temp.findOne({ _id: t.get('_id') }, function(err, doc) {
          assert.ifError(err);
          doc.get('nums').push(2, 3);
          save(doc);
        });
      });
    });

    it('of Strings atomically', function(done) {
      const StrListSchema = new Schema({
        strings: [String]
      });
      let totalDocs = 2;
      const saveQueue = [];

      const StrList = db.model('Test', StrListSchema);

      const t = new StrList();

      function complete() {
        StrList.findOne({ _id: t.get('_id') }, function(err, doc) {
          assert.ifError(err);

          assert.equal(doc.get('strings').length, 3);

          let v = doc.get('strings').some(function(str) {
            return str === 'a';
          });
          assert.ok(v);

          v = doc.get('strings').some(function(str) {
            return str === 'b';
          });
          assert.ok(v);

          v = doc.get('strings').some(function(str) {
            return str === 'c';
          });
          assert.ok(v);
          done();
        });
      }

      function save(doc) {
        saveQueue.push(doc);
        if (saveQueue.length === totalDocs) {
          saveQueue.forEach(function(doc) {
            doc.save(function(err) {
              assert.ifError(err);
              --totalDocs || complete();
            });
          });
        }
      }

      t.save(function(err) {
        assert.ifError(err);

        StrList.findOne({ _id: t.get('_id') }, function(err, doc) {
          assert.ifError(err);
          doc.get('strings').push('a');
          save(doc);
        });

        StrList.findOne({ _id: t.get('_id') }, function(err, doc) {
          assert.ifError(err);
          doc.get('strings').push('b', 'c');
          save(doc);
        });
      });
    });

    it('of Buffers atomically', function(done) {
      const BufListSchema = new Schema({
        buffers: [Buffer]
      });
      let totalDocs = 2;
      const saveQueue = [];

      const BufList = db.model('Test', BufListSchema);

      const t = new BufList();

      function complete() {
        BufList.findOne({ _id: t.get('_id') }, function(err, doc) {
          assert.ifError(err);

          assert.equal(doc.get('buffers').length, 3);

          let v = doc.get('buffers').some(function(buf) {
            return buf[0] === 140;
          });
          assert.ok(v);

          v = doc.get('buffers').some(function(buf) {
            return buf[0] === 141;
          });
          assert.ok(v);

          v = doc.get('buffers').some(function(buf) {
            return buf[0] === 142;
          });
          assert.ok(v);

          done();
        });
      }

      function save(doc) {
        saveQueue.push(doc);
        if (saveQueue.length === totalDocs) {
          saveQueue.forEach(function(doc) {
            doc.save(function(err) {
              assert.ifError(err);
              --totalDocs || complete();
            });
          });
        }
      }

      t.save(function(err) {
        assert.ifError(err);

        BufList.findOne({ _id: t.get('_id') }, function(err, doc) {
          assert.ifError(err);
          doc.get('buffers').push(Buffer.from([140]));
          save(doc);
        });

        BufList.findOne({ _id: t.get('_id') }, function(err, doc) {
          assert.ifError(err);
          doc.get('buffers').push(Buffer.from([141]), Buffer.from([142]));
          save(doc);
        });
      });
    });

    it('works with modified element properties + doc removal (gh-975)', function(done) {
      const B = BlogPost;
      const b = new B({ comments: [{ title: 'gh-975' }] });

      b.save(function(err) {
        assert.ifError(err);

        b.comments[0].title = 'changed';
        b.save(function(err) {
          assert.ifError(err);

          b.comments[0].remove();
          b.save(function(err) {
            assert.ifError(err);

            B.findByIdAndUpdate({ _id: b._id }, { $set: { comments: [{ title: 'a' }] } }, { new: true }, function(err, doc) {
              assert.ifError(err);
              doc.comments[0].title = 'differ';
              doc.comments[0].remove();
              doc.save(function(err) {
                assert.ifError(err);
                B.findById(doc._id, function(err, doc) {
                  assert.ifError(err);
                  assert.equal(doc.comments.length, 0);
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('updating an embedded document in an embedded array with set call', function(done) {
      BlogPost.create({
        comments: [{
          title: 'before-change'
        }]
      }, function(err, post) {
        assert.ifError(err);
        BlogPost.findById(post._id, function(err, found) {
          assert.ifError(err);
          assert.equal(found.comments[0].title, 'before-change');
          const subDoc = [{
            _id: found.comments[0]._id,
            title: 'after-change'
          }];
          found.set('comments', subDoc);

          found.save(function(err) {
            assert.ifError(err);
            BlogPost.findById(found._id, function(err, updated) {
              assert.ifError(err);
              assert.equal(updated.comments[0].title, 'after-change');
              done();
            });
          });
        });
      });
    });
  });

  it('updating an embedded document in an embedded array (gh-255)', function(done) {
    BlogPost.create({ comments: [{ title: 'woot' }] }, function(err, post) {
      assert.ifError(err);
      BlogPost.findById(post._id, function(err, found) {
        assert.ifError(err);
        assert.equal(found.comments[0].title, 'woot');
        found.comments[0].title = 'notwoot';
        found.save(function(err) {
          assert.ifError(err);
          BlogPost.findById(found._id, function(err, updated) {
            assert.ifError(err);
            assert.equal(updated.comments[0].title, 'notwoot');
            done();
          });
        });
      });
    });
  });

  it('updating an embedded array document to an Object value (gh-334)', function(done) {
    const SubSchema = new Schema({
      name: String,
      subObj: { subName: String }
    });
    const GH334Schema = new Schema({ name: String, arrData: [SubSchema] });

    const AModel = db.model('Test', GH334Schema);
    const instance = new AModel();

    instance.set({ name: 'name-value', arrData: [{ name: 'arrName1', subObj: { subName: 'subName1' } }] });
    instance.save(function(err) {
      assert.ifError(err);
      AModel.findById(instance.id, function(err, doc) {
        assert.ifError(err);
        doc.arrData[0].set('subObj', { subName: 'modified subName' });
        doc.save(function(err) {
          assert.ifError(err);
          AModel.findById(instance.id, function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.arrData[0].subObj.subName, 'modified subName');
            done();
          });
        });
      });
    });
  });

  it('saving an embedded document twice should not push that doc onto the parent doc twice (gh-267)', function(done) {
    const post = new BlogPost();

    post.comments.push({ title: 'woot' });
    post.save(function(err) {
      assert.ifError(err);
      assert.equal(post.comments.length, 1);
      BlogPost.findById(post.id, function(err, found) {
        assert.ifError(err);
        assert.equal(found.comments.length, 1);
        post.save(function(err) {
          assert.ifError(err);
          assert.equal(post.comments.length, 1);
          BlogPost.findById(post.id, function(err, found) {
            assert.ifError(err);
            assert.equal(found.comments.length, 1);
            done();
          });
        });
      });
    });
  });

  describe('embedded array filtering', function() {
    it('by the id shortcut function', function(done) {
      const post = new BlogPost();

      post.comments.push({ title: 'woot' });
      post.comments.push({ title: 'aaaa' });

      const subdoc1 = post.comments[0];
      const subdoc2 = post.comments[1];

      post.save(function(err) {
        assert.ifError(err);

        BlogPost.findById(post.get('_id'), function(err, doc) {
          assert.ifError(err);

          // test with an objectid
          assert.equal(doc.comments.id(subdoc1.get('_id')).title, 'woot');

          // test with a string
          const id = subdoc2._id.toString();
          assert.equal(doc.comments.id(id).title, 'aaaa');
          done();
        });
      });
    });

    it('by the id with cast error', function(done) {
      const post = new BlogPost();

      post.save(function(err) {
        assert.ifError(err);

        BlogPost.findById(post.get('_id'), function(err, doc) {
          assert.ifError(err);
          assert.strictEqual(doc.comments.id(null), null);
          done();
        });
      });
    });

    it('by the id shortcut with no match', function(done) {
      const post = new BlogPost();

      post.save(function(err) {
        assert.ifError(err);

        BlogPost.findById(post.get('_id'), function(err, doc) {
          assert.ifError(err);
          assert.strictEqual(doc.comments.id(new DocumentObjectId()), null);
          done();
        });
      });
    });
  });

  it('removing a subdocument atomically', function(done) {
    const post = new BlogPost();
    post.title = 'hahaha';
    post.comments.push({ title: 'woot' });
    post.comments.push({ title: 'aaaa' });

    post.save(function(err) {
      assert.ifError(err);

      BlogPost.findById(post.get('_id'), function(err, doc) {
        assert.ifError(err);

        doc.comments[0].remove();
        doc.save(function(err) {
          assert.ifError(err);

          BlogPost.findById(post.get('_id'), function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.comments.length, 1);
            assert.equal(doc.comments[0].title, 'aaaa');
            done();
          });
        });
      });
    });
  });

  it('single pull embedded doc', function(done) {
    const post = new BlogPost();
    post.title = 'hahaha';
    post.comments.push({ title: 'woot' });
    post.comments.push({ title: 'aaaa' });

    post.save(function(err) {
      assert.ifError(err);

      BlogPost.findById(post.get('_id'), function(err, doc) {
        assert.ifError(err);

        doc.comments.pull(doc.comments[0]);
        doc.comments.pull(doc.comments[0]);
        doc.save(function(err) {
          assert.ifError(err);

          BlogPost.findById(post.get('_id'), function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.comments.length, 0);
            done();
          });
        });
      });
    });
  });

  it('saving mixed data', function(done) {
    let count = 3;

    // string
    const post = new BlogPost();
    post.mixed = 'woot';
    post.save(function(err) {
      assert.ifError(err);

      BlogPost.findById(post._id, function(err) {
        assert.ifError(err);
        if (--count) {
          return;
        }
        done();
      });
    });

    // array
    const post2 = new BlogPost();
    post2.mixed = { name: 'mr bungle', arr: [] };
    post2.save(function(err) {
      assert.ifError(err);

      BlogPost.findById(post2._id, function(err, doc) {
        assert.ifError(err);

        assert.equal(Array.isArray(doc.mixed.arr), true);

        doc.mixed = [{ foo: 'bar' }];
        doc.save(function(err) {
          assert.ifError(err);

          BlogPost.findById(doc._id, function(err, doc) {
            assert.ifError(err);

            assert.equal(Array.isArray(doc.mixed), true);
            doc.mixed.push({ hello: 'world' });
            doc.mixed.push(['foo', 'bar']);
            doc.markModified('mixed');

            doc.save(function(err) {
              assert.ifError(err);

              BlogPost.findById(post2._id, function(err, doc) {
                assert.ifError(err);

                assert.deepEqual(doc.mixed[0], { foo: 'bar' });
                assert.deepEqual(doc.mixed[1], { hello: 'world' });
                assert.deepEqual(doc.mixed[2], ['foo', 'bar']);
                if (--count) {
                  return;
                }
                done();
              });
            });
          });

          // date
          const post3 = new BlogPost();
          post3.mixed = new Date();
          post3.save(function(err) {
            assert.ifError(err);

            BlogPost.findById(post3._id, function(err, doc) {
              assert.ifError(err);
              assert.ok(doc.mixed instanceof Date);
              if (--count) {
                return;
              }
              done();
            });
          });
        });
      });
    });
  });

  it('populating mixed data from the constructor (gh-200)', function(done) {
    const post = new BlogPost({
      mixed: {
        type: 'test',
        github: 'rules',
        nested: {
          number: 3
        }
      }
    });

    assert.equal(post.mixed.type, 'test');
    assert.equal(post.mixed.github, 'rules');
    assert.equal(post.mixed.nested.number, 3);
    done();
  });

  it('"type" is allowed as a key', function(done) {
    mongoose.model('TestTypeDefaults', new Schema({
      type: { type: String, default: 'YES!' }
    }));

    const TestDefaults = db.model('Test', new Schema({
      type: { type: String, default: 'YES!' }
    }));

    let post = new TestDefaults();
    assert.equal(typeof post.get('type'), 'string');
    assert.equal(post.get('type'), 'YES!');

    // GH-402
    db.deleteModel('Test');
    const TestDefaults2 = db.model('Test', new Schema({
      x: { y: { type: { type: String }, owner: String } }
    }));

    post = new TestDefaults2();
    post.x.y.type = '#402';
    post.x.y.owner = 'me';
    post.save(function(err) {
      assert.ifError(err);
      done();
    });
  });

  it('unaltered model does not clear the doc (gh-195)', function(done) {
    const post = new BlogPost();
    post.title = 'woot';
    post.save(function(err) {
      assert.ifError(err);

      BlogPost.findById(post._id, function(err, doc) {
        assert.ifError(err);

        // we deliberately make no alterations
        doc.save(function(err) {
          assert.ifError(err);

          BlogPost.findById(doc._id, function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.title, 'woot');
            done();
          });
        });
      });
    });
  });

  describe('hooks', function() {
    describe('pre', function() {
      it('with undefined and null', function(done) {
        const schema = new Schema({ name: String });
        let called = 0;

        schema.pre('save', function(next) {
          called++;
          next(undefined);
        });

        schema.pre('save', function(next) {
          called++;
          next(null);
        });

        const S = db.model('Test', schema);
        const s = new S({ name: 'zupa' });

        s.save(function(err) {
          assert.ifError(err);
          assert.equal(called, 2);
          done();
        });
      });


      it('with an async waterfall', function(done) {
        const schema = new Schema({ name: String });
        let called = 0;

        schema.pre('save', true, function(next, done) {
          called++;
          process.nextTick(function() {
            next();
            done();
          });
        });

        schema.pre('save', function(next) {
          called++;
          return next();
        });

        const S = db.model('Test', schema);
        const s = new S({ name: 'zupa' });

        const p = s.save();
        p.then(function() {
          assert.equal(called, 2);
          done();
        }).catch(done);
      });


      it('called on all sub levels', function(done) {
        const grandSchema = new Schema({ name: String });
        grandSchema.pre('save', function(next) {
          this.name = 'grand';
          next();
        });

        const childSchema = new Schema({ name: String, grand: [grandSchema] });
        childSchema.pre('save', function(next) {
          this.name = 'child';
          next();
        });

        const schema = new Schema({ name: String, child: [childSchema] });

        schema.pre('save', function(next) {
          this.name = 'parent';
          next();
        });

        const S = db.model('Test', schema);
        const s = new S({ name: 'a', child: [{ name: 'b', grand: [{ name: 'c' }] }] });

        s.save(function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.name, 'parent');
          assert.equal(doc.child[0].name, 'child');
          assert.equal(doc.child[0].grand[0].name, 'grand');
          done();
        });
      });


      it('error on any sub level', function(done) {
        const grandSchema = new Schema({ name: String });
        grandSchema.pre('save', function(next) {
          next(new Error('Error 101'));
        });

        const childSchema = new Schema({ name: String, grand: [grandSchema] });
        childSchema.pre('save', function(next) {
          this.name = 'child';
          next();
        });

        const schema = new Schema({ name: String, child: [childSchema] });
        schema.pre('save', function(next) {
          this.name = 'parent';
          next();
        });

        const S = db.model('Test', schema);
        const s = new S({ name: 'a', child: [{ name: 'b', grand: [{ name: 'c' }] }] });

        s.save(function(err) {
          assert.ok(err instanceof Error);
          assert.equal(err.message, 'Error 101');
          done();
        });
      });

      describe('init', function() {
        it('has access to the true ObjectId when used with querying (gh-289)', function(done) {
          const PreInitSchema = new Schema({});
          let preId = null;

          PreInitSchema.pre('init', function() {
            preId = this._id;
          });

          const PreInit = db.model('Test', PreInitSchema);

          const doc = new PreInit();
          doc.save(function(err) {
            assert.ifError(err);
            PreInit.findById(doc._id, function(err) {
              assert.ifError(err);
              assert.strictEqual(undefined, preId);
              done();
            });
          });
        });
      });
    });

    describe('post', function() {
      it('works', function(done) {
        const schema = new Schema({
          title: String
        });
        let save = false;
        let remove = false;
        let init = false;
        let post = undefined;

        schema.post('save', function(arg) {
          assert.equal(arg.id, post.id);
          save = true;
        });

        schema.post('init', function() {
          init = true;
        });

        schema.post('remove', function(arg) {
          assert.equal(arg.id, post.id);
          remove = true;
        });

        const BlogPost = db.model('Test', schema);

        post = new BlogPost();

        post.save(function(err) {
          process.nextTick(function() {
            assert.ifError(err);
            assert.ok(save);
            BlogPost.findById(post._id, function(err, doc) {
              process.nextTick(function() {
                assert.ifError(err);
                assert.ok(init);

                doc.remove(function(err) {
                  process.nextTick(function() {
                    assert.ifError(err);
                    assert.ok(remove);
                    done();
                  });
                });
              });
            });
          });
        });
      });

      it('on embedded docs', function(done) {
        let save = false;

        const EmbeddedSchema = new Schema({
          title: String
        });

        EmbeddedSchema.post('save', function() {
          save = true;
        });

        const ParentSchema = new Schema({
          embeds: [EmbeddedSchema]
        });

        const Parent = db.model('Parent', ParentSchema);

        const parent = new Parent();

        parent.embeds.push({ title: 'Testing post hooks for embedded docs' });

        parent.save(function(err) {
          assert.ifError(err);
          assert.ok(save);
          done();
        });
      });
    });
  });

  describe('#exec()', function() {
    it.skip('count()', function(done) {
      BlogPost.create({ title: 'interoperable count as promise' }, function(err) {
        assert.ifError(err);
        const query = BlogPost.count({ title: 'interoperable count as promise' });
        query.exec(function(err, count) {
          assert.ifError(err);
          assert.equal(count, 1);
          done();
        });
      });
    });

    it('countDocuments()', function() {
      return BlogPost.create({ title: 'foo' }).
        then(() => BlogPost.countDocuments({ title: 'foo' }).exec()).
        then(count => {
          assert.equal(count, 1);
        });
    });

    it('estimatedDocumentCount()', function() {
      return BlogPost.create({ title: 'foo' }).
        then(() => BlogPost.estimatedDocumentCount({ title: 'foo' }).exec()).
        then(count => {
          assert.equal(count, 1);
        });
    });

    it('update()', function(done) {
      BlogPost.create({ title: 'interoperable update as promise' }, function(err) {
        assert.ifError(err);
        const query = BlogPost.update({ title: 'interoperable update as promise' }, { title: 'interoperable update as promise delta' });
        query.exec(function(err, res) {
          assert.ifError(err);
          assert.equal(res.matchedCount, 1);
          assert.equal(res.modifiedCount, 1);
          BlogPost.count({ title: 'interoperable update as promise delta' }, function(err, count) {
            assert.ifError(err);
            assert.equal(count, 1);
            done();
          });
        });
      });
    });

    it('findOne()', function(done) {
      BlogPost.create({ title: 'interoperable findOne as promise' }, function(err, created) {
        assert.ifError(err);
        const query = BlogPost.findOne({ title: 'interoperable findOne as promise' });
        query.exec(function(err, found) {
          assert.ifError(err);
          assert.equal(found.id, created.id);
          done();
        });
      });
    });

    it('find()', function(done) {
      BlogPost.create(
        { title: 'interoperable find as promise' },
        { title: 'interoperable find as promise' },
        function(err, createdOne, createdTwo) {
          assert.ifError(err);
          const query = BlogPost.find({ title: 'interoperable find as promise' }).sort('_id');
          query.exec(function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 2);
            const ids = {};
            ids[String(found[0]._id)] = 1;
            ids[String(found[1]._id)] = 1;
            assert.ok(String(createdOne._id) in ids);
            assert.ok(String(createdTwo._id) in ids);
            done();
          });
        });
    });

    it.skip('remove()', function(done) {
      BlogPost.create(
        { title: 'interoperable remove as promise' },
        function(err) {
          assert.ifError(err);
          const query = BlogPost.remove({ title: 'interoperable remove as promise' });
          query.exec(function(err) {
            assert.ifError(err);
            BlogPost.count({ title: 'interoperable remove as promise' }, function(err, count) {
              assert.equal(count, 0);
              done();
            });
          });
        });
    });

    it('op can be changed', function(done) {
      const title = 'interop ad-hoc as promise';

      BlogPost.create({ title: title }, function(err, created) {
        assert.ifError(err);
        const query = BlogPost.count({ title: title });
        query.exec('findOne', function(err, found) {
          assert.ifError(err);
          assert.equal(found.id, created.id);
          done();
        });
      });
    });

    describe('promises', function() {
      it.skip('count()', function(done) {
        BlogPost.create({ title: 'interoperable count as promise 2' }, function(err) {
          assert.ifError(err);
          const query = BlogPost.count({ title: 'interoperable count as promise 2' });
          const promise = query.exec();
          promise.then(function(count) {
            assert.equal(count, 1);
            done();
          }).catch(done);
        });
      });

      it.skip('update()', function(done) {
        BlogPost.create({ title: 'interoperable update as promise 2' }, function(err) {
          assert.ifError(err);
          const query = BlogPost.update({ title: 'interoperable update as promise 2' }, { title: 'interoperable update as promise delta 2' });
          const promise = query.exec();
          promise.then(function() {
            BlogPost.count({ title: 'interoperable update as promise delta 2' }, function(err, count) {
              assert.ifError(err);
              assert.equal(count, 1);
              done();
            });
          });
        });
      });

      it('findOne()', function() {
        let created;
        return BlogPost.create({ title: 'interoperable findOne as promise 2' }).
          then(doc => {
            created = doc;
            return BlogPost.
              findOne({ title: 'interoperable findOne as promise 2' }).
              exec();
          }).
          then(found => {
            assert.equal(found.id, created.id);
          });
      });

      it('find()', function(done) {
        BlogPost.create(
          { title: 'interoperable find as promise 2' },
          { title: 'interoperable find as promise 2' },
          function(err, createdOne, createdTwo) {
            assert.ifError(err);
            const query = BlogPost.find({ title: 'interoperable find as promise 2' }).sort('_id');
            const promise = query.exec();
            promise.then(function(found) {
              assert.ifError(err);
              assert.equal(found.length, 2);
              assert.equal(found[0].id, createdOne.id);
              assert.equal(found[1].id, createdTwo.id);
              done();
            }).catch(done);
          });
      });

      it.skip('remove()', function() {
        return BlogPost.create({ title: 'interoperable remove as promise 2' }).
          then(() => {
            return BlogPost.remove({ title: 'interoperable remove as promise 2' });
          }).
          then(() => {
            return BlogPost.count({ title: 'interoperable remove as promise 2' });
          }).
          then(count => {
            assert.equal(count, 0);
          });
      });

      it('are thenable', function(done) {
        const peopleSchema = new Schema({ name: String, likes: ['ObjectId'] });
        const P = db.model('Test', peopleSchema);
        BlogPost.create(
          { title: 'then promise 1' },
          { title: 'then promise 2' },
          { title: 'then promise 3' },
          function(err, d1, d2, d3) {
            assert.ifError(err);

            P.create(
              { name: 'brandon', likes: [d1] },
              { name: 'ben', likes: [d2] },
              { name: 'bernie', likes: [d3] },
              function(err) {
                assert.ifError(err);

                const promise = BlogPost.find({ title: /^then promise/ }).select('_id').exec();
                promise.then(function(blogs) {
                  const ids = blogs.map(function(m) {
                    return m._id;
                  });
                  return P.where('likes').in(ids).exec();
                }).then(function(people) {
                  assert.equal(people.length, 3);
                  return people;
                }).then(function() {
                  done();
                }, function(err) {
                  done(new Error(err));
                });
              });
          });
      });
    });
  });

  describe('console.log', function() {
    it('hides private props', function(done) {
      const date = new Date(1305730951086);
      const id0 = new DocumentObjectId('4dd3e169dbfb13b4570000b9');
      const id1 = new DocumentObjectId('4dd3e169dbfb13b4570000b6');
      const id2 = new DocumentObjectId('4dd3e169dbfb13b4570000b7');
      const id3 = new DocumentObjectId('4dd3e169dbfb13b4570000b8');

      const post = new BlogPost({
        title: 'Test',
        _id: id0,
        date: date,
        numbers: [5, 6, 7],
        owners: [id1],
        meta: { visitors: 45 },
        comments: [
          { _id: id2, title: 'my comment', date: date, body: 'this is a comment' },
          { _id: id3, title: 'the next thang', date: date, body: 'this is a comment too!' }]
      });

      const out = post.inspect();
      assert.equal(out.meta.visitors, post.meta.visitors);
      assert.deepEqual(out.numbers, Array.prototype.slice.call(post.numbers));
      assert.equal(out.date.valueOf(), post.date.valueOf());
      assert.equal(out.activePaths, undefined);
      done();
    });
  });

  describe('pathnames', function() {
    it('named path can be used', function(done) {
      const P = db.model('Test', new Schema({ path: String }));

      let threw = false;
      try {
        new P({ path: 'i should not throw' });
      } catch (err) {
        threw = true;
      }

      assert.ok(!threw);
      done();
    });
  });

  it('subdocuments with changed values should persist the values', function(done) {
    const Subdoc = new Schema({ name: String, mixed: Schema.Types.Mixed });
    const T = db.model('Test', new Schema({ subs: [Subdoc] }));

    const t = new T({ subs: [{ name: 'Hubot', mixed: { w: 1, x: 2 } }] });
    assert.equal(t.subs[0].name, 'Hubot');
    assert.equal(t.subs[0].mixed.w, 1);
    assert.equal(t.subs[0].mixed.x, 2);

    t.save(function(err) {
      assert.ifError(err);

      T.findById(t._id, function(err, t) {
        assert.ifError(err);
        assert.equal(t.subs[0].name, 'Hubot');
        assert.equal(t.subs[0].mixed.w, 1);
        assert.equal(t.subs[0].mixed.x, 2);

        const sub = t.subs[0];
        sub.name = 'Hubot1';
        assert.equal(sub.name, 'Hubot1');
        assert.ok(sub.isModified('name'));
        assert.ok(t.isModified());

        t.save(function(err) {
          assert.ifError(err);

          T.findById(t._id, function(err, t) {
            assert.ifError(err);
            assert.strictEqual(t.subs[0].name, 'Hubot1');

            const sub = t.subs[0];
            sub.mixed.w = 5;
            assert.equal(sub.mixed.w, 5);
            assert.ok(!sub.isModified('mixed'));
            sub.markModified('mixed');
            assert.ok(sub.isModified('mixed'));
            assert.ok(sub.isModified());
            assert.ok(t.isModified());

            t.save(function(err) {
              assert.ifError(err);

              T.findById(t._id, function(err, t) {
                assert.ifError(err);
                assert.strictEqual(t.subs[0].mixed.w, 5);
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('RegExps', function() {
    it('can be saved', function(done) {
      const post = new BlogPost({ mixed: { rgx: /^asdf$/ } });
      assert.ok(post.mixed.rgx instanceof RegExp);
      assert.equal(post.mixed.rgx.source, '^asdf$');
      post.save(function(err) {
        assert.ifError(err);
        BlogPost.findById(post._id, function(err, post) {
          assert.ifError(err);
          assert.ok(post.mixed.rgx instanceof RegExp);
          assert.equal(post.mixed.rgx.source, '^asdf$');
          done();
        });
      });
    });
  });

  // Demonstration showing why GH-261 is a misunderstanding
  it('a single instantiated document should be able to update its embedded documents more than once', function(done) {
    const post = new BlogPost();
    post.comments.push({ title: 'one' });
    post.save(function(err) {
      assert.ifError(err);
      assert.equal(post.comments[0].title, 'one');
      post.comments[0].title = 'two';
      assert.equal(post.comments[0].title, 'two');
      post.save(function(err) {
        assert.ifError(err);
        BlogPost.findById(post._id, function(err, found) {
          assert.ifError(err);
          assert.equal(found.comments[0].title, 'two');
          done();
        });
      });
    });
  });

  describe('save()', function() {
    describe('when no callback is passed', function() {
      it('should emit error on its Model when there are listeners', function(done) {
        const DefaultErrSchema = new Schema({});
        DefaultErrSchema.pre('save', function(next) {
          next(new Error());
        });

        const DefaultErr = db.model('Test', DefaultErrSchema);

        DefaultErr.on('error', function(err) {
          assert.ok(err instanceof Error);
          done();
        });

        new DefaultErr().save().catch(() => {});
      });
    });

    it('saved changes made within callback of a previous no-op save gh-1139', function(done) {
      const post = new BlogPost({ title: 'first' });
      post.save(function(err) {
        assert.ifError(err);

        // no op
        post.save(function(err) {
          assert.ifError(err);

          post.title = 'changed';
          post.save(function(err) {
            assert.ifError(err);

            BlogPost.findById(post, function(err, doc) {
              assert.ifError(err);
              assert.equal(doc.title, 'changed');
              done();
            });
          });
        });
      });
    });

    it('rejects new documents that have no _id set (1595)', function(done) {
      const s = new Schema({ _id: { type: String } });
      const B = db.model('Test', s);
      const b = new B();
      b.save(function(err) {
        assert.ok(err);
        assert.ok(/must have an _id/.test(err));
        done();
      });
    });

    it('no TypeError when attempting to save more than once after using atomics', function(done) {
      const M = db.model('Test', new Schema({
        test: { type: 'string', unique: true },
        elements: [{
          el: { type: 'string', required: true }
        }]
      }));
      const a = new M({
        test: 'a',
        elements: [{ el: 'b' }]
      });
      const b = new M({
        test: 'b',
        elements: [{ el: 'c' }]
      });
      M.init(function() {
        a.save(function() {
          b.save(function() {
            b.elements.push({ el: 'd' });
            b.test = 'a';
            b.save(function(error, res) {
              assert.ok(error);
              assert.strictEqual(res, undefined);
              b.save(function(error, res) {
                assert.ok(error);
                assert.strictEqual(res, undefined);
                M.collection.drop(done);
              });
            });
          });
        });
      });
    });
    it('should clear $versionError and saveOptions after saved (gh-8040)', function(done) {
      const schema = new Schema({ name: String });
      const Model = db.model('Test', schema);
      const doc = new Model({
        name: 'Fonger'
      });

      const savePromise = doc.save();
      assert.ok(doc.$__.$versionError);
      assert.ok(doc.$__.saveOptions);

      savePromise.then(function() {
        assert.ok(!doc.$__.$versionError);
        assert.ok(!doc.$__.saveOptions);
        done();
      }).catch(done);
    });
  });


  describe('_delta()', function() {
    it('should overwrite arrays when directly set (gh-1126)', function(done) {
      BlogPost.create({ title: 'gh-1126', numbers: [1, 2] }, function(err, b) {
        assert.ifError(err);
        BlogPost.findById(b._id, function(err, b) {
          assert.ifError(err);
          assert.deepEqual([1, 2].join(), b.numbers.join());

          b.numbers = [];
          b.numbers.push(3);

          const d = b.$__delta()[1];
          assert.ok('$set' in d, 'invalid delta ' + JSON.stringify(d));
          assert.ok(Array.isArray(d.$set.numbers));
          assert.equal(d.$set.numbers.length, 1);
          assert.equal(d.$set.numbers[0], 3);

          b.save(function(err) {
            assert.ifError(err);

            BlogPost.findById(b._id, function(err, b) {
              assert.ifError(err);
              assert.ok(Array.isArray(b.numbers));
              assert.equal(b.numbers.length, 1);
              assert.equal(b.numbers[0], 3);

              b.numbers = [3];
              const d = b.$__delta();
              assert.ok(!d);

              b.numbers = [4];
              b.numbers.push(5);
              b.save(function(err) {
                assert.ifError(err);
                BlogPost.findById(b._id, function(err, b) {
                  assert.ifError(err);
                  assert.ok(Array.isArray(b.numbers));
                  assert.equal(b.numbers.length, 2);
                  assert.equal(b.numbers[0], 4);
                  assert.equal(b.numbers[1], 5);
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('should use $set when subdoc changed before pulling (gh-1303)', function(done) {
      const B = BlogPost;
      B.create(
        { title: 'gh-1303', comments: [{ body: 'a' }, { body: 'b' }, { body: 'c' }] },
        function(err, b) {
          assert.ifError(err);
          B.findById(b._id, function(err, b) {
            assert.ifError(err);

            b.comments[2].body = 'changed';
            b.comments.pull(b.comments[1]);

            assert.equal(b.comments.length, 2);
            assert.equal(b.comments[0].body, 'a');
            assert.equal(b.comments[1].body, 'changed');

            const d = b.$__delta()[1];
            assert.ok('$set' in d, 'invalid delta ' + JSON.stringify(d));
            assert.ok(Array.isArray(d.$set.comments));
            assert.equal(d.$set.comments.length, 2);

            b.save(function(err) {
              assert.ifError(err);

              B.findById(b._id, function(err, b) {
                assert.ifError(err);
                assert.ok(Array.isArray(b.comments));
                assert.equal(b.comments.length, 2);
                assert.equal(b.comments[0].body, 'a');
                assert.equal(b.comments[1].body, 'changed');
                done();
              });
            });
          });
        });
    });
  });

  describe('backward compatibility', function() {
    it('with conflicted data in db', function(done) {
      const M = db.model('Test', new Schema({ namey: { first: String, last: String } }));
      const m = new M({ namey: '[object Object]' });
      m.namey = { first: 'GI', last: 'Joe' };// <-- should overwrite the string
      m.save(function(err) {
        assert.strictEqual(err, null);
        assert.strictEqual('GI', m.namey.first);
        assert.strictEqual('Joe', m.namey.last);
        done();
      });
    });

    it('with positional notation on path not existing in schema (gh-1048)', function(done) {
      const M = db.model('Test', Schema({ name: 'string' }));
      const o = {
        name: 'gh-1048',
        _id: new mongoose.Types.ObjectId(),
        databases: {
          0: { keys: 100, expires: 0 },
          15: { keys: 1, expires: 0 }
        }
      };

      M.updateOne({ _id: o._id }, o, { upsert: true, strict: false }, function(err) {
        assert.ifError(err);
        M.findById(o._id, function(err, doc) {
          assert.ifError(err);
          assert.ok(doc);
          assert.ok(doc._doc.databases);
          assert.ok(doc._doc.databases['0']);
          assert.ok(doc._doc.databases['15']);
          assert.equal(doc.databases, undefined);
          done();
        });
      });
    });
  });

  describe('non-schema adhoc property assignments', function() {
    it('are not saved', function(done) {
      const B = BlogPost;

      const b = new B();
      b.whateveriwant = 10;
      b.save(function(err) {
        assert.ifError(err);
        B.collection.findOne({ _id: b._id }, function(err, doc) {
          assert.ifError(err);
          assert.ok(!('whateveriwant' in doc));
          done();
        });
      });
    });
  });

  it('should not throw range error when using Number _id and saving existing doc (gh-691)', function(done) {
    const T = new Schema({ _id: Number, a: String });
    const D = db.model('Test', T);
    const d = new D({ _id: 1 });
    d.save(function(err) {
      assert.ifError(err);

      D.findById(d._id, function(err, d) {
        assert.ifError(err);

        d.a = 'yo';
        d.save(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });
  });

  describe('setting an unset value', function() {
    it('is saved (gh-742)', function(done) {
      const DefaultTestObject = db.model('Test',
        new Schema({
          score: { type: Number, default: 55 }
        })
      );

      const myTest = new DefaultTestObject();

      myTest.save(function(err, doc) {
        assert.ifError(err);
        assert.equal(doc.score, 55);

        DefaultTestObject.findById(doc._id, function(err, doc) {
          assert.ifError(err);

          doc.score = undefined; // unset
          doc.save(function(err) {
            assert.ifError(err);

            DefaultTestObject.findById(doc._id, function(err, doc) {
              assert.ifError(err);

              doc.score = 55;
              doc.save(function(err, doc) {
                assert.ifError(err);
                assert.equal(doc.score, 55);
                done();
              });
            });
          });
        });
      });
    });
    it('is saved object with proper defaults', async function() {
      const schema = new Schema({
        foo: {
          x: { type: String },
          y: { type: String }
        },
        boo: {
          x: { type: Boolean, default: false }
        },
        bee: {
          x: { type: Boolean, default: false },
          y: { type: Boolean, default: false }
        }
      });
      const Test = db.model('Test', schema);

      const doc = new Test({
        foo: { x: 'a', y: 'b' },
        bee: {},
        boo: {}
      });


      await doc.save();
      assert.equal(doc.bee.x, false);
      assert.equal(doc.bee.y, false);
      assert.equal(doc.boo.x, false);

      doc.bee = undefined;
      doc.boo = undefined;

      await doc.save();

      const docAfterUnsetting = await Test.findById(doc._id);

      assert.equal(docAfterUnsetting.bee.x, false);
      assert.equal(docAfterUnsetting.bee.y, false);
      assert.equal(docAfterUnsetting.boo.x, false);

    });

  });

  it('path is cast to correct value when retreived from db', function(done) {
    const schema = new Schema({ title: { type: 'string', index: true } });
    const T = db.model('Test', schema);
    T.collection.insertOne({ title: 234 }, function(err) {
      assert.ifError(err);
      T.findOne(function(err, doc) {
        assert.ifError(err);
        assert.equal(doc.title, '234');
        done();
      });
    });
  });

  it('setting a path to undefined should retain the value as undefined', function(done) {
    const B = BlogPost;
    const doc = new B();
    doc.title = 'css3';
    assert.equal(doc.$__delta()[1].$set.title, 'css3');
    doc.title = undefined;
    assert.equal(doc.$__delta()[1].$unset.title, 1);
    assert.strictEqual(undefined, doc.$__delta()[1].$set.title);

    doc.title = 'css3';
    doc.author = 'aaron';
    doc.numbers = [3, 4, 5];
    doc.meta.date = new Date();
    doc.meta.visitors = 89;
    doc.comments = [{ title: 'thanksgiving', body: 'yuuuumm' }];
    doc.comments.push({ title: 'turkey', body: 'cranberries' });

    doc.save(function(err) {
      assert.ifError(err);
      B.findById(doc._id, function(err, b) {
        assert.ifError(err);
        assert.equal(b.title, 'css3');
        assert.equal(b.author, 'aaron');
        assert.equal(b.meta.date.toString(), doc.meta.date.toString());
        assert.equal(b.meta.visitors.valueOf(), doc.meta.visitors.valueOf());
        assert.equal(b.comments.length, 2);
        assert.equal(b.comments[0].title, 'thanksgiving');
        assert.equal(b.comments[0].body, 'yuuuumm');
        assert.equal(b.comments[1].title, 'turkey');
        assert.equal(b.comments[1].body, 'cranberries');
        b.title = undefined;
        b.author = null;
        b.meta.date = undefined;
        b.meta.visitors = null;
        b.comments[0].title = null;
        b.comments[0].body = undefined;
        b.save(function(err) {
          assert.ifError(err);
          B.findById(b._id, function(err, b) {
            assert.ifError(err);
            assert.strictEqual(undefined, b.title);
            assert.strictEqual(null, b.author);

            assert.strictEqual(undefined, b.meta.date);
            assert.strictEqual(null, b.meta.visitors);
            assert.strictEqual(null, b.comments[0].title);
            assert.strictEqual(undefined, b.comments[0].body);
            assert.equal(b.comments[1].title, 'turkey');
            assert.equal(b.comments[1].body, 'cranberries');

            b.meta = undefined;
            b.comments = undefined;
            b.save(function(err) {
              assert.ifError(err);
              B.collection.findOne({ _id: b._id }, function(err, b) {
                assert.ifError(err);
                assert.strictEqual(undefined, b.meta);
                assert.strictEqual(undefined, b.comments);
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('unsetting a default value', function() {
    it('should be ignored (gh-758)', function(done) {
      const M = db.model('Test', new Schema({ s: String, n: Number, a: Array }));
      M.collection.insertOne({}, function(err) {
        assert.ifError(err);
        M.findOne(function(err, m) {
          assert.ifError(err);
          m.s = m.n = m.a = undefined;
          assert.equal(m.$__delta(), undefined);
          done();
        });
      });
    });
  });

  it('allow for object passing to ref paths (gh-1606)', function(done) {
    const schA = new Schema({ title: String });
    const schma = new Schema({
      thing: { type: Schema.Types.ObjectId, ref: 'Test' },
      subdoc: {
        some: String,
        thing: [{ type: Schema.Types.ObjectId, ref: 'Test' }]
      }
    });

    const M1 = db.model('Test', schA);
    const M2 = db.model('Test1', schma);
    const a = new M1({ title: 'hihihih' }).toObject();
    const thing = new M2({
      thing: a,
      subdoc: {
        title: 'blah',
        thing: [a]
      }
    });

    assert.equal(thing.thing, a._id);
    assert.equal(thing.subdoc.thing[0], a._id);

    done();
  });

  it('setters trigger on null values (gh-1445)', function(done) {
    const calls = [];
    const OrderSchema = new Schema({
      total: {
        type: Number,
        default: 0,
        set: function(value) {
          calls.push(value);
          return 10;
        }
      }
    });

    const Order = db.model('Test', OrderSchema);
    const o = new Order({ total: null });

    assert.deepEqual(calls, [0, null]);
    assert.equal(o.total, 10);
    done();
  });

  describe('Skip setting default value for Geospatial-indexed fields (gh-1668)', function() {
    beforeEach(() => db.deleteModel(/Person/));

    this.timeout(5000);

    it('2dsphere indexed field with value is saved', async function() {
      const PersonSchema = new Schema({
        name: String,
        loc: {
          type: [Number],
          index: '2dsphere'
        }
      }, { autoIndex: false });

      const Person = db.model('Person', PersonSchema);
      const loc = [0.3, 51.4];
      const p = new Person({
        name: 'Jimmy Page',
        loc: loc
      });

      await Person.init();
      await Person.createIndexes();

      await p.save();

      const personDoc = await Person.findById(p._id);

      assert.equal(personDoc.loc[0], loc[0]);
      assert.equal(personDoc.loc[1], loc[1]);

    });

    it('2dsphere indexed field without value is saved (gh-1668)', async function() {
      const PersonSchema = new Schema({
        name: String,
        loc: {
          type: [Number],
          index: '2dsphere'
        }
      }, { autoIndex: false });

      const Person = db.model('Person', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page'
      });

      await Person.init();
      await Person.createIndexes();

      await p.save();

      const personDoc = await Person.findById(p._id);

      assert.equal(personDoc.name, 'Jimmy Page');
      assert.equal(personDoc.loc, undefined);
    });

    it('2dsphere indexed field in subdoc without value is saved', async function() {
      const PersonSchema = new Schema({
        name: { type: String, required: true },
        nested: {
          tag: String,
          loc: {
            type: [Number]
          }
        }
      }, { autoIndex: false });

      PersonSchema.index({ 'nested.loc': '2dsphere' });

      const Person = db.model('Person', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page'
      });

      p.nested.tag = 'guitarist';

      await Person.collection.drop().catch(err => {
        if (err.codeName === 'NamespaceNotFound') {
          return;
        }
        throw err;
      });
      await Person.createCollection();
      await Person.createIndexes();

      await p.save();

      const personDoc = await Person.findById(p._id);

      assert.equal(personDoc.name, 'Jimmy Page');
      assert.equal(personDoc.nested.tag, 'guitarist');
      assert.equal(personDoc.nested.loc, undefined);

    });

    it('2dsphere indexed field with geojson without value is saved (gh-3233)', async function() {
      const LocationSchema = new Schema({
        name: { type: String, required: true },
        location: {
          type: { type: String, enum: ['Point'] },
          coordinates: [Number]
        }
      }, { autoIndex: false });

      LocationSchema.index({ location: '2dsphere' });

      const Location = db.model('Test', LocationSchema);


      await Location.collection.drop().catch(() => {});
      await Location.init();

      await Location.create({
        name: 'Undefined location'
      });

    });

    it('Doc with 2dsphere indexed field without initial value can be updated', async function() {
      const PersonSchema = new Schema({
        name: String,
        loc: {
          type: [Number],
          index: '2dsphere'
        }
      }, { autoIndex: false });

      const Person = db.model('Person', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page'
      });

      await Person.collection.drop().catch(err => {
        if (err.codeName === 'NamespaceNotFound') {
          return;
        }
        throw err;
      });
      await Person.createIndexes();

      await p.save();

      const updates = {
        $set: {
          loc: [0.3, 51.4]
        }
      };

      const personDoc = await Person.findByIdAndUpdate(p._id, updates, { new: true });

      assert.equal(personDoc.loc[0], updates.$set.loc[0]);
      assert.equal(personDoc.loc[1], updates.$set.loc[1]);

    });

    it('2dsphere indexed required field without value is rejected', async function() {
      const PersonSchema = new Schema({
        name: String,
        loc: {
          type: [Number],
          required: true,
          index: '2dsphere'
        }
      }, { autoIndex: false });

      const Person = db.model('Person', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page'
      });


      await Person.collection.drop().catch(err => {
        if (err.codeName === 'NamespaceNotFound') {
          return;
        }
        throw err;
      });
      await Person.createIndexes();

      let err;
      await p.save().catch(_err => { err = _err; });

      assert.ok(err instanceof MongooseError);
      assert.ok(err instanceof ValidationError);

    });

    it('2dsphere field without value but with schema default is saved', async function() {
      const loc = [0, 1];
      const PersonSchema = new Schema({
        name: String,
        loc: {
          type: [Number],
          default: loc,
          index: '2dsphere'
        }
      }, { autoIndex: false });

      const Person = db.model('Person', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page'
      });

      await Person.collection.drop().catch(err => {
        if (err.codeName === 'NamespaceNotFound') {
          return;
        }
        throw err;
      });
      await Person.createIndexes();

      await p.save();

      const personDoc = await Person.findById(p._id);

      assert.equal(loc[0], personDoc.loc[0]);
      assert.equal(loc[1], personDoc.loc[1]);

    });

    it('2d indexed field without value is saved', async function() {
      const PersonSchema = new Schema({
        name: String,
        loc: {
          type: [Number],
          index: '2d'
        }
      }, { autoIndex: false });

      const Person = db.model('Person', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page'
      });


      await Person.collection.drop().catch(err => {
        if (err.codeName === 'NamespaceNotFound') {
          return;
        }
        throw err;
      });
      await Person.createIndexes();

      await p.save();

      const personDoc = await Person.findById(p._id);

      assert.equal(personDoc.loc, undefined);

    });

    it.skip('Compound index with 2dsphere field without value is saved', async function() {
      const PersonSchema = new Schema({
        name: String,
        type: String,
        slug: { type: String, index: { unique: true } },
        loc: { type: [Number] },
        tags: { type: [String], index: true }
      }, { autoIndex: false });

      PersonSchema.index({ name: 1, loc: '2dsphere' });

      const Person = db.model('Person', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page',
        type: 'musician',
        slug: 'ledzep-1',
        tags: ['guitarist']
      });


      await Person.collection.drop();
      await Person.createIndexes();

      await p.save();

      const personDoc = await Person.findById(p._id);

      assert.equal(personDoc.name, 'Jimmy Page');
      assert.equal(personDoc.loc, undefined);

      await Person.collection.drop();

    });

    it.skip('Compound index on field earlier declared with 2dsphere index is saved', async function() {
      const PersonSchema = new Schema({
        name: String,
        type: String,
        slug: { type: String, index: { unique: true } },
        loc: { type: [Number] },
        tags: { type: [String], index: true }
      }, { autoIndex: false });

      PersonSchema.index({ loc: '2dsphere' });
      PersonSchema.index({ name: 1, loc: -1 });

      const Person = db.model('Person', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page',
        type: 'musician',
        slug: 'ledzep-1',
        tags: ['guitarist']
      });


      await Person.collection.drop();
      await Person.createIndexes();

      await p.save();

      const personDoc = await Person.findById(p._id);

      assert.equal(personDoc.name, 'Jimmy Page');
      assert.equal(personDoc.loc, undefined);

      await Person.collection.drop();

    });
  });

  describe('max bson size error', function() {
    let db;

    afterEach(async() => {
      if (db != null) {
        await db.close();
        db = null;
      }
    });

    it('save max bson size error with buffering (gh-3906)', async function() {
      this.timeout(10000);
      db = start({ noErrorListener: true });
      const Test = db.model('Test', { name: Object });

      const test = new Test({
        name: {
          data: (new Array(16 * 1024 * 1024)).join('x')
        }
      });

      const error = await test.save().then(() => null, err => err);

      assert.ok(error);
      assert.equal(error.name, 'MongoServerError');
    });

    it('reports max bson size error in save (gh-3906)', async function() {
      this.timeout(10000);
      db = await start({ noErrorListener: true });
      const Test = db.model('Test', { name: Object });

      const test = new Test({
        name: {
          data: (new Array(16 * 1024 * 1024)).join('x')
        }
      });

      const error = await test.save().then(() => null, err => err);

      assert.ok(error);
      assert.equal(error.name, 'MongoServerError');
    });
  });

  describe('insertMany()', function() {
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
  });

  describe('bug fixes', function() {
    it('doesnt crash (gh-1920)', function(done) {
      const parentSchema = new Schema({
        children: [new Schema({
          name: String
        })]
      });

      const Parent = db.model('Parent', parentSchema);

      const parent = new Parent();
      parent.children.push({ name: 'child name' });
      parent.save(function(err, it) {
        assert.ifError(err);
        parent.children.push({ name: 'another child' });
        Parent.findByIdAndUpdate(it._id, { $set: { children: parent.children } }, function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    it('doesnt reset "modified" status for fields', async function() {
      const UniqueSchema = new Schema({
        changer: String,
        unique: {
          type: Number,
          unique: true
        }
      });

      const Unique = db.model('Test', UniqueSchema);

      const u1 = new Unique({
        changer: 'a',
        unique: 5
      });

      const u2 = new Unique({
        changer: 'a',
        unique: 6
      });
      await Unique.init();


      await u1.save();

      assert.ok(!u1.isModified('changer'));
      await u2.save();

      assert.ok(!u2.isModified('changer'));
      u2.changer = 'b';
      u2.unique = 5;
      assert.ok(u2.isModified('changer'));
      const err = await u2.save().then(() => null, err => err);

      assert.ok(err);
      assert.ok(u2.isModified('changer'));
      await Unique.collection.drop();
    });

    it('insertMany() (gh-723)', function(done) {
      const schema = new Schema({
        name: String
      }, { timestamps: true });
      const Movie = db.model('Movie', schema);

      const arr = [{ name: 'Star Wars' }, { name: 'The Empire Strikes Back' }];
      Movie.insertMany(arr, function(error, docs) {
        assert.ifError(error);
        assert.equal(docs.length, 2);
        assert.ok(!docs[0].isNew);
        assert.ok(!docs[1].isNew);
        assert.ok(docs[0].createdAt);
        assert.ok(docs[1].createdAt);
        assert.strictEqual(docs[0].__v, 0);
        assert.strictEqual(docs[1].__v, 0);
        Movie.find({}, function(error, docs) {
          assert.ifError(error);
          assert.equal(docs.length, 2);
          assert.ok(docs[0].createdAt);
          assert.ok(docs[1].createdAt);
          done();
        });
      });
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
        Gh8234 = db.model('Test', gh8234Schema);

        return Gh8234.deleteMany({});
      });
      afterEach('delete inserted data', function() {
        return Gh8234.deleteMany({});
      });

      it('insertMany() should bypass validation if lean option set to `true`', (done) => {
        Gh8234.insertMany(arrGh8234, { lean: true }, (error, docs) => {
          assert.ifError(error);
          assert.equal(docs.length, 2);
          Gh8234.find({}, (error, docs) => {
            assert.ifError(error);
            assert.equal(docs.length, 2);
            assert.equal(arrGh8234[0].age, undefined);
            assert.equal(arrGh8234[1].age, 9);
            done();
          });
        });
      });

      it('insertMany() should validate if lean option not set', (done) => {
        Gh8234.insertMany(arrGh8234, (error) => {
          assert.ok(error);
          assert.equal(error.name, 'ValidationError');
          assert.equal(error.errors.age.kind, 'required');
          done();
        });
      });

      it('insertMany() should validate if lean option set to `false`', (done) => {
        Gh8234.insertMany(arrGh8234, { lean: false }, (error) => {
          assert.ok(error);
          assert.equal(error.name, 'ValidationError');
          assert.equal(error.errors.age.kind, 'required');
          done();
        });
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

    it('insertMany() hooks (gh-3846)', function(done) {
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
      Movie.insertMany(arr, function(error, docs) {
        assert.ifError(error);
        assert.equal(docs.length, 2);
        assert.equal(calledPre, 2);
        assert.equal(calledPost, 1);
        Movie.find({}).sort({ name: 1 }).exec(function(error, docs) {
          assert.ifError(error);
          assert.equal(docs[0].name, 'A New Hope');
          assert.equal(docs[1].name, 'The Empire Strikes Back');
          done();
        });
      });
    });

    it('returns empty array if no documents (gh-8130)', function() {
      const Movie = db.model('Movie', Schema({ name: String }));
      return Movie.insertMany([]).then(docs => assert.deepEqual(docs, []));
    });

    it('insertMany() multi validation error with ordered false (gh-5337)', function(done) {
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
      Movie.insertMany(arr, opts, function(error, res) {
        assert.ifError(error);
        assert.equal(res.mongoose.validationErrors.length, 2);
        assert.equal(res.mongoose.validationErrors[0].name, 'ValidationError');
        assert.equal(res.mongoose.validationErrors[1].name, 'ValidationError');
        done();
      });
    });

    it('insertMany() validation error with ordered true when all documents are invalid', function(done) {
      const schema = new Schema({
        name: { type: String, required: true }
      });
      const Movie = db.model('Movie', schema);

      const arr = [
        { foo: 'The Phantom Menace' },
        { foobar: 'The Force Awakens' }
      ];
      const opts = { ordered: true };
      Movie.insertMany(arr, opts, function(error, res) {
        assert.ok(error);
        assert.equal(res, undefined);
        assert.equal(error.name, 'ValidationError');
        done();
      });
    });

    it('insertMany() validation error with ordered false when all documents are invalid', function(done) {
      const schema = new Schema({
        name: { type: String, required: true }
      });
      const Movie = db.model('Movie', schema);

      const arr = [
        { foo: 'The Phantom Menace' },
        { foobar: 'The Force Awakens' }
      ];
      const opts = { ordered: false };
      Movie.insertMany(arr, opts, function(error, res) {
        assert.ifError(error);
        assert.equal(res.length, 0);
        assert.equal(error, null);
        done();
      });
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

    it('insertMany() validation error with ordered true and rawResult true when all documents are invalid', function(done) {
      const schema = new Schema({
        name: { type: String, required: true }
      });
      const Movie = db.model('Movie', schema);

      const arr = [
        { foo: 'The Phantom Menace' },
        { foobar: 'The Force Awakens' }
      ];
      const opts = { ordered: true, rawResult: true };
      Movie.insertMany(arr, opts, function(error, res) {
        assert.ok(error);
        assert.equal(res, undefined);
        assert.equal(error.name, 'ValidationError');
        done();
      });
    });

    it('insertMany() validation error with ordered false and rawResult true when all documents are invalid', function(done) {
      const schema = new Schema({
        name: { type: String, required: true }
      });
      const Movie = db.model('Movie', schema);

      const arr = [
        { foo: 'The Phantom Menace' },
        { foobar: 'The Force Awakens' }
      ];
      const opts = { ordered: false, rawResult: true };
      Movie.insertMany(arr, opts, function(error, res) {
        assert.ifError(error);
        assert.equal(res.mongoose.validationErrors.length, 2);
        assert.equal(res.mongoose.validationErrors[0].name, 'ValidationError');
        assert.equal(res.mongoose.validationErrors[1].name, 'ValidationError');
        done();
      });
    });

    it('insertMany() depopulate (gh-4590)', function(done) {
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
      Movie.insertMany(movies, function(error, docs) {
        assert.ifError(error);
        assert.equal(docs.length, 1);
        Movie.findOne({ name: 'Predator' }, function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.leadActor.toHexString(), arnold._id.toHexString());
          done();
        });
      });
    });

    it('insertMany() with promises (gh-4237)', function(done) {
      const schema = new Schema({
        name: String
      });
      const Movie = db.model('Movie', schema);

      const arr = [{ name: 'Star Wars' }, { name: 'The Empire Strikes Back' }];
      Movie.insertMany(arr).then(function(docs) {
        assert.equal(docs.length, 2);
        assert.ok(!docs[0].isNew);
        assert.ok(!docs[1].isNew);
        Movie.find({}, function(error, docs) {
          assert.ifError(error);
          assert.equal(docs.length, 2);
          done();
        });
      });
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

    it('insertMany() with non object array error can be catched (gh-8363)', function(done) {
      const schema = mongoose.Schema({
        _id: mongoose.Schema.Types.ObjectId,
        url: { type: String }
      });
      const Image = db.model('Test', schema);
      Image.insertMany(['a', 'b', 'c']).catch((error) => {
        assert.equal(error.name, 'ObjectParameterError');
        done();
      });
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

    it('deleteOne() with options (gh-7857)', function(done) {
      const schema = new Schema({
        name: String
      });
      const Character = db.model('Test', schema);

      const arr = [
        { name: 'Tyrion Lannister' },
        { name: 'Cersei Lannister' },
        { name: 'Jon Snow' },
        { name: 'Daenerys Targaryen' }
      ];
      Character.insertMany(arr, function(err, docs) {
        assert.ifError(err);
        assert.equal(docs.length, 4);
        Character.deleteOne({ name: 'Jon Snow' }, { w: 1 }, function(err) {
          assert.ifError(err);
          Character.find({}, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 3);
            done();
          });
        });
      });
    });

    it('deleteMany() with options (gh-6805)', function(done) {
      const schema = new Schema({
        name: String
      });
      const Character = db.model('Test', schema);

      const arr = [
        { name: 'Tyrion Lannister' },
        { name: 'Cersei Lannister' },
        { name: 'Jon Snow' },
        { name: 'Daenerys Targaryen' }
      ];
      Character.insertMany(arr, function(err, docs) {
        assert.ifError(err);
        assert.equal(docs.length, 4);
        Character.deleteMany({ name: /Lannister/ }, { w: 1 }, function(err) {
          assert.ifError(err);
          Character.find({}, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 2);
            done();
          });
        });
      });
    });

    it('run default function with correct this scope in DocumentArray (gh-6840)', function() {
      const schema = new Schema({
        title: String,
        actors: {
          type: [{ name: String, character: String }],
          default: function() {
            // `this` should be root document and has initial data
            if (this.title === 'Passengers') {
              return [
                { name: 'Jennifer Lawrence', character: 'Aurora Lane' },
                { name: 'Chris Pratt', character: 'Jim Preston' }
              ];
            }
            return [];
          }
        }
      });

      const Movie = db.model('Movie', schema);
      const movie = new Movie({ title: 'Passengers' });
      assert.equal(movie.actors.length, 2);
    });

    describe('3.6 features', function() {
      before(async function() {
        const version = await start.mongodVersion();
        const mongo36 = version[0] > 3 || (version[0] === 3 && version[1] >= 6);

        if (!mongo36) {
          this.skip();
        }
      });

      it('arrayFilter (gh-5965)', async function() {

        const MyModel = db.model('Test', new Schema({
          _id: Number,
          grades: [Number]
        }));

        await MyModel.create([
          { _id: 1, grades: [95, 92, 90] },
          { _id: 2, grades: [98, 100, 102] },
          { _id: 3, grades: [95, 110, 100] }
        ]);

        await MyModel.updateMany({}, { $set: { 'grades.$[element]': 100 } }, {
          arrayFilters: [{ element: { $gte: 100 } }]
        });

        const docs = await MyModel.find().sort({ _id: 1 });
        assert.deepEqual(docs[0].toObject().grades, [95, 92, 90]);
        assert.deepEqual(docs[1].toObject().grades, [98, 100, 100]);
        assert.deepEqual(docs[2].toObject().grades, [95, 100, 100]);

      });

      it('arrayFilter casting (gh-5965) (gh-7079)', async function() {

        const MyModel = db.model('Test', new Schema({
          _id: Number,
          grades: [Number]
        }));

        await MyModel.create([
          { _id: 1, grades: [95, 92, 90] },
          { _id: 2, grades: [98, 100, 102] },
          { _id: 3, grades: [95, 110, 100] }
        ]);

        await MyModel.updateMany({}, { $set: { 'grades.$[element]': 100 } }, {
          arrayFilters: [{
            element: { $gte: '100', $lte: { valueOf: () => 109 } }
          }]
        });

        const docs = await MyModel.find().sort({ _id: 1 });
        assert.deepEqual(docs[0].toObject().grades, [95, 92, 90]);
        assert.deepEqual(docs[1].toObject().grades, [98, 100, 100]);
        assert.deepEqual(docs[2].toObject().grades, [95, 110, 100]);

      });

      it('avoids unused array filter error (gh-9468)', async function() {

        const MyModel = db.model('Test', new Schema({
          _id: Number,
          grades: [Number]
        }));

        await MyModel.create([
          { _id: 1, grades: [95, 92, 90] },
          { _id: 2, grades: [98, 100, 102] },
          { _id: 3, grades: [95, 110, 100] }
        ]);

        await MyModel.updateMany({}, { $set: { 'grades.0': 100 } }, {
          arrayFilters: [{
            element: { $gte: 95 }
          }]
        });

        const docs = await MyModel.find().sort({ _id: 1 });
        assert.deepEqual(docs[0].toObject().grades, [100, 92, 90]);
        assert.deepEqual(docs[1].toObject().grades, [100, 100, 102]);
        assert.deepEqual(docs[2].toObject().grades, [100, 110, 100]);

      });

      describe('watch()', function() {
        this.timeout(10000);
        let changeStream;
        let listener;

        before(function() {
          if (!process.env.REPLICA_SET) {
            this.skip();
          }
        });

        afterEach(() => {
          if (listener == null) {
            return;
          }
          changeStream.removeListener('change', listener);
          listener = null;
          changeStream.close();
          changeStream = null;
        });

        it('watch() (gh-5964)', async function() {
          const MyModel = db.model('Test', new Schema({ name: String }));

          const changed = new global.Promise(resolve => {
            changeStream = MyModel.watch();
            listener = data => resolve(data);
            changeStream.once('change', listener);
          });

          const doc = await MyModel.create({ name: 'Ned Stark' });

          const changeData = await changed;
          assert.equal(changeData.operationType, 'insert');
          assert.equal(changeData.fullDocument._id.toHexString(),
            doc._id.toHexString());
        });

        it('using next() and hasNext() (gh-11527)', async function() {
          const MyModel = db.model('Test', new Schema({ name: String }));

          const changeStream = await MyModel.watch();

          const p = Promise.all([changeStream.next(), changeStream.hasNext()]);
          const doc = await MyModel.create({ name: 'Ned Stark' });

          const [changeData] = await p;
          assert.equal(changeData.operationType, 'insert');
          assert.equal(changeData.fullDocument._id.toHexString(),
            doc._id.toHexString());
        });

        it('fullDocument (gh-11936)', async function() {
          const MyModel = db.model('Test', new Schema({ name: String }));

          const changeStream = await MyModel.watch([], {
            fullDocument: 'updateLookup',
            hydrate: true
          });

          const doc = await MyModel.create({ name: 'Ned Stark' });

          const p = changeStream.next();
          await MyModel.updateOne({ _id: doc._id }, { name: 'Tony Stark' });

          const changeData = await p;
          assert.equal(changeData.operationType, 'update');
          assert.equal(changeData.fullDocument._id.toHexString(),
            doc._id.toHexString());
          assert.ok(changeData.fullDocument.$__);
          assert.equal(changeData.fullDocument.get('name'), 'Tony Stark');
        });

        it('respects discriminators (gh-11007)', async function() {
          const BaseModel = db.model('Test', new Schema({ name: String }));
          const ChildModel = BaseModel.discriminator('Test1', new Schema({ email: String }));

          const changed = new global.Promise(resolve => {
            changeStream = ChildModel.watch();
            listener = data => resolve(data);
            changeStream.once('change', listener);
          });

          await BaseModel.create({ name: 'Base' });
          await ChildModel.create({ name: 'Child', email: 'test' });

          const changeData = await changed;
          // Should get change data from 2nd insert, skipping first insert
          assert.equal(changeData.operationType, 'insert');
          assert.equal(changeData.fullDocument.name, 'Child');
        });
      });

      describe('sessions (gh-6362)', function() {
        let MyModel;

        beforeEach(async function() {
          const nestedSchema = new Schema({ foo: String });
          db.deleteModel(/Test/);
          MyModel = db.model('Test', new Schema({
            name: String,
            nested: nestedSchema,
            arr: [nestedSchema]
          }));

          const version = await start.mongodVersion();

          const mongo36 = version[0] > 3 || (version[0] === 3 && version[1] >= 6);
          if (!mongo36) {
            this.skip();
          }
        });

        it('startSession()', async function() {

          const session = await MyModel.startSession({ causalConsistency: true });

          assert.equal(session.supports.causalConsistency, true);

          session.endSession();

        });

        it('startSession() before connecting', async function() {
          const db = start();

          const MyModel = db.model('Test', new Schema({ name: String }));

          // Don't wait for promise
          const sessionPromise = MyModel.startSession({ causalConsistency: true });

          await db.asPromise();

          const session = await sessionPromise;

          assert.equal(session.supports.causalConsistency, true);

          session.endSession();

          await db.close();
        });

        it('sets session when pulling a document from db', async function() {
          let doc = await MyModel.create({ name: 'test', nested: { foo: 'bar' } });

          const session = await MyModel.startSession();

          let lastUse = session.serverSession.lastUse;

          await delay(1);

          doc = await MyModel.findOne({ _id: doc._id }, null, { session });
          assert.strictEqual(doc.$__.session, session);
          assert.strictEqual(doc.$session(), session);
          assert.strictEqual(doc.nested.$session(), session);

          assert.ok(session.serverSession.lastUse > lastUse);
          lastUse = session.serverSession.lastUse;

          await delay(1);

          doc = await MyModel.findOneAndUpdate({}, { name: 'test2' },
            { session: session });
          assert.strictEqual(doc.$__.session, session);
          assert.strictEqual(doc.$session(), session);
          assert.strictEqual(doc.nested.$session(), session);

          assert.ok(session.serverSession.lastUse > lastUse);
          lastUse = session.serverSession.lastUse;

          await delay(1);

          doc.name = 'test3';

          await doc.save();

          assert.ok(session.serverSession.lastUse > lastUse);

          session.endSession();
        });

        it('sets session on child doc when creating new doc (gh-7104)', async function() {
          let doc = await MyModel.create({ name: 'test', arr: [{ foo: 'bar' }] });

          const session = await MyModel.startSession();

          const lastUse = session.serverSession.lastUse;

          await delay(1);

          doc = await MyModel.findOne({ _id: doc._id }, null, { session });
          assert.strictEqual(doc.$__.session, session);
          assert.strictEqual(doc.$session(), session);
          assert.strictEqual(doc.arr[0].$session(), session);

          assert.ok(session.serverSession.lastUse > lastUse);

          doc.arr.push({ foo: 'baz' });

          assert.strictEqual(doc.arr[0].$session(), session);
          assert.strictEqual(doc.arr[1].$session(), session);

          doc.nested = { foo: 'foo' };
          assert.strictEqual(doc.nested.$session(), session);

          await doc.save();

          assert.strictEqual(doc.arr[0].$session(), session);
          assert.strictEqual(doc.arr[1].$session(), session);

          doc.$session(null);

          assert.equal(doc.arr[0].$session(), null);
          assert.equal(doc.arr[1].$session(), null);

        });

        it('sets session when pulling multiple docs from db', async function() {
          const doc = await MyModel.create({ name: 'test' });

          const session = await MyModel.startSession();

          let lastUse = session.serverSession.lastUse;

          await delay(1);

          const docs = await MyModel.find({ _id: doc._id }, null,
            { session: session });
          assert.equal(docs.length, 1);
          assert.strictEqual(docs[0].$__.session, session);
          assert.strictEqual(docs[0].$session(), session);

          assert.ok(session.serverSession.lastUse > lastUse);
          lastUse = session.serverSession.lastUse;

          await delay(1);

          docs[0].name = 'test3';

          await docs[0].save();

          assert.ok(session.serverSession.lastUse > lastUse);

          session.endSession();

        });

        it('supports overwriting `session` in save()', async function() {
          let doc = await MyModel.create({ name: 'test' });

          const session = await MyModel.startSession();

          let lastUse = session.serverSession.lastUse;

          await delay(1);

          doc = await MyModel.findOne({ _id: doc._id }, null, { session });

          assert.ok(session.serverSession.lastUse > lastUse);
          lastUse = session.serverSession.lastUse;

          await delay(1);

          doc.name = 'test3';

          await doc.save({ session: null });

          assert.ok(session.serverSession.lastUse <= lastUse);

          session.endSession();
        });
      });
    });

    it('method with same name as prop should throw (gh-4475)', function(done) {
      const testSchema = new mongoose.Schema({
        isPaid: Boolean
      });
      testSchema.methods.isPaid = function() {
        return false;
      };

      let threw = false;
      try {
        db.model('Test', testSchema);
      } catch (error) {
        threw = true;
        assert.equal(error.message, 'You have a method and a property in ' +
          'your schema both named "isPaid"');
      }
      assert.ok(threw);
      done();
    });

    it('emits errors in create cb (gh-3222) (gh-3478)', function(done) {
      const schema = new Schema({ name: 'String' });
      const Movie = db.model('Movie', schema);

      Movie.on('error', function(error) {
        assert.equal(error.message, 'fail!');
        done();
      });

      Movie.create({ name: 'Conan the Barbarian' }, function(error) {
        assert.ifError(error);
        throw new Error('fail!');
      });
    });

    it('create() reuses existing doc if one passed in (gh-4449)', function(done) {
      const testSchema = new mongoose.Schema({
        name: String
      });
      const Test = db.model('Test', testSchema);

      const t = new Test();
      Test.create(t, function(error, t2) {
        assert.ifError(error);
        assert.ok(t === t2);
        done();
      });
    });

    it('emits errors correctly from exec (gh-4500)', function(done) {
      const someModel = db.model('Test', new Schema({}));

      someModel.on('error', function(error) {
        assert.equal(error.message, 'This error will not disappear');
        done();
      });

      someModel.findOne().exec(function() {
        throw new Error('This error will not disappear');
      });
    });

    it('disabling id getter with .set() (gh-5548)', function(done) {
      const ChildSchema = new mongoose.Schema({
        name: String,
        _id: false
      });

      ChildSchema.set('id', false);

      const ParentSchema = new mongoose.Schema({
        child: {
          type: ChildSchema,
          default: {}
        }
      }, { id: false });

      const Parent = db.model('Parent', ParentSchema);

      const doc = new Parent({ child: { name: 'test' } });
      assert.ok(!doc.id);
      assert.ok(!doc.child.id);

      const obj = doc.toObject({ virtuals: true });
      assert.ok(!('id' in obj));
      assert.ok(!('id' in obj.child));

      done();
    });

    it('creates new array when initializing from existing doc (gh-4449)', function(done) {
      const TodoSchema = new mongoose.Schema({
        title: String
      }, { _id: false });

      const UserSchema = new mongoose.Schema({
        name: String,
        todos: [TodoSchema]
      });
      const User = db.model('User', UserSchema);

      const val = new User({ name: 'Val' });
      User.create(val, function(error, val) {
        assert.ifError(error);
        val.todos.push({ title: 'Groceries' });
        val.save(function(error) {
          assert.ifError(error);
          User.findById(val, function(error, val) {
            assert.ifError(error);
            assert.deepEqual(val.toObject().todos, [{ title: 'Groceries' }]);
            const u2 = new User();
            val.todos = u2.todos;
            val.todos.push({ title: 'Cook' });
            val.save(function(error) {
              assert.ifError(error);
              User.findById(val, function(error, val) {
                assert.ifError(error);
                assert.equal(val.todos.length, 1);
                assert.equal(val.todos[0].title, 'Cook');
                done();
              });
            });
          });
        });
      });
    });

    describe('bulkWrite casting', function() {
      it('basic casting (gh-3998)', function(done) {
        const schema = new Schema({
          str: String,
          num: Number
        });

        const M = db.model('Test', schema);

        const ops = [
          {
            insertOne: {
              document: { str: 1, num: '1' }
            }
          },
          {
            updateOne: {
              filter: { str: 1 },
              update: {
                $set: { num: '2' }
              }
            }
          }
        ];
        M.bulkWrite(ops, function(error) {
          assert.ifError(error);
          M.findOne({}, function(error, doc) {
            assert.ifError(error);
            assert.strictEqual(doc.str, '1');
            assert.strictEqual(doc.num, 2);
            done();
          });
        });
      });

      it('setDefaultsOnInsert (gh-5708)', function(done) {
        const schema = new Schema({
          str: { type: String, default: 'test' },
          num: Number
        });

        const M = db.model('Test', schema);

        const ops = [
          {
            updateOne: {
              filter: { num: 0 },
              update: {
                $inc: { num: 1 }
              },
              upsert: true
            }
          }
        ];
        M.bulkWrite(ops, function(error) {
          assert.ifError(error);
          M.findOne({}).lean().exec(function(error, doc) {
            assert.ifError(error);
            assert.strictEqual(doc.str, 'test');
            assert.strictEqual(doc.num, 1);
            done();
          });
        });
      });

      it('timestamps (gh-5708)', async function() {
        const schema = new Schema({
          str: { type: String, default: 'test' },
          num: Number
        }, { timestamps: true });

        const M = db.model('Test', schema);

        const ops = [
          {
            insertOne: {
              document: {
                num: 42
              }
            }
          },
          {
            updateOne: {
              filter: { num: 0 },
              update: {
                $inc: { num: 1 }
              },
              upsert: true
            }
          }
        ];

        const now = Date.now();


        await M.bulkWrite(ops);

        let doc = await M.findOne({ num: 42 });
        assert.ok(doc.createdAt);
        assert.ok(doc.createdAt.valueOf() >= now.valueOf());
        assert.ok(doc.updatedAt);
        assert.ok(doc.updatedAt.valueOf() >= now.valueOf());

        doc = await M.findOne({ num: 1 });
        assert.ok(doc.createdAt);
        assert.ok(doc.createdAt.valueOf() >= now.valueOf());
        assert.ok(doc.updatedAt);
        assert.ok(doc.updatedAt.valueOf() >= now.valueOf());

      });

      it('with child timestamps and array filters (gh-7032)', async function() {
        const childSchema = new Schema({ name: String }, { timestamps: true });

        const parentSchema = new Schema({ children: [childSchema] }, {
          timestamps: true
        });

        const Parent = db.model('Parent', parentSchema);


        await Parent.create({ children: [{ name: 'foo' }] });

        const end = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100));

        await Parent.bulkWrite([
          {
            updateOne: {
              filter: {},
              update: { $set: { 'children.$[].name': 'bar' } }
            }
          }
        ]);

        const doc = await Parent.findOne();
        assert.ok(doc.children[0].updatedAt.valueOf() > end);

      });

      it('with timestamps and replaceOne (gh-5708)', async function() {
        const schema = new Schema({ num: Number }, { timestamps: true });

        const M = db.model('Test', schema);


        await M.create({ num: 42 });

        await new Promise((resolve) => setTimeout(resolve, 10));
        const now = Date.now();

        await M.bulkWrite([{
          replaceOne: {
            filter: { num: 42 },
            replacement: { num: 100 }
          }
        }]);

        const doc = await M.findOne({ num: 100 });
        assert.ok(doc.createdAt);
        assert.ok(doc.createdAt.valueOf() >= now.valueOf());
        assert.ok(doc.updatedAt);
        assert.ok(doc.updatedAt.valueOf() >= now.valueOf());

      });

      it('with child timestamps (gh-7032)', async function() {
        const nested = new Schema({ name: String }, { timestamps: true });
        const schema = new Schema({ nested: [nested] }, { timestamps: true });

        const M = db.model('Test', schema);


        await M.create({ nested: [] });

        await new Promise((resolve) => setTimeout(resolve, 10));
        const now = Date.now();

        await M.bulkWrite([{
          updateOne: {
            filter: {},
            update: { $push: { nested: { name: 'test' } } }
          }
        }]);

        const doc = await M.findOne({});
        assert.ok(doc.nested[0].createdAt);
        assert.ok(doc.nested[0].createdAt.valueOf() >= now.valueOf());
        assert.ok(doc.nested[0].updatedAt);
        assert.ok(doc.nested[0].updatedAt.valueOf() >= now.valueOf());

      });

      it('with single nested and setOnInsert (gh-7534)', function() {
        const nested = new Schema({ name: String });
        const schema = new Schema({ nested: nested });

        const Model = db.model('Test', schema);

        return Model.
          bulkWrite([{
            updateOne: {
              filter: {},
              update: {
                $setOnInsert: {
                  nested: {
                    name: 'foo'
                  }
                }
              },
              upsert: true
            }
          }]).
          then(() => Model.findOne()).
          then(doc => assert.equal(doc.nested.name, 'foo'));
      });

      it('throws an error if no update object is provided (gh-8331)', async function() {
        const userSchema = new Schema({ name: { type: String, required: true } });
        const User = db.model('User', userSchema);


        const createdUser = await User.create({ name: 'Hafez' });

        const err = await User.bulkWrite([{
          updateOne: {
            filter: { _id: createdUser._id }
          }
        }])
          .then(() => null)
          .catch(err => err);


        assert.ok(err);
        assert.equal(err.message, 'Must provide an update object.');

        const userAfterUpdate = await User.findOne({ _id: createdUser._id });

        assert.equal(userAfterUpdate.name, 'Hafez', 'Document data is not wiped if no update object is provided.');

      });

      it('casts according to child discriminator if `discriminatorKey` is present (gh-8982)', async function() {

        const Person = db.model('Person', { name: String });
        Person.discriminator('Worker', new Schema({ age: Number }));


        await Person.create([
          { __t: 'Worker', name: 'Hafez1', age: '5' },
          { __t: 'Worker', name: 'Hafez2', age: '10' },
          { __t: 'Worker', name: 'Hafez3', age: '15' },
          { __t: 'Worker', name: 'Hafez4', age: '20' },
          { __t: 'Worker', name: 'Hafez5', age: '25' }
        ]);

        await Person.bulkWrite([
          { updateOne: { filter: { __t: 'Worker', age: '5' }, update: { age: '6' } } },
          { updateMany: { filter: { __t: 'Worker', age: '10' }, update: { age: '11' } } },
          { replaceOne: { filter: { __t: 'Worker', age: '15' }, replacement: { name: 'Hafez3', age: '16' } } },
          { deleteOne: { filter: { __t: 'Worker', age: '20' } } },
          { deleteMany: { filter: { __t: 'Worker', age: '25' } } },
          { insertOne: { document: { __t: 'Worker', name: 'Hafez6', age: '30' } } }
        ]);

        const people = await Person.find().sort('name');

        assert.equal(people.length, 4);
        assert.equal(people[0].age, 6);
        assert.equal(people[1].age, 11);
        assert.equal(people[2].age, 16);
        assert.equal(people[3].age, 30);

      });

      it('insertOne and replaceOne should not throw an error when set `timestamps: false` in schmea (gh-10048)', async function() {
        const schema = new Schema({ name: String }, { timestamps: false });
        const Model = db.model('Test', schema);


        await Model.create({ name: 'test' });

        await Model.bulkWrite([
          {
            insertOne: {
              document: { name: 'insertOne-test' }
            }
          },
          {
            replaceOne: {
              filter: { name: 'test' },
              replacement: { name: 'replaceOne-test' }
            }
          }
        ]);

        for (const name of ['insertOne-test', 'replaceOne-test']) {
          const doc = await Model.findOne({ name });
          assert.strictEqual(doc.createdAt, undefined);
          assert.strictEqual(doc.updatedAt, undefined);
        }

      });

      it('casts objects with null prototype (gh-10512)', function() {
        const schema = Schema({
          _id: String,
          someArray: [{ message: String }]
        });
        const Test = db.model('Test', schema);

        return Test.bulkWrite([{
          updateOne: {
            filter: {},
            update: { $set: { 'someArray.1': { __proto__: null, message: 'test' } } }
          }
        }]);
      });
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

    it('remove with cast error (gh-5323)', function(done) {
      const schema = new mongoose.Schema({
        name: String
      });

      const Model = db.model('Test', schema);
      const arr = [
        { name: 'test-1' },
        { name: 'test-2' }
      ];

      Model.create(arr, function(error) {
        assert.ifError(error);
        Model.remove([], function(error) {
          assert.ok(error);
          assert.ok(error.message.indexOf('must be an object') !== -1,
            error.message);
          Model.find({}, function(error, docs) {
            assert.ifError(error);
            assert.equal(docs.length, 2);
            done();
          });
        });
      });
    });

    it('.create() with non-object (gh-2037)', function(done) {
      const schema = new mongoose.Schema({ name: String });

      const Model = db.model('Test', schema);

      Model.create(1, function(error) {
        assert.ok(error);
        assert.equal(error.name, 'ObjectParameterError');
        done();
      });
    });

    it.skip('save() with wtimeout defined in schema (gh-6862)', function(done) {
      // If you want to test this, setup replica set with 1 primary up and 1 secondary down
      this.timeout(5500);
      const schema = new Schema({
        name: String
      }, {
        writeConcern: {
          w: 2,
          wtimeout: 1000
        }
      });
      const User = db.model('User', schema);
      const user = new User();
      user.name = 'Jon Snow';
      user.save(function(error) {
        assert.ok(error);
        assert.equal(error.name, 'MongoWriteConcernError');

        // although timeout, the doc have been successfully saved in the primary.
        User.findOne({}, function(err, user) {
          if (err) return done(err);
          assert.equal(user.name, 'Jon Snow');
          done();
        });
      });
    });

    it.skip('save with wtimeout in options (gh_6862)', function(done) {
      // If you want to test this, setup replica set with 1 primary up and 1 secondary down
      this.timeout(5500);
      const schema = new Schema({
        name: String
      });
      const User = db.model('User', schema);
      const user = new User();
      user.name = 'Jon Snow';
      user.save({ w: 2, wtimeout: 1000 }, function(error) {
        assert.ok(error);
        assert.equal(error.name, 'MongoWriteConcernError');
        User.findOne({}, function(err, user) {
          if (err) return done(err);
          assert.equal(user.name, 'Jon Snow');
          done();
        });
      });
    });

    it('bulkWrite casting updateMany, deleteOne, deleteMany (gh-3998)', function(done) {
      const schema = new Schema({
        str: String,
        num: Number
      });

      const M = db.model('Test', schema);

      const ops = [
        {
          insertOne: {
            document: { str: 1, num: '1' }
          }
        },
        {
          insertOne: {
            document: { str: '1', num: '1' }
          }
        },
        {
          updateMany: {
            filter: { str: 1 },
            update: {
              $set: { num: '2' }
            }
          }
        },
        {
          deleteMany: {
            filter: { str: 1 }
          }
        }
      ];
      M.bulkWrite(ops, function(error) {
        assert.ifError(error);
        M.countDocuments({}, function(error, count) {
          assert.ifError(error);
          assert.equal(count, 0);
          done();
        });
      });
    });

    it('bulkWrite casting replaceOne (gh-3998)', function(done) {
      const schema = new Schema({
        str: String,
        num: Number
      });

      const M = db.model('Test', schema);

      const ops = [
        {
          insertOne: {
            document: { str: 1, num: '1' }
          }
        },
        {
          replaceOne: {
            filter: { str: 1 },
            replacement: { str: 2, num: '2' }
          }
        }
      ];
      M.bulkWrite(ops, function(error) {
        assert.ifError(error);
        M.findOne({}, function(error, doc) {
          assert.ifError(error);
          assert.strictEqual(doc.str, '2');
          assert.strictEqual(doc.num, 2);
          done();
        });
      });
    });

    it('alias with lean virtual (gh-6069)', async function() {
      const schema = new mongoose.Schema({
        name: {
          type: String,
          alias: 'nameAlias'
        }
      });

      const Model = db.model('Test', schema);


      const doc = await Model.create({ name: 'Val' });

      const res = await Model.findById(doc._id).lean();

      assert.equal(schema.virtual('nameAlias').getters[0].call(res), 'Val');

    });

    it('marks array as modified when initializing non-array from db (gh-2442)', function(done) {
      const s1 = new Schema({
        array: mongoose.Schema.Types.Mixed
      }, { minimize: false });

      const s2 = new Schema({
        array: {
          type: [{
            _id: false,
            value: {
              type: Number,
              default: 0
            }
          }],
          default: [{}]
        }
      });

      const M1 = db.model('Test', s1);
      const M2 = db.model('Test1', s2, M1.collection.name);

      M1.create({ array: {} }, function(err, doc) {
        assert.ifError(err);
        assert.ok(doc.array);
        M2.findOne({ _id: doc._id }, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.array[0].value, 0);
          doc.array[0].value = 1;
          doc.save(function(err) {
            assert.ifError(err);
            M2.findOne({ _id: doc._id }, function(err, doc) {
              assert.ifError(err);
              assert.ok(!doc.isModified('array'));
              assert.deepEqual(doc.array[0].value, 1);
              assert.equal(JSON.stringify(doc.array), '[{"value":1}]');
              done();
            });
          });
        });
      });
    });

    it('Throws when saving same doc in parallel w/ callback (gh-6456)', function(done) {
      let called = 0;

      function counter() {
        if (++called === 2) {
          Test.countDocuments(function(err, cnt) {
            assert.ifError(err);
            assert.strictEqual(cnt, 1);
            done();
          });
        }
      }

      const schema = new Schema({
        name: String
      });

      const Test = db.model('Test', schema);

      const test = new Test({
        name: 'Billy'
      });

      test.save(function cb(err, doc) {
        assert.ifError(err);
        assert.strictEqual(doc.name, 'Billy');
        counter();
      });

      test.save(function cb(err) {
        assert.strictEqual(err.name, 'ParallelSaveError');
        const regex = new RegExp(test.id);
        assert.ok(regex.test(err.message));
        counter();
      });
    });
    describe('Model.syncIndexes()', () => {
      it('adds indexes to the collection', async() => {
        // Arrange
        const collectionName = generateRandomCollectionName();
        const userSchema = new Schema(
          { name: { type: String, index: true } },
          { autoIndex: false }
        );
        const User = db.model('User', userSchema, collectionName);

        // Act
        await User.syncIndexes();

        // Assert
        const indexes = await User.listIndexes();
        assert.deepStrictEqual(indexes.map(index => index.name), ['_id_', 'name_1']);
      });

      it('drops indexes that are not present in schema', async() => {
        // Arrange
        const collectionName = generateRandomCollectionName();
        const userSchema = new Schema(
          {
            name: { type: String, index: true },
            age: Number
          },
          { autoIndex: false }
        );
        const User = db.model('User', userSchema, collectionName);
        await User.collection.createIndex({ age: 1 });

        // Act
        const droppedIndexes = await User.syncIndexes();
        const indexesAfterSync = await User.listIndexes();

        // Assert
        assert.deepStrictEqual(droppedIndexes, ['age_1']);
        assert.deepStrictEqual(indexesAfterSync.map(index => index.name), ['_id_', 'name_1']);
      });

      it('when two different models connect to the same collection, syncIndexes(...) respects the last call', async() => {
        // Arrange
        const collectionName = generateRandomCollectionName();
        const userSchema = new Schema(
          {
            name: { type: String, index: true },
            age: Number
          },
          { autoIndex: false }
        );
        const User = db.model('User', userSchema, collectionName);

        const orderSchema = new Schema(
          {
            totalPrice: { type: Number, index: true }
          },
          { autoIndex: false }
        );
        const Order = db.model('Order', orderSchema, collectionName);
        await User.createCollection();

        // Act
        const userIndexesBeforeSync = await User.listIndexes();
        await User.syncIndexes();
        const orderIndexesBeforeSync = await Order.listIndexes();
        const droppedOrderIndexes = await Order.syncIndexes();

        // Assert
        assert.deepStrictEqual(userIndexesBeforeSync.map(index => index.name), ['_id_']);

        assert.deepStrictEqual(orderIndexesBeforeSync.map(index => index.name), ['_id_', 'name_1']);
        assert.deepStrictEqual(droppedOrderIndexes, ['name_1']);
      });

      it('when two models have the same collection name, same field but different options, syncIndexes(...) respects the last call', async() => {
        // Arrange
        const collectionName = generateRandomCollectionName();
        const userSchema = new Schema(
          {
            customId: { type: String, index: true },
            age: Number
          },
          { autoIndex: false }
        );
        const User = db.model('User', userSchema, collectionName);

        const orderSchema = new Schema(
          {
            customId: { type: String, unique: true }
          },
          { autoIndex: false }
        );
        const Order = db.model('Order', orderSchema, collectionName);
        await User.createCollection();

        // Act
        await User.syncIndexes();
        const userIndexes = await User.listIndexes();
        await Order.syncIndexes();
        const orderIndexes = await Order.listIndexes();

        // Assert
        const userCustomIdIndex = userIndexes.find(index => index.key.customId === 1);
        assert.strictEqual(userCustomIdIndex.unique, undefined);

        const orderCustomIdIndex = orderIndexes.find(index => index.key.customId === 1);
        assert.strictEqual(orderCustomIdIndex.unique, true);
      });

      it('when syncIndexes(...) is called twice with no changes on the model, the second call should not do anything', async() => {
        // Arrange
        const collectionName = generateRandomCollectionName();
        const userSchema = new Schema(
          {
            name: { type: String, index: true },
            age: Number
          },
          { autoIndex: false }
        );
        const User = db.model('User', userSchema, collectionName);

        // Act
        await User.collection.createIndex({ age: 1 });
        const droppedIndexesFromFirstSync = await User.syncIndexes();
        const droppedIndexesFromSecondSync = await User.syncIndexes();

        // Assert
        assert.deepStrictEqual(droppedIndexesFromFirstSync, ['age_1']);
        assert.deepStrictEqual(droppedIndexesFromSecondSync, []);
      });

      it('when called with different key order, it treats different order as different indexes (gh-8135)', async() => {
        // Arrange
        const collectionName = generateRandomCollectionName();
        const userSchema = new Schema(
          { name: String, age: Number },
          { autoIndex: false }
        );
        userSchema.index({ name: 1, age: -1 });
        const User = db.model('User', userSchema, collectionName);
        await User.collection.createIndex({ age: -1, name: 1 });

        // Act
        const droppedIndexes = await User.syncIndexes();
        const indexesAfterSync = await User.listIndexes();

        // Assert
        assert.deepStrictEqual(droppedIndexes, ['age_-1_name_1']);

        const compoundIndex = indexesAfterSync.find(index => index.key.name === 1 && index.key.age === -1);
        assert.strictEqual(compoundIndex.name, 'name_1_age_-1');
      });

      it('syncIndexes(...) compound index including `_id` (gh-8559)', async() => {
        // Arrange
        const collectionName = generateRandomCollectionName();
        const userSchema = new Schema(
          { name: String, age: Number },
          { autoIndex: false }
        );
        userSchema.index({ name: 1 });
        const User = db.model('User', userSchema, collectionName);
        await User.collection.createIndex({ name: 1, _id: 1 });

        // Act
        const droppedIndexes = await User.syncIndexes();
        const indexesAfterSync = await User.listIndexes();

        // Assert
        assert.deepStrictEqual(droppedIndexes, ['name_1__id_1']);
        assert.deepStrictEqual(
          indexesAfterSync.map(index => index.name),
          ['_id_', 'name_1']
        );
      });

      it('syncIndexes() allows overwriting `background` option (gh-8645)', async function() {
        const opts = { autoIndex: false };
        const schema = new Schema({ name: String }, opts);
        schema.index({ name: 1 }, { background: true });

        const M = db.model('Test', schema);
        await M.syncIndexes({ background: false });

        const indexes = await M.listIndexes();
        assert.deepEqual(indexes[1].key, { name: 1 });
        assert.strictEqual(indexes[1].background, false);
      });

      it('should not drop a text index on .syncIndexes() call (gh-10850)', async function() {
        const collation = { collation: { locale: 'simple' } };
        const someSchema = new Schema({
          title: String,
          author: String
        });
        someSchema.index({ title: 1, author: 'text' }, collation);
        const M = db.model('Some', someSchema);
        await M.init();
        await M.syncIndexes();
        assert(await M.syncIndexes(), []);
      });

      it('adding discriminators should not drop the parent model\'s indexes', async() => {
        // Arrange
        const collectionName = generateRandomCollectionName();

        const eventSchema = new Schema({
          actorId: { type: Schema.Types.ObjectId, index: true }
        }, { autoIndex: false });

        const Event = db.model('Event', eventSchema, collectionName);

        Event.discriminator('AEvent', { aField: String });
        Event.discriminator('BEvent', { bField: String });

        // Act
        await db.syncIndexes();

        const indexes = await Event.listIndexes();

        // Assert
        const actorIdIndex = indexes.find(index => index.name === 'actorId_1');
        assert.ok(actorIdIndex);
      });

      it('syncing model with multiple discriminators works', async() => {
        // Arrange
        const collectionName = generateRandomCollectionName();
        const eventSchema = new Schema(
          { actorId: { type: Schema.Types.ObjectId } },
          { autoIndex: false }
        );
        eventSchema.index({ actorId: 1 }, { unique: true });

        const Event = db.model('Event', eventSchema, collectionName);

        const clickEventSchema = new Schema(
          {
            clickedAt: Date,
            productCategory: String
          },
          { autoIndex: false }
        );
        clickEventSchema.index(
          { clickedAt: 1 },
          { partialFilterExpression: { productCategory: 'Computers' } }
        );
        const ClickEvent = Event.discriminator('ClickEvent', clickEventSchema);

        const buyEventSchema = new Schema(
          {
            boughtAt: String,
            productPrice: Number
          },
          { autoIndex: false }
        );
        buyEventSchema.index(
          { boughtAt: 1 },
          {
            unique: true,
            partialFilterExpression: { productPrice: { $gt: 100 } }
          }
        );
        const BuyEvent = Event.discriminator('BuyEvent', buyEventSchema);

        // Act
        const droppedByEvent = await Event.syncIndexes({ background: false });
        const droppedByClickEvent = await ClickEvent.syncIndexes({ background: false });
        const droppedByBuyEvent = await BuyEvent.syncIndexes({ background: false });

        const eventIndexes = await Event.listIndexes();

        // Assert
        assert.deepStrictEqual(droppedByEvent, []);
        assert.deepStrictEqual(droppedByClickEvent, []);
        assert.deepStrictEqual(droppedByBuyEvent, []);

        assert.deepStrictEqual(
          eventIndexes.map(index => pick(index, ['key', 'unique', 'partialFilterExpression'])),
          [
            { key: { _id: 1 } },
            {
              unique: true,
              key: { actorId: 1 }
            },
            {
              key: { clickedAt: 1 },
              partialFilterExpression: {
                productCategory: 'Computers',
                __t: 'ClickEvent'
              }
            },
            {
              unique: true,
              key: { boughtAt: 1 },
              partialFilterExpression: {
                productPrice: { $gt: 100 },
                __t: 'BuyEvent'
              }
            }
          ]
        );
      });

      it('syncing one discriminator\'s indexes should not drop the main model\'s indexes', async() => {
        // Arrange
        const collectionName = generateRandomCollectionName();
        const eventSchema = new Schema(
          { actorId: { type: Schema.Types.ObjectId } },
          { autoIndex: false }
        );
        eventSchema.index({ actorId: 1 }, { unique: true });

        const Event = db.model('Event', eventSchema, collectionName);

        const clickEventSchema = new Schema(
          {
            clickedAt: Date,
            productCategory: String
          },
          { autoIndex: false }
        );
        clickEventSchema.index(
          { clickedAt: 1 },
          { partialFilterExpression: { productCategory: 'Computers' } }
        );
        const ClickEvent = Event.discriminator('ClickEvent', clickEventSchema);

        const buyEventSchema = new Schema(
          {
            boughtAt: String,
            productPrice: Number
          },
          { autoIndex: false }
        );
        buyEventSchema.index(
          { boughtAt: 1 },
          {
            unique: true,
            partialFilterExpression: { productPrice: { $gt: 100 } }
          }
        );
        Event.discriminator('BuyEvent', buyEventSchema);

        // Act
        const droppedByEvent = await Event.syncIndexes();
        const droppedByClickEvent = await ClickEvent.syncIndexes();

        const eventIndexes = await Event.listIndexes();

        // Assert
        assert.deepStrictEqual(droppedByEvent, []);
        assert.deepStrictEqual(droppedByClickEvent, []);

        assert.deepStrictEqual(
          eventIndexes.map(index => pick(index, ['key', 'unique', 'partialFilterExpression'])),
          [
            { key: { _id: 1 } },
            {
              unique: true,
              key: { actorId: 1 }
            },
            {
              key: { clickedAt: 1 },
              partialFilterExpression: {
                productCategory: 'Computers',
                __t: 'ClickEvent'
              }
            }
          ]
        );
      });

      it('syncing main model does not sync discrimator indexes', async() => {
        // Arrange
        const collectionName = generateRandomCollectionName();
        const eventSchema = new Schema(
          { actorId: { type: Schema.Types.ObjectId } },
          { autoIndex: false }
        );
        eventSchema.index({ actorId: 1 }, { unique: true });

        const Event = db.model('Event', eventSchema, collectionName);

        const clickEventSchema = new Schema(
          {
            clickedAt: Date,
            productCategory: String
          },
          { autoIndex: false }
        );
        clickEventSchema.index(
          { clickedAt: 1 },
          { partialFilterExpression: { productCategory: 'Computers' } }
        );
        const ClickEvent = Event.discriminator('ClickEvent', clickEventSchema);

        const buyEventSchema = new Schema(
          {
            boughtAt: String,
            productPrice: Number
          },
          { autoIndex: false }
        );
        buyEventSchema.index(
          { boughtAt: 1 },
          {
            unique: true,
            partialFilterExpression: { productPrice: { $gt: 100 } }
          }
        );
        Event.discriminator('BuyEvent', buyEventSchema);

        // Act
        const droppedByEvent = await Event.syncIndexes();
        const eventIndexesBeforeSyncingClickEvents = await Event.listIndexes();

        const droppedByClickEvent = await ClickEvent.syncIndexes();
        const eventIndexesAfterSyncingClickEvents = await ClickEvent.listIndexes();


        // Assert
        assert.deepStrictEqual(droppedByEvent, []);
        assert.deepStrictEqual(droppedByClickEvent, []);

        assert.deepStrictEqual(
          eventIndexesBeforeSyncingClickEvents.map(index => pick(index, ['key', 'unique', 'partialFilterExpression'])),
          [
            { key: { _id: 1 } },
            {
              unique: true,
              key: { actorId: 1 }
            }
          ]
        );

        assert.deepStrictEqual(
          eventIndexesAfterSyncingClickEvents.map(index => pick(index, ['key', 'unique', 'partialFilterExpression'])),
          [
            { key: { _id: 1 } },
            {
              unique: true,
              key: { actorId: 1 }
            },
            {
              key: { clickedAt: 1 },
              partialFilterExpression: {
                productCategory: 'Computers',
                __t: 'ClickEvent'
              }
            }
          ]
        );

      });
      it('syncing discriminator does not attempt to sync parent model\'s indexes', async() => {
        // Arrange
        const collectionName = generateRandomCollectionName();
        const eventSchema = new Schema(
          { actorId: { type: Schema.Types.ObjectId } },
          { autoIndex: false }
        );
        eventSchema.index({ actorId: 1 }, { unique: true });

        const Event = db.model('Event', eventSchema, collectionName);

        const clickEventSchema = new Schema(
          {
            clickedAt: Date,
            productCategory: String
          },
          { autoIndex: false }
        );
        clickEventSchema.index(
          { clickedAt: 1 },
          { partialFilterExpression: { productCategory: 'Computers' } }
        );
        const ClickEvent = Event.discriminator('ClickEvent', clickEventSchema);

        const buyEventSchema = new Schema(
          {
            boughtAt: String,
            productPrice: Number
          },
          { autoIndex: false }
        );
        buyEventSchema.index(
          { boughtAt: 1 },
          {
            unique: true,
            partialFilterExpression: { productPrice: { $gt: 100 } }
          }
        );
        Event.discriminator('BuyEvent', buyEventSchema);

        // Act
        const droppedByClickEvent = await ClickEvent.syncIndexes();
        const eventIndexesAfterSyncingClickEvents = await ClickEvent.listIndexes();

        const droppedByEvent = await Event.syncIndexes();
        const eventIndexesAfterSyncingEverything = await Event.listIndexes();

        // Assert
        assert.deepStrictEqual(droppedByClickEvent, []);
        assert.deepStrictEqual(droppedByEvent, []);

        assert.deepStrictEqual(
          eventIndexesAfterSyncingClickEvents.map(index => pick(index, ['key', 'unique', 'partialFilterExpression'])),
          [
            { key: { _id: 1 } },
            {
              key: { clickedAt: 1 },
              partialFilterExpression: {
                productCategory: 'Computers',
                __t: 'ClickEvent'
              }
            }
          ]
        );
        assert.deepStrictEqual(
          eventIndexesAfterSyncingEverything.map(index => pick(index, ['key', 'unique', 'partialFilterExpression'])),
          [
            { key: { _id: 1 } },
            {
              key: { clickedAt: 1 },
              partialFilterExpression: {
                productCategory: 'Computers',
                __t: 'ClickEvent'
              }
            },
            {
              unique: true,
              key: { actorId: 1 }
            }
          ]
        );

      });

      it('creates indexes only when they do not exist on the mongodb server (gh-12250)', async() => {
        const userSchema = new Schema({
          name: { type: String }
        }, { autoIndex: false });

        userSchema.index({ name: 1 });

        const User = db.model('User', userSchema);

        await User.init();

        const createIndexSpy = sinon.spy(User.collection, 'createIndex');
        const listIndexesSpy = sinon.spy(User.collection, 'listIndexes');

        await User.syncIndexes();

        assert.equal(createIndexSpy.callCount, 1);
        assert.equal(listIndexesSpy.callCount, 1);

        await User.syncIndexes();

        assert.equal(listIndexesSpy.callCount, 2);
        assert.equal(createIndexSpy.callCount, 1);
      });
    });

    it('using `new db.model()()` (gh-6698)', function() {
      db.model('Test', new Schema({
        name: String
      }));

      assert.throws(function() {
        new db.model('Test')({ name: 'test' });
      }, /should not be run with `new`/);
    });

    it('throws if non-function passed as callback (gh-6640)', function() {
      const Model = db.model('Test', new Schema({
        name: String
      }));

      const doc = new Model({});

      assert.throws(function() {
        doc.save({}, {});
      }, /callback must be a function/i);
    });

    it('Throws when saving same doc in parallel w/ promises (gh-6456)', function(done) {
      let called = 0;

      function counter() {
        if (++called === 2) {
          Test.countDocuments(function(err, cnt) {
            assert.ifError(err);
            assert.strictEqual(cnt, 1);
            done();
          });
        }
      }

      const schema = new Schema({
        name: String
      });

      const Test = db.model('Test', schema);

      const test = new Test({
        name: 'Sarah'
      });

      function handler(doc) {
        assert.strictEqual(doc.id, test.id);
        counter();
      }

      function error(err) {
        assert.strictEqual(err.name, 'ParallelSaveError');
        const regex = new RegExp(test.id);
        assert.ok(regex.test(err.message));
        counter();
      }

      test.save().then(handler);
      test.save().catch(error);
    });

    it('allows calling save in a post save hook (gh-6611)', async function() {
      let called = 0;
      const noteSchema = new Schema({
        body: String
      });

      noteSchema.post('save', function(note) {
        if (!called) {
          called++;
          note.body = 'a note, part deux.';
          return note.save();
        }
      });


      const Note = db.model('Test', noteSchema);

      await Note.create({ body: 'a note.' });
      const doc = await Note.findOne({});
      assert.strictEqual(doc.body, 'a note, part deux.');

    });

    it('createCollection() respects schema collation (gh-6489)', async function() {
      const userSchema = new Schema({
        name: String
      }, { collation: { locale: 'en_US', strength: 1 } });
      const Model = db.model('User', userSchema);


      await Model.collection.drop().catch(() => {});
      await Model.createCollection();
      const collectionName = Model.collection.name;

      // If the collection is not created, the following will throw
      // MongoServerError: Collection [mongoose_test.User] not found.
      await db.collection(collectionName).stats();

      await Model.create([{ name: 'alpha' }, { name: 'Zeta' }]);

      // Ensure that the default collation is set. Mongoose will set the
      // collation on the query itself (see gh-4839).
      const res = await db.collection(collectionName).
        find({}).sort({ name: 1 }).toArray();
      assert.deepEqual(res.map(v => v.name), ['alpha', 'Zeta']);
    });

    it('createCollection() respects timeseries (gh-10611)', async function() {
      const version = await start.mongodVersion();
      if (version[0] < 5) {
        this.skip();
        return;
      }

      const schema = Schema({ name: String, timestamp: Date, metadata: Object }, {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'metadata',
          granularity: 'hours'
        },
        autoCreate: false,
        autoIndex: false,
        expireAfterSeconds: 86400
      });

      const Test = db.model('Test', schema, 'Test');
      await Test.init();

      await Test.collection.drop().catch(() => {});
      await Test.createCollection();

      const collections = await Test.db.db.listCollections().toArray();
      const coll = collections.find(coll => coll.name === 'Test');
      assert.ok(coll);
      assert.equal(coll.type, 'timeseries');
      assert.equal(coll.options.timeseries.timeField, 'timestamp');

      await Test.collection.drop().catch(() => {});
    });

    it('createCollection() enforces expireAfterSeconds (gh-11229)', async function() {
      const version = await start.mongodVersion();
      if (version[0] < 5) {
        this.skip();
        return;
      }

      const schema = Schema({ name: String, timestamp: Date, metadata: Object }, {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'metadata',
          granularity: 'hours'
        },
        autoCreate: false
      });

      const Test = db.model('TestGH11229Var1', schema);

      await Test.collection.drop().catch(() => {});
      await Test.createCollection({ expireAfterSeconds: 5 });

      const collOptions = await Test.collection.options();
      assert.ok(collOptions);
      assert.equal(collOptions.expireAfterSeconds, 5);
      assert.ok(collOptions.timeseries);
    });

    it('createCollection() enforces expires (gh-11229)', async function() {
      this.timeout(10000);
      const version = await start.mongodVersion();
      if (version[0] < 5) {
        this.skip();
        return;
      }

      const schema = Schema({ name: String, timestamp: Date, metadata: Object }, {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'metadata',
          granularity: 'hours'
        },
        autoCreate: false
      });

      const Test = db.model('TestGH11229Var2', schema, 'TestGH11229Var2');

      await Test.collection.drop().catch(() => {});
      await Test.createCollection({ expires: '5 seconds' });

      const collOptions = await Test.collection.options();
      assert.ok(collOptions);
      assert.equal(collOptions.expireAfterSeconds, 5);
      assert.ok(collOptions.timeseries);
    });

    it('createCollection() enforces expireAfterSeconds when set by Schema (gh-11229)', async function() {
      const version = await start.mongodVersion();
      if (version[0] < 5) {
        this.skip();
        return;
      }

      const schema = Schema({ name: String, timestamp: Date, metadata: Object }, {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'metadata',
          granularity: 'hours'
        },
        autoCreate: false,
        expireAfterSeconds: 5
      });

      const Test = db.model('TestGH11229Var3', schema);

      await Test.collection.drop().catch(() => {});
      await Test.createCollection();

      const collOptions = await Test.collection.options();
      assert.ok(collOptions);
      assert.equal(collOptions.expireAfterSeconds, 5);
      assert.ok(collOptions.timeseries);
    });

    it('createCollection() enforces expires when set by Schema (gh-11229)', async function() {
      const version = await start.mongodVersion();
      if (version[0] < 5) {
        this.skip();
        return;
      }

      const schema = Schema({ name: String, timestamp: Date, metadata: Object }, {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'metadata',
          granularity: 'hours'
        },
        autoCreate: false,
        expires: '5 seconds'
      });

      const Test = db.model('TestGH11229Var4', schema);

      await Test.collection.drop().catch(() => {});
      await Test.createCollection();

      const collOptions = await Test.collection.options();
      assert.ok(collOptions);
      assert.equal(collOptions.expireAfterSeconds, 5);
      assert.ok(collOptions.timeseries);
    });

    it('mongodb actually removes expired documents (gh-11229)', async function() {
      this.timeout(1000 * 80); // 80 seconds, see later comments on why
      const version = await start.mongodVersion();
      if (version[0] < 5) {
        this.skip();
        return;
      }

      const schema = Schema({ name: String, timestamp: Date, metadata: Object }, {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'metadata',
          granularity: 'hours'
        },
        autoCreate: false
      });

      const Test = db.model('TestMongoDBExpireRemoval', schema);

      await Test.collection.drop().catch(() => {});
      await Test.createCollection({ expireAfterSeconds: 5 });

      await Test.insertMany([
        {
          metadata: { sensorId: 5578, type: 'temperature' },
          timestamp: new Date('2021-05-18T00:00:00.000Z'),
          temp: 12
        },
        {
          metadata: { sensorId: 5578, type: 'temperature' },
          timestamp: new Date('2021-05-18T04:00:00.000Z'),
          temp: 11
        },
        {
          metadata: { sensorId: 5578, type: 'temperature' },
          timestamp: new Date('2021-05-18T08:00:00.000Z'),
          temp: 11
        },
        {
          metadata: { sensorId: 5578, type: 'temperature' },
          timestamp: new Date('2021-05-18T12:00:00.000Z'),
          temp: 12
        },
        {
          metadata: { sensorId: 5578, type: 'temperature' },
          timestamp: new Date('2021-05-18T16:00:00.000Z'),
          temp: 16
        },
        {
          metadata: { sensorId: 5578, type: 'temperature' },
          timestamp: new Date('2021-05-18T20:00:00.000Z'),
          temp: 15
        }, {
          metadata: { sensorId: 5578, type: 'temperature' },
          timestamp: new Date('2021-05-19T00:00:00.000Z'),
          temp: 13
        },
        {
          metadata: { sensorId: 5578, type: 'temperature' },
          timestamp: new Date('2021-05-19T04:00:00.000Z'),
          temp: 12
        },
        {
          metadata: { sensorId: 5578, type: 'temperature' },
          timestamp: new Date('2021-05-19T08:00:00.000Z'),
          temp: 11
        },
        {
          metadata: { sensorId: 5578, type: 'temperature' },
          timestamp: new Date('2021-05-19T12:00:00.000Z'),
          temp: 12
        },
        {
          metadata: { sensorId: 5578, type: 'temperature' },
          timestamp: new Date('2021-05-19T16:00:00.000Z'),
          temp: 17
        },
        {
          metadata: { sensorId: 5578, type: 'temperature' },
          timestamp: new Date('2021-05-19T20:00:00.000Z'),
          temp: 12
        }
      ]);

      const beforeExpirationCount = await Test.count({});
      assert.ok(beforeExpirationCount === 12);

      let intervalid;

      await Promise.race([
        // wait for 61 seconds, because mongodb's removal routine runs every 60 seconds, so it may be VERY flakey otherwise
        // under heavy load it is still not guranteed to actually run
        // see https://www.mongodb.com/docs/manual/core/timeseries/timeseries-automatic-removal/#timing-of-delete-operations
        new Promise(resolve => setTimeout(resolve, 1000 * 61)), // 61 seconds

        // in case it happens faster, to reduce test time
        new Promise(resolve => {
          intervalid = setInterval(async() => {
            const count = await Test.count({});
            if (count === 0) {
              resolve();
            }
          }, 1000); // every 1 second
        })
      ]);

      clearInterval(intervalid);

      const afterExpirationCount = await Test.count({});
      assert.equal(afterExpirationCount, 0);
    });

    it('createCollection() handles NamespaceExists errors (gh-9447)', async function() {
      const userSchema = new Schema({ name: String });
      const Model = db.model('User', userSchema);


      await Model.collection.drop().catch(() => {});

      await Model.createCollection();
      await Model.createCollection();

    });
  });

  it('dropDatabase() after init allows re-init (gh-6967)', async function() {
    this.timeout(10000);

    const Model = db.model('Test', new Schema({
      name: { type: String, index: true }
    }));


    await Model.init();

    await db.dropDatabase();

    assert.ok(!Model.$init);

    let threw = false;

    try {
      await Model.listIndexes();
    } catch (err) {
      assert.ok(err.message.indexOf('test') !== -1,
        err.message);
      threw = true;
    }
    assert.ok(threw);

    await Model.init();

    const indexes = await Model.listIndexes();

    assert.equal(indexes.length, 2);
    assert.deepEqual(indexes[1].key, { name: 1 });

  });

  it('replaceOne always sets version key in top-level (gh-7138)', async function() {
    const key = 'A';

    const schema = new mongoose.Schema({
      key: String,
      items: { type: [String], default: [] }
    });

    const Record = db.model('Test', schema);

    const record = { key: key, items: ['A', 'B', 'C'] };


    await Record.replaceOne({ key: key }, record, { upsert: true });

    const fetchedRecord = await Record.findOne({ key: key });

    assert.deepEqual(fetchedRecord.toObject().items, ['A', 'B', 'C']);

  });

  it('can JSON.stringify(Model.schema) with nested (gh-7220)', function() {
    const nested = Schema({ name: String });
    const Model = db.model('Test', Schema({ nested }));

    const _schema = JSON.parse(JSON.stringify(Model.schema));
    assert.ok(_schema.obj.nested);
  });

  it('Model.events() (gh-7125)', async function() {
    const Model = db.model('Test', Schema({
      name: { type: String, validate: () => false }
    }));

    let called = [];
    Model.events.on('error', err => { called.push(err); });


    await Model.findOne({ _id: 'Not a valid ObjectId' }).catch(() => {});
    assert.equal(called.length, 1);
    assert.equal(called[0].name, 'CastError');

    called = [];

    const doc = new Model({ name: 'fail' });
    await doc.save().catch(() => {});
    assert.equal(called.length, 1);
    assert.equal(called[0].name, 'ValidationError');

    called = [];

    await Model.aggregate([{ $group: { fail: true } }]).exec().catch(() => {});
    assert.equal(called.length, 1);
    assert.equal(called[0].name, 'MongoServerError');

  });

  it('sets $session() before pre save hooks run (gh-7742)', async function() {
    const schema = new Schema({ name: String });
    let sessions = [];
    schema.pre('save', function() {
      sessions.push(this.$session());
    });

    const SampleModel = db.model('Test', schema);


    await SampleModel.create({ name: 'foo' });
    // start session
    const session = await db.startSession();

    // get doc
    const doc = await SampleModel.findOne();
    doc.foo = 'bar';

    sessions = [];
    await doc.save({ session });
    assert.equal(sessions.length, 1);
    assert.strictEqual(sessions[0], session);

    sessions = [];
    await doc.save({ session: null });
    assert.equal(sessions.length, 1);
    assert.strictEqual(sessions[0], null);

  });

  it('sets $session() before pre remove hooks run (gh-7742)', async function() {
    const schema = new Schema({ name: String });
    let sessions = [];
    schema.pre('remove', function() {
      sessions.push(this.$session());
    });

    const SampleModel = db.model('Test', schema);


    await SampleModel.create({ name: 'foo' });
    // start session
    const session = await db.startSession();

    // get doc
    const doc = await SampleModel.findOne();
    doc.foo = 'bar';

    sessions = [];
    await doc.remove({ session });
    assert.equal(sessions.length, 1);
    assert.strictEqual(sessions[0], session);

  });

  it('set $session() before pre validate hooks run on bulkWrite and insertMany (gh-7769)', async function() {
    const schema = new Schema({ name: String });
    const sessions = [];
    schema.pre('validate', function() {
      sessions.push(this.$session());
    });

    const SampleModel = db.model('Test', schema);


    // start session
    const session = await db.startSession();

    await SampleModel.insertMany([{ name: 'foo' }, { name: 'bar' }], { session });
    assert.strictEqual(sessions[0], session);
    assert.strictEqual(sessions[1], session);

    await SampleModel.bulkWrite([{
      insertOne: {
        doc: { name: 'Samwell Tarly' }
      }
    }, {
      replaceOne: {
        filter: { name: 'bar' },
        replacement: { name: 'Gilly' }
      }
    }], { session });

    assert.strictEqual(sessions[2], session);
    assert.strictEqual(sessions[3], session);

  });

  it('custom statics that overwrite query functions dont get hooks by default (gh-7790)', async function() {

    const schema = new Schema({ name: String, loadedAt: Date });

    schema.statics.findOne = function() {
      return this.findOneAndUpdate({}, { loadedAt: new Date() }, { new: true });
    };

    let called = 0;
    schema.pre('findOne', function() {
      ++called;
    });
    const Model = db.model('Test', schema);

    await Model.create({ name: 'foo' });

    const res = await Model.findOne();
    assert.ok(res.loadedAt);
    assert.equal(called, 0);

  });

  it('error handling middleware passes saved doc (gh-7832)', async function() {
    const schema = new Schema({ _id: Number });

    const errs = [];
    const docs = [];
    schema.post('save', (err, doc, next) => {
      errs.push(err);
      docs.push(doc);
      next();
    });
    const Model = db.model('Test', schema);


    await Model.create({ _id: 1 });

    const doc = new Model({ _id: 1 });
    const err = await doc.save().then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.code, 11000);

    assert.equal(errs.length, 1);
    assert.equal(errs[0].code, 11000);

    assert.equal(docs.length, 1);
    assert.strictEqual(docs[0], doc);

  });

  it('throws readable error if calling Model function with bad context (gh-7957)', function() {
    const Model = db.model('Test', Schema({ name: String }));

    assert.throws(() => {
      new Model.discriminator('gh5957_fail', Schema({ doesntMatter: String }));
    }, /Model\.discriminator.*new Model/);

    const discriminator = Model.discriminator;

    assert.throws(() => {
      discriminator('gh5957_fail', Schema({ doesntMatter: String }));
    }, /Model\.discriminator.*MyModel/);
  });

  describe('exists() (gh-6872) (gh-8097) (gh-11138)', function() {
    it('returns a query', () => {
      const User = db.model('Test', new Schema({ name: String }));
      const query = User.exists({ name: 'Hafez' });
      assert.ok(query instanceof mongoose.Query);
    });

    it('returns lean document with `_id` only if document exists', async function() {
      const Model = db.model('Test', new Schema({ name: String }));

      const docFromCreation = await Model.create({ name: 'foo' });
      const existingDocument = await Model.exists({ _id: docFromCreation._id });
      assert.equal(existingDocument._id.toString(), docFromCreation._id.toString());
      assert.deepStrictEqual(existingDocument, { _id: docFromCreation._id });
      assert.ok(isLean(existingDocument));
    });


    it('returns `null` when no document exists', async() => {
      const Model = db.model('Test', new Schema({ name: String }));

      const existingDocument = await Model.exists({ name: 'I do not exist' });
      assert.equal(existingDocument, null);
    });
    it('returns `null` if no doc exists', async function() {
      const Model = db.model('Test', new Schema({ name: String }));

      await Model.create({ name: 'foo' });

      const existingDocumentWithStrict = await Model.exists({ otherProp: 'foo' }, { strict: false });
      assert.equal(existingDocumentWithStrict, null);
    });

    it('options (gh-8075)', async function() {
      const Model = db.model('Test', new Schema({ name: String }));

      const existingDocument = await Model.exists({});
      assert.equal(existingDocument, null);

      const explainResult = await Model.exists({}, { explain: true });
      assert.ok(explainResult);
    });
  });

  it('sets correct `Document#op` with `save()` (gh-8439)', function() {
    const schema = Schema({ name: String });
    const ops = [];
    schema.pre('validate', function() {
      ops.push(this.$op);
    });
    schema.pre('save', function() {
      ops.push(this.$op);
    });
    schema.post('validate', function() {
      ops.push(this.$op);
    });
    schema.post('save', function() {
      ops.push(this.$op);
    });

    const Model = db.model('Test', schema);
    const doc = new Model({ name: 'test' });

    return doc.save().then(() => {
      assert.deepEqual(ops, ['validate', 'validate', 'save', 'save']);
    });
  });

  it('bulkWrite sets discriminator filters (gh-8590)', async function() {
    const Animal = db.model('Test', Schema({ name: String }));
    const Dog = Animal.discriminator('Dog', Schema({ breed: String }));


    await Dog.bulkWrite([{
      updateOne: {
        filter: { name: 'Pooka' },
        update: { $set: { breed: 'Chorkie' } },
        upsert: true
      }
    }]);
    const res = await Animal.findOne();
    assert.ok(res instanceof Dog);
    assert.strictEqual(res.breed, 'Chorkie');

  });

  it('bulkWrite upsert works when update casts to empty (gh-8698)', async function() {
    const userSchema = new Schema({
      name: String
    });
    const User = db.model('User', userSchema);


    await User.bulkWrite([{
      updateOne: {
        filter: { name: 'test' },
        update: { notInSchema: true },
        upsert: true
      }
    }]);

    const doc = await User.findOne();
    assert.ok(doc);
    assert.strictEqual(doc.notInSchema, undefined);

  });

  it('bulkWrite upsert with non-schema path in filter (gh-8698)', async function() {
    const userSchema = new Schema({
      name: String
    });
    const User = db.model('User', userSchema);


    let err = await User.bulkWrite([{
      updateOne: {
        filter: { notInSchema: 'foo' },
        update: { name: 'test' },
        upsert: true
      }
    }]).then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.name, 'StrictModeError');
    assert.ok(err.message.indexOf('notInSchema') !== -1, err.message);

    err = await User.bulkWrite([{
      updateMany: {
        filter: { notInSchema: 'foo' },
        update: { name: 'test' },
        upsert: true
      }
    }]).then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.name, 'StrictModeError');
    assert.ok(err.message.indexOf('notInSchema') !== -1, err.message);

    err = await User.bulkWrite([{
      replaceOne: {
        filter: { notInSchema: 'foo' },
        update: { name: 'test' },
        upsert: true
      }
    }]).then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.name, 'StrictModeError');
    assert.ok(err.message.indexOf('notInSchema') !== -1, err.message);

  });

  it('bulkWrite can disable timestamps with updateOne, and updateMany', async function() {
    const userSchema = new Schema({
      name: String
    }, { timestamps: true });

    const User = db.model('User', userSchema);


    const users = await User.create([{ name: 'Hafez1' }, { name: 'Hafez2' }]);

    await User.bulkWrite([
      { updateOne: { filter: { _id: users[0]._id }, update: { name: 'John1' }, timestamps: false } },
      { updateMany: { filter: { _id: users[1]._id }, update: { name: 'John2' }, timestamps: false } }
    ]);

    const usersAfterUpdate = await Promise.all([
      User.findOne({ _id: users[0]._id }),
      User.findOne({ _id: users[1]._id })
    ]);

    assert.deepEqual(users[0].updatedAt, usersAfterUpdate[0].updatedAt);
    assert.deepEqual(users[1].updatedAt, usersAfterUpdate[1].updatedAt);

  });

  it('bulkWrite can overwrite schema `strict` option for filters and updates (gh-8778)', async function() {
    // Arrange
    const userSchema = new Schema({
      name: String
    }, { strict: true });

    const User = db.model('User', userSchema);


    const users = [
      { notInSchema: 1 },
      { notInSchema: 2 },
      { notInSchema: 3 }
    ];
    await User.collection.insertMany(users);

    // Act
    await User.bulkWrite([
      { updateOne: { filter: { notInSchema: 1 }, update: { notInSchema: 'first' } } },
      { updateMany: { filter: { notInSchema: 2 }, update: { notInSchema: 'second' } } },
      { replaceOne: { filter: { notInSchema: 3 }, replacement: { notInSchema: 'third' } } }
    ],
    { strict: false });

    // Assert
    const usersAfterUpdate = await Promise.all([
      User.collection.findOne({ _id: users[0]._id }),
      User.collection.findOne({ _id: users[1]._id }),
      User.collection.findOne({ _id: users[2]._id })
    ]);

    assert.equal(usersAfterUpdate[0].notInSchema, 'first');
    assert.equal(usersAfterUpdate[1].notInSchema, 'second');
    assert.equal(usersAfterUpdate[2].notInSchema, 'third');

  });

  it('cast errors have `kind` field (gh-8953)', async function() {

    const User = db.model('User', {});
    const err = await User.findOne({ _id: 'invalid' }).then(() => null, err => err);

    assert.deepEqual(err.kind, 'ObjectId');

  });

  it('casts bulkwrite timestamps to `Number` when specified (gh-9030)', async function() {

    const userSchema = new Schema({
      name: String,
      updatedAt: Number
    }, { timestamps: true });

    const User = db.model('User', userSchema);

    await User.create([{ name: 'user1' }, { name: 'user2' }]);

    await User.bulkWrite([
      {
        updateOne: {
          filter: { name: 'user1' },
          update: { name: 'new name' }
        }
      },
      {
        updateMany: {
          filter: { name: 'user2' },
          update: { name: 'new name' }
        }
      }
    ]);

    const users = await User.find().lean();
    assert.equal(typeof users[0].updatedAt, 'number');
    assert.equal(typeof users[1].updatedAt, 'number');

    // not-lean queries cast to number even if stored on DB as a date
    assert.equal(users[0] instanceof User, false);
    assert.equal(users[1] instanceof User, false);

  });

  it('Model.bulkWrite(...) does not throw an error when provided an empty array (gh-9131)', async function() {
    const userSchema = new Schema();
    const User = db.model('User', userSchema);

    const res = await User.bulkWrite([]);

    assert.deepEqual(
      res,
      {
        result: {
          ok: 1,
          writeErrors: [],
          writeConcernErrors: [],
          insertedIds: [],
          nInserted: 0,
          nUpserted: 0,
          nMatched: 0,
          nModified: 0,
          nRemoved: 0,
          upserted: []
        },
        insertedCount: 0,
        matchedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        upsertedCount: 0,
        upsertedIds: {},
        insertedIds: {},
        n: 0
      }
    );

  });

  it('Model.bulkWrite(...) does not throw an error with upsert:true, setDefaultsOnInsert: true (gh-9157)', async function() {

    const userSchema = new Schema(
      {
        friends: [String],
        age: { type: Number, default: 25 }
      },
      { timestamps: true }
    );
    const User = db.model('User', userSchema);

    await User.bulkWrite([
      {
        updateOne: {
          filter: { },
          update: { friends: ['Sam'] },
          upsert: true,
          setDefaultsOnInsert: true
        }
      }
    ]);

    const user = await User.findOne().sort({ _id: -1 });

    assert.equal(user.age, 25);
    assert.deepEqual(user.friends, ['Sam']);

  });

  it('allows calling `create()` after `bulkWrite()` (gh-9350)', async function() {
    const schema = Schema({ foo: Boolean });
    const Model = db.model('Test', schema);


    await Model.bulkWrite([
      { insertOne: { document: { foo: undefined } } },
      { updateOne: { filter: {}, update: { $set: { foo: true } } } }
    ]);

    await Model.create({ foo: undefined });

    const docs = await Model.find();
    assert.equal(docs.length, 2);

  });

  it('skips applying init hooks if `document` option set to `false` (gh-9316)', function() {
    const schema = new Schema({ name: String });
    let called = 0;
    schema.post(/.*/, { query: true, document: false }, function test() {
      ++called;
    });

    const Model = db.model('Test', schema);

    const doc = new Model();
    doc.init({ name: 'test' });
    assert.equal(called, 0);
  });

  it('retains atomics after failed `save()` (gh-9327)', async function() {
    const schema = new Schema({ arr: [String] });
    const Test = db.model('Test', schema);


    const doc = await Test.create({ arr: [] });

    await Test.deleteMany({});

    doc.arr.push('test');
    const err = await doc.save().then(() => null, err => err);
    assert.ok(err);

    const delta = doc.getChanges();
    assert.ok(delta.$push);
    assert.ok(delta.$push.arr);

  });

  it('doesnt wipe out changes made while `save()` is in flight (gh-9327)', async function() {
    const schema = new Schema({ num1: Number, num2: Number });
    const Test = db.model('Test', schema);


    const doc = await Test.create({});

    doc.num1 = 1;
    doc.num2 = 1;
    const p = doc.save();

    await new Promise((resolve) => setTimeout(resolve, 0));

    doc.num1 = 2;
    doc.num2 = 2;
    await p;

    await doc.save();

    const fromDb = await Test.findById(doc._id);
    assert.equal(fromDb.num1, 2);
    assert.equal(fromDb.num2, 2);

  });

  describe('returnOriginal (gh-9183)', function() {
    const originalValue = mongoose.get('returnOriginal');
    beforeEach(() => {
      mongoose.set('returnOriginal', false);
    });

    afterEach(() => {
      mongoose.set('returnOriginal', originalValue);
    });

    it('Setting `returnOriginal` works', async function() {

      const userSchema = new Schema({
        name: { type: String }
      });

      const User = db.model('User', userSchema);

      const createdUser = await User.create({ name: 'Hafez' });

      const user1 = await User.findOneAndUpdate({ _id: createdUser._id }, { name: 'Hafez1' });
      assert.equal(user1.name, 'Hafez1');

      const user2 = await User.findByIdAndUpdate(createdUser._id, { name: 'Hafez2' });
      assert.equal(user2.name, 'Hafez2');

      const user3 = await User.findOneAndReplace({ _id: createdUser._id }, { name: 'Hafez3' });
      assert.equal(user3.name, 'Hafez3');

    });

    it('`returnOriginal` can be overwritten', async function() {

      const userSchema = new Schema({
        name: { type: String }
      });

      const User = db.model('User', userSchema);

      const createdUser = await User.create({ name: 'Hafez' });

      const user1 = await User.findOneAndUpdate({ _id: createdUser._id }, { name: 'Hafez1' }, { new: false });
      assert.equal(user1.name, 'Hafez');

      const user2 = await User.findByIdAndUpdate(createdUser._id, { name: 'Hafez2' }, { new: false });
      assert.equal(user2.name, 'Hafez1');

      const user3 = await User.findOneAndReplace({ _id: createdUser._id }, { name: 'Hafez3' }, { new: false });
      assert.equal(user3.name, 'Hafez2');

    });
  });

  describe('buildBulkWriteOperations() (gh-9673)', () => {
    it('builds write operations', async() => {


      const userSchema = new Schema({
        name: { type: String }
      });

      const User = db.model('User', userSchema);

      const users = [
        new User({ name: 'Hafez1_gh-9673-1' }),
        new User({ name: 'Hafez2_gh-9673-1' }),
        new User({ name: 'I am the third name' })
      ];

      await users[2].save();
      users[2].name = 'I am the updated third name';

      const writeOperations = User.buildBulkWriteOperations(users);

      const desiredWriteOperations = [
        { insertOne: { document: users[0] } },
        { insertOne: { document: users[1] } },
        { updateOne: { filter: { _id: users[2]._id }, update: { $set: { name: 'I am the updated third name' } } } }
      ];

      assert.deepEqual(
        writeOperations,
        desiredWriteOperations
      );

    });

    it('throws an error when one document is invalid', () => {
      const userSchema = new Schema({
        name: { type: String, minLength: 5 }
      });

      const User = db.model('User', userSchema);

      const users = [
        new User({ name: 'a' }),
        new User({ name: 'Hafez2_gh-9673-1' }),
        new User({ name: 'b' })
      ];

      let err;
      try {
        User.buildBulkWriteOperations(users);
      } catch (error) {
        err = error;
      }


      assert.ok(err);
    });

    it('throws an error if documents is not an array', function() {
      const userSchema = new Schema({
        name: { type: String }
      });

      const User = db.model('User', userSchema);


      assert.throws(
        function() {
          User.buildBulkWriteOperations(null);
        },
        /bulkSave expects an array of documents to be passed/
      );
    });
    it('throws an error if one element is not a document', function() {
      const userSchema = new Schema({
        name: { type: String }
      });

      const User = db.model('User', userSchema);


      assert.throws(
        function() {
          User.buildBulkWriteOperations([
            new User({ name: 'Hafez' }),
            { name: 'I am not a document' }
          ]);
        },
        /documents\.1 was not a mongoose document/
      );
    });
    it('skips validation when given `skipValidation` true', () => {
      const userSchema = new Schema({
        name: { type: String, minLength: 5 }
      });

      const User = db.model('User', userSchema);

      const users = [
        new User({ name: 'a' }),
        new User({ name: 'Hafez2_gh-9673-1' }),
        new User({ name: 'b' })
      ];

      const writeOperations = User.buildBulkWriteOperations(users, { skipValidation: true });

      assert.equal(writeOperations.length, 3);
    });

    it('accepts `timestamps: false` (gh-12059)', async() => {
      // Arrange
      const userSchema = new Schema({
        name: { type: String, minLength: 5 }
      });

      const User = db.model('User', userSchema);

      const newUser = new User({ name: 'Hafez' });
      const userToUpdate = await User.create({ name: 'Hafez' });
      userToUpdate.name = 'John Doe';

      // Act
      const writeOperations = User.buildBulkWriteOperations([newUser, userToUpdate], { timestamps: false, skipValidation: true });

      // Assert
      const timestampsOptions = writeOperations.map(writeOperationContainer => {
        const operationObject = writeOperationContainer.updateOne || writeOperationContainer.insertOne;
        return operationObject.timestamps;
      });
      assert.deepEqual(timestampsOptions, [false, false]);
    });
    it('accepts `timestamps: true` (gh-12059)', async() => {
      // Arrange
      const userSchema = new Schema({
        name: { type: String, minLength: 5 }
      });

      const User = db.model('User', userSchema);

      const newUser = new User({ name: 'Hafez' });
      const userToUpdate = await User.create({ name: 'Hafez' });
      userToUpdate.name = 'John Doe';

      // Act
      const writeOperations = User.buildBulkWriteOperations([newUser, userToUpdate], { timestamps: true, skipValidation: true });

      // Assert
      const timestampsOptions = writeOperations.map(writeOperationContainer => {
        const operationObject = writeOperationContainer.updateOne || writeOperationContainer.insertOne;
        return operationObject.timestamps;
      });
      assert.deepEqual(timestampsOptions, [true, true]);
    });
    it('`timestamps` has `undefined` as default value (gh-12059)', async() => {
      // Arrange
      const userSchema = new Schema({
        name: { type: String, minLength: 5 }
      });

      const User = db.model('User', userSchema);

      const newUser = new User({ name: 'Hafez' });
      const userToUpdate = await User.create({ name: 'Hafez' });
      userToUpdate.name = 'John Doe';

      // Act
      const writeOperations = User.buildBulkWriteOperations([newUser, userToUpdate], { skipValidation: true });

      // Assert
      const timestampsOptions = writeOperations.map(writeOperationContainer => {
        const operationObject = writeOperationContainer.updateOne || writeOperationContainer.insertOne;
        return operationObject.timestamps;
      });
      assert.deepEqual(timestampsOptions, [undefined, undefined]);
    });
  });

  describe('bulkSave() (gh-9673)', function() {
    it('saves new documents', async function() {

      const userSchema = new Schema({
        name: { type: String }
      });

      const User = db.model('User', userSchema);


      await User.bulkSave([
        new User({ name: 'Hafez1_gh-9673-1' }),
        new User({ name: 'Hafez2_gh-9673-1' })
      ]);

      const users = await User.find().sort('name');

      assert.deepEqual(
        users.map(user => user.name),
        [
          'Hafez1_gh-9673-1',
          'Hafez2_gh-9673-1'
        ]
      );

    });

    it('updates documents', async function() {

      const userSchema = new Schema({
        name: { type: String }
      });

      const User = db.model('User', userSchema);


      await User.insertMany([
        new User({ name: 'Hafez1_gh-9673-2' }),
        new User({ name: 'Hafez2_gh-9673-2' }),
        new User({ name: 'Hafez3_gh-9673-2' })
      ]);

      const users = await User.find().sort('name');

      users[0].name = 'Hafez1_gh-9673-2-updated';
      users[1].name = 'Hafez2_gh-9673-2-updated';

      await User.bulkSave(users);

      const usersAfterUpdate = await User.find().sort('name');

      assert.deepEqual(
        usersAfterUpdate.map(user => user.name),
        [
          'Hafez1_gh-9673-2-updated',
          'Hafez2_gh-9673-2-updated',
          'Hafez3_gh-9673-2'
        ]
      );

    });

    it('returns writeResult on success', async() => {

      const userSchema = new Schema({
        name: { type: String }
      });

      const User = db.model('User', userSchema);


      await User.insertMany([
        new User({ name: 'Hafez1_gh-9673-2' }),
        new User({ name: 'Hafez2_gh-9673-2' })
      ]);

      const users = await User.find().sort('name');

      users[0].name = 'Hafez1_gh-9673-2-updated';
      users[1].name = 'Hafez2_gh-9673-2-updated';

      const writeResult = await User.bulkSave(users);
      assert.ok(writeResult.result.ok);

    });
    it('throws an error on failure', async() => {
      const userSchema = new Schema({
        name: { type: String, unique: true }
      });

      const User = db.model('User', userSchema);
      await User.init();

      await User.insertMany([
        new User({ name: 'Hafez1_gh-9673-2' }),
        new User({ name: 'Hafez2_gh-9673-2' })
      ]);

      const users = await User.find().sort('name');

      users[0].name = 'duplicate-name';
      users[1].name = 'duplicate-name';

      const err = await User.bulkSave(users).then(() => null, err => err);
      assert.ok(err);
    });

    it('changes document state from `isNew` `false` to `true`', async() => {

      const userSchema = new Schema({
        name: { type: String }
      });

      const User = db.model('User', userSchema);
      await User.init();

      const user1 = new User({ name: 'Hafez1_gh-9673-3' });
      const user2 = new User({ name: 'Hafez1_gh-9673-3' });

      assert.equal(user1.isNew, true);
      assert.equal(user2.isNew, true);

      await User.bulkSave([user1, user2]);

      assert.equal(user1.isNew, false);
      assert.equal(user2.isNew, false);

    });
    it('sets `isNew` to false when a document succeeds and `isNew` does not change when some fail', async() => {

      const userSchema = new Schema({
        name: { type: String, unique: true }
      });

      const User = db.model('User', userSchema);
      await User.init();

      const user1 = new User({ name: 'Hafez1_gh-9673-4' });
      const user2 = new User({ name: 'Hafez1_gh-9673-4' });

      const err = await User.bulkSave([user1, user2]).then(() => null, err => err);

      assert.ok(err);
      assert.equal(user1.isNew, false);
      assert.equal(user2.isNew, true);

    });
    it('changes documents state for successful writes', async() => {

      const userSchema = new Schema({
        name: { type: String, unique: true },
        age: Number
      });

      const User = db.model('User', userSchema);
      await User.init();

      const user1 = new User({ name: 'Sam', age: 26 });
      const user2 = new User({ name: 'Sam', age: 27 });

      assert.equal(user1.isNew, true);
      assert.equal(user2.isNew, true);

      const err = await User.bulkSave([user1, user2]).then(() => null, err => err);

      assert.ok(err);
      assert.deepEqual(user1.getChanges(), {});
      assert.deepEqual(user2.getChanges(), { $set: { age: 27, name: 'Sam' } });

    });
    it('triggers pre/post-save hooks', async() => {

      const userSchema = new Schema({
        name: String,
        age: Number
      });

      let preSaveCallCount = 0;
      let postSaveCallCount = 0;

      userSchema.pre('save', function() {
        preSaveCallCount++;
      });
      userSchema.post('save', function() {
        postSaveCallCount++;
      });

      const User = db.model('User', userSchema);

      const user1 = new User({ name: 'Sam1' });
      const user2 = new User({ name: 'Sam2' });


      await User.bulkSave([user1, user2]);
      assert.equal(preSaveCallCount, 2);
      assert.equal(postSaveCallCount, 2);

    });
    it('calls pre-save before actually saving', async() => {

      const userSchema = new Schema({ name: String });


      userSchema.pre('save', function() {
        this.name = 'name from pre-save';
      });

      const User = db.model('User', userSchema);

      const user1 = new User({ name: 'Sam1' });
      const user2 = new User({ name: 'Sam2' });


      await User.bulkSave([user1, user2]);

      const usersFromDatabase = await User.find({ _id: { $in: [user1._id, user2._id] } }).sort('_id');
      assert.equal(usersFromDatabase[0].name, 'name from pre-save');
      assert.equal(usersFromDatabase[1].name, 'name from pre-save');

    });
    it('works if some document is not modified (gh-10437)', async() => {
      const userSchema = new Schema({
        name: String
      });

      const User = db.model('User', userSchema);


      const user = await User.create({ name: 'Hafez' });

      const err = await User.bulkSave([user]).then(() => null, err => err);
      assert.ok(err == null);

    });
    it('Using bulkSave should not trigger an error (gh-11071)', async function() {

      const pairSchema = mongoose.Schema({
        name: String,
        timestamp: String
      }, { versionKey: false });

      const model = db.model('test', pairSchema);
      const tests = [
        { name: 't1', timestamp: Date.now() },
        { name: 't2', timestamp: Date.now() },
        { name: 't3', timestamp: Date.now() },
        { name: 't4', timestamp: Date.now() }
      ];

      await model.insertMany(tests, {
        ordered: false
      });
      const entries = await model.find({});
      for (const p of entries) {
        p.timestamp = Date.now();
      }

      const res = await model.bulkSave(entries);
      assert.ok(res);
    });

    it('accepts `timestamps: false` (gh-12059)', async() => {
      // Arrange
      const userSchema = new Schema({
        name: { type: String }
      }, { timestamps: true });

      const User = db.model('User', userSchema);
      const newUser = new User({ name: 'Sam' });

      const userToUpdate = await User.create({ name: 'Hafez', createdAt: new Date('1994-12-04'), updatedAt: new Date('1994-12-04') });
      userToUpdate.name = 'John Doe';

      // Act
      await User.bulkSave([newUser, userToUpdate], { timestamps: false });


      // Assert
      const createdUserPersistedInDB = await User.findOne({ _id: newUser._id });
      assert.deepStrictEqual(newUser.createdAt, undefined);
      assert.deepStrictEqual(newUser.updatedAt, undefined);

      assert.deepStrictEqual(createdUserPersistedInDB.createdAt, undefined);
      assert.deepStrictEqual(createdUserPersistedInDB.updatedAt, undefined);
      assert.deepStrictEqual(userToUpdate.createdAt, new Date('1994-12-04'));
      assert.deepStrictEqual(userToUpdate.updatedAt, new Date('1994-12-04'));
    });

    it('accepts `timestamps: true` (gh-12059)', async() => {
      // Arrange
      const userSchema = new Schema({
        name: { type: String, minLength: 5 }
      }, { timestamps: true });

      const User = db.model('User', userSchema);

      const newUser = new User({ name: 'Hafez' });
      const userToUpdate = await User.create({ name: 'Hafez' });
      userToUpdate.name = 'John Doe';

      // Act
      await User.bulkSave([newUser, userToUpdate], { timestamps: true });

      // Assert
      assert.ok(newUser.createdAt);
      assert.ok(newUser.updatedAt);
      assert.ok(userToUpdate.createdAt);
      assert.ok(userToUpdate.updatedAt);
    });

    it('`timestamps` has `undefined` as default value (gh-12059)', async() => {
      // Arrange
      const userSchema = new Schema({
        name: { type: String, minLength: 5 }
      }, { timestamps: true });

      const User = db.model('User', userSchema);

      const newUser = new User({ name: 'Hafez' });
      const userToUpdate = await User.create({ name: 'Hafez' });
      userToUpdate.name = 'John Doe';

      // Act
      await User.bulkSave([newUser, userToUpdate]);

      // Assert
      assert.ok(newUser.createdAt);
      assert.ok(newUser.updatedAt);
      assert.ok(userToUpdate.createdAt);
      assert.ok(userToUpdate.updatedAt);
    });

    it('respects `$timestamps()` (gh-12117)', async function() {
      // Arrange
      const userSchema = new Schema({ name: String }, { timestamps: true });

      const User = db.model('User', userSchema);

      const newUser1 = new User({ name: 'John' });
      const newUser2 = new User({ name: 'Bill' });

      newUser2.$timestamps(false);

      // Act
      await User.bulkSave([newUser1, newUser2]);

      // Assert
      assert.ok(newUser1.createdAt);
      assert.ok(newUser1.updatedAt);
      assert.ok(!newUser2.createdAt);
      assert.ok(!newUser2.updatedAt);
    });
  });

  describe('Setting the explain flag', function() {
    it('should give an object back rather than a boolean (gh-8275)', async function() {

      const MyModel = db.model('Character', mongoose.Schema({
        name: String,
        age: Number,
        rank: String
      }));

      await MyModel.create([
        { name: 'Jean-Luc Picard', age: 59, rank: 'Captain' },
        { name: 'William Riker', age: 29, rank: 'Commander' },
        { name: 'Deanna Troi', age: 28, rank: 'Lieutenant Commander' },
        { name: 'Geordi La Forge', age: 29, rank: 'Lieutenant' },
        { name: 'Worf', age: 24, rank: 'Lieutenant' }
      ]);
      const res = await MyModel.exists({}, { explain: true });

      assert.equal(typeof res, 'object');

    });
  });

  it('saves all error object properties to paths with type `Mixed` (gh-10126)', async() => {

    const userSchema = new Schema({ err: Schema.Types.Mixed });

    const User = db.model('User', userSchema);

    const err = new Error('I am a bad error');
    err.metadata = { reasons: ['Cloudflare is down', 'DNS'] };

    const user = await User.create({ err });
    const userFromDB = await User.findOne({ _id: user._id });

    assertErrorProperties(user);
    assertErrorProperties(userFromDB);


    function assertErrorProperties(user) {
      assert.equal(user.err.message, 'I am a bad error');
      assert.ok(user.err.stack);
      assert.deepEqual(user.err.metadata, { reasons: ['Cloudflare is down', 'DNS'] });
    }

  });

  it('supports skipping defaults on a find operation gh-7287', async function() {
    const betaSchema = new Schema({
      name: { type: String, default: 'foo' },
      age: { type: Number },
      _id: { type: Number }
    });

    const Beta = db.model('Beta', betaSchema);

    await Beta.collection.insertOne({ age: 21, _id: 1 });
    const test = await Beta.findOne({ _id: 1 }).setOptions({ defaults: false });
    assert.ok(!test.name);

  });

  it('casts ObjectIds with `ref` in schema when calling `hydrate()` (gh-11052)', async function() {
    const authorSchema = new Schema({
      name: String
    });
    const bookSchema = new Schema({
      author: { type: 'ObjectId', required: true, ref: 'Author' }
    });

    const Book = db.model('Book', bookSchema);
    const Author = db.model('Author', authorSchema);
    const entry = await Author.create({
      name: 'John'
    });

    const book = Book.hydrate({
      author: entry.id
    });

    assert.ok(book.author instanceof mongoose.Types.ObjectId);
  });

  it('respects `hydrate()` projection (gh-11375)', function() {
    const PieSchema = Schema({ filling: String, hoursToMake: Number, tasteRating: Number });
    const Test = db.model('Test', PieSchema);
    const doc = Test.hydrate({ filling: 'cherry', hoursToMake: 2 }, { filling: 1 });

    assert.equal(doc.filling, 'cherry');
    assert.equal(doc.hoursToMake, null);
  });

  it('supports setters option for `hydrate()` (gh-11653)', function() {
    const schema = Schema({
      text: {
        type: String,
        set: v => v.toLowerCase()
      }
    });
    const Test = db.model('Test', schema);

    const doc = Test.hydrate({ text: 'FOOBAR' }, null, { setters: true });
    assert.equal(doc.text, 'foobar');
  });

  it('sets index collation based on schema collation (gh-7621)', async function() {
    let testSchema = new Schema(
      { name: { type: String, index: true } }
    );
    let Test = db.model('Test', testSchema);

    await Test.init();

    let indexes = await Test.collection.listIndexes().toArray();
    assert.strictEqual(indexes.length, 2);
    assert.deepEqual(indexes[1].key, { name: 1 });
    assert.equal(indexes[1].collation, undefined);

    db.deleteModel(/Test/);
    testSchema = new Schema(
      { name: { type: String, index: true } },
      { collation: { locale: 'en' }, autoIndex: false }
    );
    Test = db.model('Test', testSchema);

    await Test.init();
    await Test.syncIndexes();

    indexes = await Test.collection.listIndexes().toArray();
    assert.strictEqual(indexes.length, 2);
    assert.deepEqual(indexes[1].key, { name: 1 });
    assert.strictEqual(indexes[1].collation.locale, 'en');
  });

  describe('Model.applyDefaults (gh-11945)', function() {
    it('applies defaults to POJOs', function() {
      const Test = db.model('Test', mongoose.Schema({
        _id: false,
        name: {
          type: String,
          default: 'John Smith'
        },
        age: {
          type: Number,
          default: 29
        },
        nestedName: {
          first: {
            type: String,
            default: 'John'
          },
          last: {
            type: String,
            default: 'Smith'
          },
          middle: {
            type: String,
            default: ''
          }
        },
        subdoc: {
          type: mongoose.Schema({
            _id: false,
            test: {
              type: String,
              default: 'subdoc default'
            }
          }),
          default: () => ({})
        },
        docArr: [{
          _id: false,
          test: {
            type: String,
            default: 'doc array default'
          }
        }]
      }));

      const obj = { age: 31, nestedName: { middle: 'James' }, docArr: [{}] };
      Test.applyDefaults(obj);

      assert.deepStrictEqual(obj, {
        name: 'John Smith',
        age: 31,
        nestedName: { first: 'John', last: 'Smith', middle: 'James' },
        subdoc: {
          test: 'subdoc default'
        },
        docArr: [{
          test: 'doc array default'
        }]
      });
    });

    it('applies defaults to documents', function() {
      const Test = db.model('Test', mongoose.Schema({
        _id: false,
        name: {
          type: String,
          default: 'John Smith'
        },
        age: {
          type: Number,
          default: 29
        },
        nestedName: {
          first: {
            type: String,
            default: 'John'
          },
          last: {
            type: String,
            default: 'Smith'
          },
          middle: {
            type: String,
            default: ''
          }
        },
        subdoc: {
          type: mongoose.Schema({
            _id: false,
            test: {
              type: String,
              default: 'subdoc default'
            }
          }),
          default: () => ({})
        },
        docArr: [{
          _id: false,
          test: {
            type: String,
            default: 'doc array default'
          }
        }]
      }));

      const obj = { age: 31, nestedName: { middle: 'James' }, docArr: [{}] };
      const doc = new Test(obj, null, { defaults: false });
      Test.applyDefaults(doc);

      assert.deepStrictEqual(doc.toObject(), {
        name: 'John Smith',
        age: 31,
        nestedName: { first: 'John', last: 'Smith', middle: 'James' },
        subdoc: {
          test: 'subdoc default'
        },
        docArr: [{
          test: 'doc array default'
        }]
      });
    });
  });

  describe('castObject() (gh-11945)', function() {
    it('casts values', function() {
      const Test = db.model('Test', mongoose.Schema({
        _id: false,
        num: Number,
        nested: {
          num: Number
        },
        subdoc: {
          type: mongoose.Schema({
            _id: false,
            num: Number
          }),
          default: () => ({})
        },
        docArr: [{
          _id: false,
          num: Number
        }]
      }));

      const obj = {
        num: '1',
        nested: { num: '2' },
        subdoc: { num: '3' },
        docArr: [{ num: '4' }]
      };
      const ret = Test.castObject(obj);
      assert.deepStrictEqual(ret, {
        num: 1,
        nested: { num: 2 },
        subdoc: { num: 3 },
        docArr: [{ num: 4 }]
      });
    });

    it('throws if cannot cast', function() {
      const Test = db.model('Test', mongoose.Schema({
        _id: false,
        num: Number,
        nested: {
          num: Number
        },
        subdoc: {
          type: mongoose.Schema({
            _id: false,
            num: Number
          })
        },
        docArr: [{
          _id: false,
          num: Number
        }]
      }));

      const obj = {
        num: 'foo',
        nested: { num: 'bar' },
        subdoc: { num: 'baz' },
        docArr: [{ num: 'qux' }]
      };
      let error;
      try {
        Test.castObject(obj);
      } catch (err) {
        error = err;
      }
      assert.ok(error);
      assert.equal(error.errors['num'].name, 'CastError');
      assert.equal(error.errors['nested.num'].name, 'CastError');
      assert.equal(error.errors['subdoc.num'].name, 'CastError');
      assert.equal(error.errors['docArr.0.num'].name, 'CastError');
    });
    it('should not throw an error if `ignoreCastErrors` is set (gh-12156)', function() {
      const Test = db.model('Test', mongoose.Schema({
        _id: false,
        num: Number,
        nested: {
          num: Number
        },
        subdoc: {
          type: mongoose.Schema({
            _id: false,
            num: Number
          }),
          default: () => ({})
        },
        docArr: [{
          _id: false,
          num: Number
        }]
      }));

      const obj = {
        num: 'not a number',
        nested: { num: '2' },
        subdoc: { num: 'not a number' },
        docArr: [{ num: '4' }]
      };
      const ret = Test.castObject(obj, { ignoreCastErrors: true });
      assert.deepStrictEqual(ret, { nested: { num: 2 }, docArr: [{ num: 4 }] });
    });
  });

  it('works if passing class that extends Document to `loadClass()` (gh-12254)', async function() {
    const DownloadJobSchema = new mongoose.Schema({ test: String });

    class B extends mongoose.Document {
      get foo() { return 'bar'; }

      bar() { return 'baz'; }
    }

    DownloadJobSchema.loadClass(B);

    let Test = db.model('Test', DownloadJobSchema);

    const { _id } = await Test.create({ test: 'value' });
    let doc = await Test.findById(_id);
    assert.ok(doc);
    assert.equal(doc.foo, 'bar');
    assert.equal(doc.test, 'value');
    assert.equal(doc.bar(), 'baz');

    db.deleteModel(/Test/);
    Test = db.model('Test', { job: DownloadJobSchema });

    await Test.deleteMany({});
    await Test.create({ _id, job: { test: 'value' } });
    doc = await Test.findById(_id);
    assert.ok(doc);
    assert.equal(doc.job.foo, 'bar');
    assert.equal(doc.job.test, 'value');
    assert.equal(doc.job.bar(), 'baz');
  });

  it('handles shared schema methods (gh-12423)', async function() {
    const sharedSubSchema = new mongoose.Schema({
      name: {
        type: String
      }
    });

    sharedSubSchema.methods.sharedSubSchemaMethod = function() {
      return 'test';
    };

    const mainDocumentSchema = new mongoose.Schema({
      subdocuments: {
        type: [sharedSubSchema],
        required: true
      }
    });
    const Test1 = db.model('Test1', mainDocumentSchema);

    const secondaryDocumentSchema = new mongoose.Schema({
      subdocuments: {
        type: [sharedSubSchema],
        required: true
      }
    });
    const Test2 = db.model('Test2', secondaryDocumentSchema);

    const mainDoc = await Test1.create({
      subdocuments: [
        {
          name: 'one'
        }
      ]
    });

    const secondaryDoc = await Test2.create({
      subdocuments: [
        {
          name: 'secondary'
        }
      ]
    });

    assert.strictEqual(mainDoc.subdocuments[0].sharedSubSchemaMethod(), 'test');
    assert.strictEqual(secondaryDoc.subdocuments[0].sharedSubSchemaMethod(), 'test');
  });

  describe('Check if static function that is supplied in schema option is available', function() {
    it('should give a static function back rather than undefined', function() {
      const testSchema = new Schema({}, { statics: { staticFn() { return 'Returned from staticFn'; } } });
      const TestModel = db.model('TestModel', testSchema);
      assert.equal(TestModel.staticFn(), 'Returned from staticFn');
    });
  });
});


async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isLean(document) {
  return document != null && !(document instanceof mongoose.Document);
}

function generateRandomCollectionName() {
  return 'mongoose_test_' + random();
}

function pick(obj, keys) {
  const newObj = {};
  for (const key of keys) {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}
