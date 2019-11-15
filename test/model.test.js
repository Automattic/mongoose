'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const co = require('co');
const random = require('../lib/utils').random;
const Buffer = require('safe-buffer').Buffer;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ValidatorError = mongoose.Error.ValidatorError;
const ValidationError = mongoose.Error.ValidationError;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;
const EmbeddedDocument = mongoose.Types.Embedded;
const MongooseError = mongoose.Error;

describe('Model', function() {
  let db;
  let Test;
  let Comments;
  let BlogPost;
  let bpSchema;
  let collection;

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
      comments: [Comments],
      nested: {array: [Number]}
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

    mongoose.model('BlogPost', BlogPost);
    bpSchema = BlogPost;

    collection = 'blogposts_' + random();
  });

  before(function() {
    db = start();
    const testSchema = new Schema({
      _id: {
        first_name: {type: String},
        age: {type: Number}
      },
      last_name: {type: String},
      doc_embed: {
        some: {type: String}
      }

    });
    Test = db.model('test-schema', testSchema);
  });

  after(function() {
    db.close();
  });

  it('can be created using _id as embedded document', function(done) {
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

    t.save(function(err) {
      assert.ifError(err);
      Test.findOne({}, function(err, doc) {
        assert.ifError(err);

        assert.ok('last_name' in doc);
        assert.ok('_id' in doc);
        assert.ok('first_name' in doc._id);
        assert.equal(doc._id.first_name, 'Daniel');
        assert.ok('age' in doc._id);
        assert.equal(doc._id.age, 21);

        assert.ok('doc_embed' in doc);
        assert.ok('some' in doc.doc_embed);
        assert.equal(doc.doc_embed.some, 'a');
        done();
      });
    });
  });

  describe('constructor', function() {
    it('works without "new" keyword', function(done) {
      let B = mongoose.model('BlogPost');
      let b = B();
      assert.ok(b instanceof B);
      B = db.model('BlogPost');
      b = B();
      assert.ok(b instanceof B);
      done();
    });
    it('works "new" keyword', function(done) {
      let B = mongoose.model('BlogPost');
      let b = new B();
      assert.ok(b instanceof B);
      B = db.model('BlogPost');
      b = new B();
      assert.ok(b instanceof B);
      done();
    });
  });
  describe('isNew', function() {
    it('is true on instantiation', function(done) {
      const BlogPost = db.model('BlogPost', collection);
      const post = new BlogPost;
      assert.equal(post.isNew, true);
      done();
    });

    it('on parent and subdocs on failed inserts', function(done) {
      const schema = new Schema({
        name: {type: String, unique: true},
        em: [new Schema({x: Number})]
      }, {collection: 'testisnewonfail_' + random()});

      const A = db.model('isNewOnFail', schema);

      A.on('index', function() {
        const a = new A({name: 'i am new', em: [{x: 1}]});
        a.save(function(err) {
          assert.ifError(err);
          assert.equal(a.isNew, false);
          assert.equal(a.em[0].isNew, false);
          const b = new A({name: 'i am new', em: [{x: 2}]});
          b.save(function(err) {
            assert.ok(err);
            assert.equal(b.isNew, true);
            assert.equal(b.em[0].isNew, true);
            done();
          });
        });
      });
    });
  });

  it('gh-2140', function(done) {
    const S = new Schema({
      field: [{text: String}]
    });

    const Model = db.model('gh-2140', S, 'gh-2140');
    const s = new Model();
    s.field = [null];
    s.field = [{text: 'text'}];

    assert.ok(s.field[0]);
    done();
  });

  describe('schema', function() {
    it('should exist', function(done) {
      const BlogPost = db.model('BlogPost', collection);

      assert.ok(BlogPost.schema instanceof Schema);
      assert.ok(BlogPost.prototype.schema instanceof Schema);
      done();
    });
    it('emits init event', function(done) {
      const schema = new Schema({name: String});
      let model;

      schema.on('init', function(model_) {
        model = model_;
      });

      const Named = db.model('EmitInitOnSchema', schema);
      assert.equal(model, Named);
      done();
    });
  });

  describe('structure', function() {
    it('default when instantiated', function(done) {
      const BlogPost = db.model('BlogPost', collection);

      const post = new BlogPost;
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
            arr: {type: Array, cast: String, default: ['a', 'b', 'c']},
            single: {type: Array, cast: String, default: ['a']}
          });
          mongoose.model('DefaultArray', DefaultArraySchema);
          const DefaultArray = db.model('DefaultArray', collection);
          const arr = new DefaultArray;
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
            arr: {type: Array, cast: String, default: []},
            auto: [Number]
          });
          mongoose.model('DefaultZeroCardArray', DefaultZeroCardArraySchema);
          const DefaultZeroCardArray = db.model('DefaultZeroCardArray', collection);
          const arr = new DefaultZeroCardArray();
          assert.equal(arr.get('arr').length, 0);
          assert.equal(arr.arr.length, 0);
          assert.equal(arr.auto.length, 0);
          done();
        });
      });
    });

    it('a hash with one null value', function(done) {
      const BlogPost = db.model('BlogPost', collection);

      const post = new BlogPost({
        title: null
      });
      assert.strictEqual(null, post.title);
      done();
    });

    it('when saved', function(done) {
      const BlogPost = db.model('BlogPost', collection);
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
        const BlogPost = db.model('BlogPost', collection);

        const post = new BlogPost();

        post.init({
          title: 'Test',
          slug: 'test',
          date: new Date,
          meta: {
            date: new Date,
            visitors: 5
          },
          published: true,
          owners: [new DocumentObjectId, new DocumentObjectId],
          comments: [
            {title: 'Test', date: new Date, body: 'Test'},
            {title: 'Super', date: new Date, body: 'Cool'}
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
        const BlogPost = db.model('BlogPost', collection);

        const post = new BlogPost;
        post.init({
          title: 'Test',
          slug: 'test',
          date: new Date
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
        const BlogPost = db.model('BlogPost', collection);

        const post = new BlogPost({
          meta: {
            date: new Date,
            visitors: 5
          }
        });

        assert.equal(post.get('meta.visitors').valueOf(), 5);
        done();
      });

      it('isNew on embedded documents', function(done) {
        const BlogPost = db.model('BlogPost', collection);

        const post = new BlogPost();
        post.init({
          title: 'Test',
          slug: 'test',
          comments: [{title: 'Test', date: new Date, body: 'Test'}]
        });

        assert.equal(post.get('comments')[0].isNew, false);
        done();
      });

      it('isNew on embedded documents after saving', function(done) {
        const BlogPost = db.model('BlogPost', collection);

        const post = new BlogPost({title: 'hocus pocus'});
        post.comments.push({title: 'Humpty Dumpty', comments: [{title: 'nested'}]});
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
    const schema = new Schema({name: String}, {collection: 'users1'});
    const Named = mongoose.model('CollectionNamedInSchema1', schema);
    assert.equal(Named.prototype.collection.name, 'users1');

    const users2schema = new Schema({name: String}, {collection: 'users2'});
    const Named2 = db.model('CollectionNamedInSchema2', users2schema);
    assert.equal(Named2.prototype.collection.name, 'users2');
    done();
  });

  it('saving a model with a null value should perpetuate that null value to the db', function(done) {
    const BlogPost = db.model('BlogPost', collection);

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

    const Parent = db.model('doc', parentSchema);

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
    const BlogPost = db.model('BlogPost', collection);

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

    const M = db.model('NestedObjectWithMongooseNumber', schema);
    const m = new M;
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
      _id: {type: Number},
      name: String
    });

    const MyModel = db.model('MyModel', MySchema, 'numberrangeerror' + random());

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
    const BlogPost = db.model('BlogPost', collection);

    const post = new BlogPost({
      meta: {
        date: new Date,
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
      const BlogPost = db.model('BlogPost', collection);

      const post = new BlogPost();
      assert.equal(post.cool(), post);
      done();
    });

    it('can be defined on embedded documents', function(done) {
      const ChildSchema = new Schema({name: String});
      ChildSchema.method('talk', function() {
        return 'gaga';
      });

      const ParentSchema = new Schema({
        children: [ChildSchema]
      });

      const ChildA = db.model('ChildA', ChildSchema, 'children_' + random());
      const ParentA = db.model('ParentA', ParentSchema, 'parents_' + random());

      const c = new ChildA;
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
      const NestedKey = db.model('NestedKey', NestedKeySchema);
      const n = new NestedKey();
      assert.equal(n.foo.bar(), n);
      done();
    });
  });

  describe('statics', function() {
    it('can be defined', function(done) {
      const BlogPost = db.model('BlogPost', collection);

      assert.equal(BlogPost.woot(), BlogPost);
      done();
    });
  });

  describe('casting as validation errors', function() {
    it('error', function(done) {
      const BlogPost = db.model('BlogPost', collection);
      let threw = false;

      let post;
      try {
        post = new BlogPost({date: 'Test', meta: {date: 'Test'}});
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
        post.date = new Date;
        post.meta.date = new Date;
        post.save(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });
    it('nested error', function(done) {
      const BlogPost = db.model('BlogPost', collection);
      let threw = false;

      const post = new BlogPost;

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
      const BlogPost = db.model('BlogPost', collection);

      const post = new BlogPost({
        title: 'Test',
        slug: 'test',
        comments: [{title: 'Test', date: new Date, body: 'Test'}]
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

      const db = start();
      const subs = new Schema({
        str: {
          type: String, validate: failingvalidator
        }
      });
      const BlogPost = db.model('BlogPost', {subs: [subs]});

      const post = new BlogPost();
      post.init({
        subs: [{str: 'gaga'}]
      });

      post.save(function(err) {
        db.close();
        assert.ok(err instanceof ValidationError);
        done();
      });
    });


    it('subdocument error when adding a subdoc', function(done) {
      const BlogPost = db.model('BlogPost', collection);
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
      const BlogPost = db.model('BlogPost', collection);

      const post = new BlogPost();
      post.set('title', '1');

      const id = post.get('_id');

      post.save(function(err) {
        assert.ifError(err);

        BlogPost.updateOne({title: 1, _id: id}, {title: 2}, function(err) {
          assert.ifError(err);

          BlogPost.findOne({_id: post.get('_id')}, function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.get('title'), '2');
            done();
          });
        });
      });
    });

    it('$pull', function(done) {
      const BlogPost = db.model('BlogPost', collection);
      const post = new BlogPost();

      post.get('numbers').push('3');
      assert.equal(post.get('numbers')[0], 3);
      done();
    });

    it('$push', function(done) {
      const BlogPost = db.model('BlogPost', collection);
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
      const BlogPost = db.model('BlogPost', collection);

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
        created: {type: Date, default: Date.now},
        valid: {type: Boolean, default: true}
      });

      const M = db.model('gh502', S);

      const m = new M;
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

      mongoose.model('TestValidation', new Schema({
        simple: {type: String, required: true},
        scope: {type: String, validate: [dovalidate, 'scope failed'], required: true},
        asyncScope: {type: String, validate: [dovalidateAsync, 'async scope failed'], required: true}
      }));

      const TestValidation = db.model('TestValidation');

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

      mongoose.model('TestValidationMessage', new Schema({
        simple: {type: String, validate: [validate, 'must be abc']}
      }));

      const TestValidationMessage = db.model('TestValidationMessage');

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
      const IntrospectionValidation = db.model('IntrospectionValidation', IntrospectionValidationSchema, 'introspections_' + random());
      IntrospectionValidation.schema.path('name').validate(function(value) {
        return value.length < 2;
      }, 'Name cannot be greater than 1 character for path "{PATH}" with value `{VALUE}`');
      const doc = new IntrospectionValidation({name: 'hi'});
      doc.save(function(err) {
        assert.equal(err.errors.name.message, 'Name cannot be greater than 1 character for path "name" with value `hi`');
        assert.equal(err.name, 'ValidationError');
        assert.ok(err.message.indexOf('IntrospectionValidation validation failed') !== -1, err.message);
        done();
      });
    });

    it('of required undefined values', function(done) {
      mongoose.model('TestUndefinedValidation', new Schema({
        simple: {type: String, required: true}
      }));

      const TestUndefinedValidation = db.model('TestUndefinedValidation');

      const post = new TestUndefinedValidation;

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
      const D = db.model('CallbackFiresOnceValidation', new Schema({
        username: {type: String, validate: /^[a-z]{6}$/i},
        email: {type: String, validate: /^[a-z]{6}$/i},
        password: {type: String, validate: /^[a-z]{6}$/i}
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
      mongoose.model('TestValidationOnResult', new Schema({
        resultv: {type: String, required: true}
      }));

      const TestV = db.model('TestValidationOnResult');

      const post = new TestV;

      post.validate(function(err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);

        post.resultv = 'yeah';
        post.save(function(err) {
          assert.ifError(err);
          TestV.findOne({_id: post.id}, function(err, found) {
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
      mongoose.model('TestPreviousNullValidation', new Schema({
        previous: {type: String, required: true},
        a: String
      }));

      const TestP = db.model('TestPreviousNullValidation');

      TestP.collection.insertOne({a: null, previous: null}, {}, function(err, f) {
        assert.ifError(err);
        TestP.findOne({_id: f.ops[0]._id}, function(err, found) {
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
      mongoose.model('TestNestedValidation', new Schema({
        nested: {
          required: {type: String, required: true}
        }
      }));

      const TestNestedValidation = db.model('TestNestedValidation');

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
      const Subsubdocs = new Schema({required: {type: String, required: true}});

      const Subdocs = new Schema({
        required: {type: String, required: true},
        subs: [Subsubdocs]
      });

      mongoose.model('TestSubdocumentsValidation', new Schema({
        items: [Subdocs]
      }));

      const TestSubdocumentsValidation = db.model('TestSubdocumentsValidation');

      const post = new TestSubdocumentsValidation();

      post.get('items').push({required: '', subs: [{required: ''}]});

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
      mongoose.model('TestCallingValidation', new Schema({
        item: {type: String, required: true}
      }));

      const TestCallingValidation = db.model('TestCallingValidation');

      const post = new TestCallingValidation;

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

      mongoose.model('TestRequiredFalse', new Schema({
        result: {type: String, validate: [validator, 'chump validator'], required: false}
      }));

      const TestV = db.model('TestRequiredFalse');

      const post = new TestV;

      assert.equal(post.schema.path('result').isRequired, false);
      done();
    });

    describe('middleware', function() {
      it('works', function(done) {
        let ValidationMiddlewareSchema = null,
            Post = null,
            post = null;

        ValidationMiddlewareSchema = new Schema({
          baz: {type: String}
        });

        ValidationMiddlewareSchema.pre('validate', function(next) {
          if (this.get('baz') === 'bad') {
            this.invalidate('baz', 'bad');
          }
          next();
        });

        mongoose.model('ValidationMiddleware', ValidationMiddlewareSchema);

        Post = db.model('ValidationMiddleware');
        post = new Post();
        post.set({baz: 'bad'});

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
          prop: {type: String}
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

        mongoose.model('AsyncValidationMiddleware', AsyncValidationMiddlewareSchema);

        Post = db.model('AsyncValidationMiddleware');
        post = new Post();
        post.set({prop: 'bad'});

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
          baz: {type: String},
          abc: {type: String, validate: [abc, 'must be abc']},
          test: {type: String, validate: [/test/, 'must also be abc']},
          required: {type: String, required: true}
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

        mongoose.model('ComplexValidationMiddleware', ComplexValidationMiddlewareSchema);

        Post = db.model('ComplexValidationMiddleware');
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

      mongoose.model('TestDefaults', new Schema({
        date: {type: Date, default: now}
      }));

      const TestDefaults = db.model('TestDefaults');

      const post = new TestDefaults;
      assert.ok(post.get('date') instanceof Date);
      assert.equal(+post.get('date'), now);
      done();
    });

    it('nested', function(done) {
      const now = Date.now();

      mongoose.model('TestNestedDefaults', new Schema({
        nested: {
          date: {type: Date, default: now}
        }
      }));

      const TestDefaults = db.model('TestNestedDefaults');

      const post = new TestDefaults();
      assert.ok(post.get('nested.date') instanceof Date);
      assert.equal(+post.get('nested.date'), now);
      done();
    });

    it('subdocument', function(done) {
      const now = Date.now();

      const Items = new Schema({
        date: {type: Date, default: now}
      });

      mongoose.model('TestSubdocumentsDefaults', new Schema({
        items: [Items]
      }));

      const TestSubdocumentsDefaults = db.model('TestSubdocumentsDefaults');

      const post = new TestSubdocumentsDefaults();
      post.get('items').push({});
      assert.ok(post.get('items')[0].get('date') instanceof Date);
      assert.equal(+post.get('items')[0].get('date'), now);
      done();
    });

    it('allows nulls', function(done) {
      const T = db.model('NullDefault', new Schema({name: {type: String, default: null}}), collection);
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
      const BlogPost = db.model('BlogPost', collection);
      const post = new BlogPost({
        title: 'Letters from Earth',
        author: 'Mark Twain'
      });

      assert.equal(post.get('titleWithAuthor'), 'Letters from Earth by Mark Twain');
      assert.equal(post.titleWithAuthor, 'Letters from Earth by Mark Twain');
      done();
    });

    it('set()', function(done) {
      const BlogPost = db.model('BlogPost', collection);
      const post = new BlogPost();

      post.set('titleWithAuthor', 'Huckleberry Finn by Mark Twain');
      assert.equal(post.get('title'), 'Huckleberry Finn');
      assert.equal(post.get('author'), 'Mark Twain');
      done();
    });

    it('should not be saved to the db', function(done) {
      const BlogPost = db.model('BlogPost', collection);
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

      mongoose.model('Person', PersonSchema);

      const Person = db.model('Person');
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
      const collection = 'blogposts_' + random();
      const BlogPost = db.model('BlogPost', collection);

      BlogPost.create({title: 1}, {title: 2}, function(err) {
        assert.ifError(err);

        BlogPost.remove({title: 1}, function(err) {
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
      const collection = 'blogposts_' + random();
      const BlogPost = db.model('BlogPost', collection);

      BlogPost.create({title: 1}, {title: 2}, function(err) {
        assert.ifError(err);
        BlogPost.findOne({title: 1}, {_id: 0}, function(error, doc) {
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
      const collection = 'blogposts_' + random();
      const BlogPost = db.model('BlogPost', collection);
      BlogPost.create({title: 1}, {title: 2}, function(err) {
        assert.ifError(err);

        BlogPost.remove({_id: undefined}, function(err) {
          assert.ifError(err);
          BlogPost.find({}, function(err, found) {
            assert.equal(found.length, 2, 'Should not remove any records');
            done();
          });
        });
      });
    });

    it('should not remove all documents in the collection (gh-3326)', function(done) {
      const collection = 'blogposts_' + random();
      const BlogPost = db.model('BlogPost', collection);

      BlogPost.create({title: 1}, {title: 2}, function(err) {
        assert.ifError(err);
        BlogPost.findOne({title: 1}, function(error, doc) {
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
    let B;

    before(function() {
      B = db.model('BlogPost', 'blogposts_' + random());
    });

    it('passes the removed document (gh-1419)', function(done) {
      B.create({}, function(err, post) {
        assert.ifError(err);
        B.findById(post, function(err, found) {
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
      B.create({}, function(err, post) {
        assert.ifError(err);
        B.findById(post, function(err, found) {
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

      const RH = db.model('RH', RHS, 'RH_' + random());

      RH.create({name: 'to be removed'}, function(err, post) {
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

    it('handles query vs document middleware (gh-3054)', function() {
      const schema = new Schema({ name: String });

      let docMiddleware = 0;
      let queryMiddleware = 0;

      schema.pre('remove', { query: true }, function() {
        assert.ok(this instanceof Model.Query);
        ++queryMiddleware;
      });

      schema.pre('remove', { document: true }, function() {
        assert.ok(this instanceof Model);
        ++docMiddleware;
      });

      const Model = db.model('gh3054', schema);

      return co(function*() {
        const doc = yield Model.create({ name: String });

        assert.equal(docMiddleware, 0);
        assert.equal(queryMiddleware, 0);
        yield doc.remove();

        assert.equal(docMiddleware, 1);
        assert.equal(queryMiddleware, 0);

        yield Model.remove({});
        assert.equal(docMiddleware, 1);
        assert.equal(queryMiddleware, 1);
      });
    });

    describe('when called multiple times', function() {
      it('always executes the passed callback gh-1210', function(done) {
        const collection = 'blogposts_' + random();
        const BlogPost = db.model('BlogPost', collection);
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
        author: {name: String},
        subject: {name: String}
      });

      mongoose.model('PostWithClashGetters', Post);

      const PostModel = db.model('PostWithClashGetters', 'postwithclash' + random());

      const post = new PostModel({
        title: 'Test',
        author: {name: 'A'},
        subject: {name: 'B'}
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

      const A = mongoose.model('gettersShouldNotBeTriggeredAtConstruction', schema);

      const a = new A({number: 100});
      assert.equal(called, false);
      let num = a.number;
      assert.equal(called, true);
      assert.equal(num.valueOf(), 100);
      assert.equal(a.$__getValue('number').valueOf(), 50);

      called = false;
      const b = new A;
      b.init({number: 50});
      assert.equal(called, false);
      num = b.number;
      assert.equal(called, true);
      assert.equal(num.valueOf(), 100);
      assert.equal(b.$__getValue('number').valueOf(), 50);
      done();
    });

    it('with type defined with { type: Native } (gh-190)', function(done) {
      const schema = new Schema({
        date: {type: Date}
      });

      mongoose.model('ShortcutGetterObject', schema);

      const ShortcutGetter = db.model('ShortcutGetterObject', 'shortcut' + random());
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
        mongoose.model('ShortcutGetterNested', schema);

        const ShortcutGetterNested = db.model('ShortcutGetterNested', collection);
        const doc = new ShortcutGetterNested();

        assert.equal(typeof doc.first, 'object');
        assert.ok(doc.first.second.isMongooseArray);
        done();
      });

      it('works with object literals', function(done) {
        const BlogPost = db.model('BlogPost', collection);

        const date = new Date;

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

        post.meta.date = new Date - 1000;
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

        mongoose.model('NestedStringA', schema);
        const T = db.model('NestedStringA', collection);

        const t = new T({nest: null});

        assert.strictEqual(t.nest.st, undefined);
        t.nest = {st: 'jsconf rules'};
        assert.deepEqual(t.nest.toObject(), {st: 'jsconf rules'});
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

        mongoose.model('NestedStringB', schema);
        const T = db.model('NestedStringB', collection);

        const t = new T({nest: undefined});

        assert.strictEqual(t.nest.st, undefined);
        t.nest = {st: 'jsconf rules'};
        assert.deepEqual(t.nest.toObject(), {st: 'jsconf rules'});
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

        mongoose.model('NestedStringC', schema);
        const T = db.model('NestedStringC', collection);

        const t = new T({nest: null});

        t.save(function(err) {
          assert.ifError(err);

          t.nest = {st: 'jsconf rules', yep: 'it does'};

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
        mongoose.model('MySchema', new Schema({
          nested: {
            arrays: []
          }
        }));

        const DooDad = db.model('MySchema');
        const doodad = new DooDad({nested: {arrays: []}});
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
          return [{x: 1}, {x: 2}, {x: 3}];
        }

        mongoose.model('MySchema2', new Schema({
          nested: {
            type: {type: String, default: 'yep'},
            array: {
              type: Array, default: def
            }
          }
        }));

        const DooDad = db.model('MySchema2', collection);
        const doodad = new DooDad();

        doodad.save(function(err) {
          assert.ifError(err);

          DooDad.findById(doodad._id, function(err, doodad) {
            assert.ifError(err);

            assert.equal(doodad.nested.type, 'yep');
            assert.deepEqual(doodad.nested.array.toObject(), [{x: 1}, {x: 2}, {x: 3}]);

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
        lat: {type: Number, default: 0, set: setLat},
        long: {type: Number, set: uptick}
      });

      let Deal = new Schema({
        title: String,
        locations: [Location]
      });

      Location = db.model('Location', Location, 'locations_' + random());
      Deal = db.model('Deal', Deal, 'deals_' + random());

      const location = new Location({lat: 1.2, long: 10});
      assert.equal(location.lat.valueOf(), 1);
      assert.equal(location.long.valueOf(), 1);

      const deal = new Deal({title: 'My deal', locations: [{lat: 1.2, long: 33}]});
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
    const BlogPost = db.model('BlogPost', collection);

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
      const BlogPost = db.model('BlogPost', collection);
      let totalDocs = 4;
      const saveQueue = [];

      const post = new BlogPost;

      function complete() {
        BlogPost.findOne({_id: post.get('_id')}, function(err, doc) {

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

        BlogPost.findOne({_id: post.get('_id')}, function(err, doc) {
          assert.ifError(err);
          doc.get('comments').push({title: '1'});
          save(doc);
        });

        BlogPost.findOne({_id: post.get('_id')}, function(err, doc) {
          assert.ifError(err);
          doc.get('comments').push({title: '2'});
          save(doc);
        });

        BlogPost.findOne({_id: post.get('_id')}, function(err, doc) {
          assert.ifError(err);
          doc.get('comments').push({title: '3'});
          save(doc);
        });

        BlogPost.findOne({_id: post.get('_id')}, function(err, doc) {
          assert.ifError(err);
          doc.get('comments').push({title: '4'}, {title: '5'});
          save(doc);
        });
      });
    });

    it('setting (gh-310)', function(done) {
      const BlogPost = db.model('BlogPost', collection);

      BlogPost.create({
        comments: [{title: 'first-title', body: 'first-body'}]
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
    mongoose.model('Outer', Outer);

    Outer = db.model('Outer', 'arr_test_' + random());

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

    mongoose.model('NestedPushes', schema);
    const Temp = db.model('NestedPushes', collection);

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

    const Temp = db.model('NestedPushes', schema, collection);

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

    const Temp = db.model('NestedPushes', schema, collection);

    Temp.create({nested: {nums: [1, 2, 3, 4, 5]}}, function(err, t) {
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

    const Temp = db.model('NestedPushes', schema, collection);

    const p1 = Temp.create({nested: {nums: [1, 2, 3, 4, 5]}});
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

    const Temp = db.model('NestedPushes', schema, collection);

    Temp.create({nested: {nums: [1, 2, 3, 4, 5]}}, function(err, t) {
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

    mongoose.model('TestingShift', schema);
    const Temp = db.model('TestingShift', collection);

    Temp.create({nested: {nums: [1, 2, 3]}}, function(err, t) {
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

      mongoose.model('Temp', TempSchema);
      const Temp = db.model('Temp', collection);

      const t = new Temp();

      function complete() {
        Temp.findOne({_id: t.get('_id')}, function(err, doc) {
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

        Temp.findOne({_id: t.get('_id')}, function(err, doc) {
          assert.ifError(err);
          doc.get('nums').push(1);
          save(doc);
        });

        Temp.findOne({_id: t.get('_id')}, function(err, doc) {
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

      mongoose.model('StrList', StrListSchema);
      const StrList = db.model('StrList');

      const t = new StrList();

      function complete() {
        StrList.findOne({_id: t.get('_id')}, function(err, doc) {
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

        StrList.findOne({_id: t.get('_id')}, function(err, doc) {
          assert.ifError(err);
          doc.get('strings').push('a');
          save(doc);
        });

        StrList.findOne({_id: t.get('_id')}, function(err, doc) {
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

      mongoose.model('BufList', BufListSchema);
      const BufList = db.model('BufList');

      const t = new BufList();

      function complete() {
        BufList.findOne({_id: t.get('_id')}, function(err, doc) {
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

        BufList.findOne({_id: t.get('_id')}, function(err, doc) {
          assert.ifError(err);
          doc.get('buffers').push(Buffer.from([140]));
          save(doc);
        });

        BufList.findOne({_id: t.get('_id')}, function(err, doc) {
          assert.ifError(err);
          doc.get('buffers').push(Buffer.from([141]), Buffer.from([142]));
          save(doc);
        });
      });
    });

    it('works with modified element properties + doc removal (gh-975)', function(done) {
      const B = db.model('BlogPost', collection);
      const b = new B({comments: [{title: 'gh-975'}]});

      b.save(function(err) {
        assert.ifError(err);

        b.comments[0].title = 'changed';
        b.save(function(err) {
          assert.ifError(err);

          b.comments[0].remove();
          b.save(function(err) {
            assert.ifError(err);

            B.findByIdAndUpdate({_id: b._id}, {$set: {comments: [{title: 'a'}]}}, {new: true}, function(err, doc) {
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
      const BlogPost = db.model('BlogPost', collection);

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
    const BlogPost = db.model('BlogPost', collection);

    BlogPost.create({comments: [{title: 'woot'}]}, function(err, post) {
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
      subObj: {subName: String}
    });
    const GH334Schema = new Schema({name: String, arrData: [SubSchema]});

    mongoose.model('GH334', GH334Schema);
    const AModel = db.model('GH334');
    const instance = new AModel();

    instance.set({name: 'name-value', arrData: [{name: 'arrName1', subObj: {subName: 'subName1'}}]});
    instance.save(function(err) {
      assert.ifError(err);
      AModel.findById(instance.id, function(err, doc) {
        assert.ifError(err);
        doc.arrData[0].set('subObj', {subName: 'modified subName'});
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
    const BlogPost = db.model('BlogPost', collection);
    const post = new BlogPost();

    post.comments.push({title: 'woot'});
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
      const BlogPost = db.model('BlogPost', collection);

      const post = new BlogPost();

      post.comments.push({title: 'woot'});
      post.comments.push({title: 'aaaa'});

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
      const BlogPost = db.model('BlogPost', collection);

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
      const BlogPost = db.model('BlogPost', collection);

      const post = new BlogPost();

      post.save(function(err) {
        assert.ifError(err);

        BlogPost.findById(post.get('_id'), function(err, doc) {
          assert.ifError(err);
          assert.strictEqual(doc.comments.id(new DocumentObjectId), null);
          done();
        });
      });
    });
  });

  it('removing a subdocument atomically', function(done) {
    const BlogPost = db.model('BlogPost', collection);

    const post = new BlogPost();
    post.title = 'hahaha';
    post.comments.push({title: 'woot'});
    post.comments.push({title: 'aaaa'});

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
    const BlogPost = db.model('BlogPost', collection);

    const post = new BlogPost();
    post.title = 'hahaha';
    post.comments.push({title: 'woot'});
    post.comments.push({title: 'aaaa'});

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
    const BlogPost = db.model('BlogPost', collection);
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
    post2.mixed = {name: 'mr bungle', arr: []};
    post2.save(function(err) {
      assert.ifError(err);

      BlogPost.findById(post2._id, function(err, doc) {
        assert.ifError(err);

        assert.equal(Array.isArray(doc.mixed.arr), true);

        doc.mixed = [{foo: 'bar'}];
        doc.save(function(err) {
          assert.ifError(err);

          BlogPost.findById(doc._id, function(err, doc) {
            assert.ifError(err);

            assert.equal(Array.isArray(doc.mixed), true);
            doc.mixed.push({hello: 'world'});
            doc.mixed.push(['foo', 'bar']);
            doc.markModified('mixed');

            doc.save(function(err) {
              assert.ifError(err);

              BlogPost.findById(post2._id, function(err, doc) {
                assert.ifError(err);

                assert.deepEqual(doc.mixed[0], {foo: 'bar'});
                assert.deepEqual(doc.mixed[1], {hello: 'world'});
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
          post3.mixed = new Date;
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
    const BlogPost = db.model('BlogPost');

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
      type: {type: String, default: 'YES!'}
    }));

    const TestDefaults = db.model('TestTypeDefaults');

    let post = new TestDefaults();
    assert.equal(typeof post.get('type'), 'string');
    assert.equal(post.get('type'), 'YES!');

    // GH-402
    const TestDefaults2 = db.model('TestTypeDefaults2', new Schema({
      x: {y: {type: {type: String}, owner: String}}
    }));

    post = new TestDefaults2;
    post.x.y.type = '#402';
    post.x.y.owner = 'me';
    post.save(function(err) {
      assert.ifError(err);
      done();
    });
  });

  it('unaltered model does not clear the doc (gh-195)', function(done) {
    const BlogPost = db.model('BlogPost', collection);

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
        const schema = new Schema({name: String});
        let called = 0;

        schema.pre('save', function(next) {
          called++;
          next(undefined);
        });

        schema.pre('save', function(next) {
          called++;
          next(null);
        });

        const S = db.model('S', schema, collection);
        const s = new S({name: 'zupa'});

        s.save(function(err) {
          assert.ifError(err);
          assert.equal(called, 2);
          done();
        });
      });


      it('with an async waterfall', function(done) {
        const schema = new Schema({name: String});
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

        const S = db.model('S', schema, collection);
        const s = new S({name: 'zupa'});

        const p = s.save();
        p.then(function() {
          assert.equal(called, 2);
          done();
        }).catch(done);
      });


      it('called on all sub levels', function(done) {
        const grandSchema = new Schema({name: String});
        grandSchema.pre('save', function(next) {
          this.name = 'grand';
          next();
        });

        const childSchema = new Schema({name: String, grand: [grandSchema]});
        childSchema.pre('save', function(next) {
          this.name = 'child';
          next();
        });

        const schema = new Schema({name: String, child: [childSchema]});

        schema.pre('save', function(next) {
          this.name = 'parent';
          next();
        });

        const S = db.model('presave_hook', schema, 'presave_hook');
        const s = new S({name: 'a', child: [{name: 'b', grand: [{name: 'c'}]}]});

        s.save(function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.name, 'parent');
          assert.equal(doc.child[0].name, 'child');
          assert.equal(doc.child[0].grand[0].name, 'grand');
          done();
        });
      });


      it('error on any sub level', function(done) {
        const grandSchema = new Schema({name: String});
        grandSchema.pre('save', function(next) {
          next(new Error('Error 101'));
        });

        const childSchema = new Schema({name: String, grand: [grandSchema]});
        childSchema.pre('save', function(next) {
          this.name = 'child';
          next();
        });

        const schema = new Schema({name: String, child: [childSchema]});
        schema.pre('save', function(next) {
          this.name = 'parent';
          next();
        });

        const S = db.model('presave_hook_error', schema, 'presave_hook_error');
        const s = new S({name: 'a', child: [{name: 'b', grand: [{name: 'c'}]}]});

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

          const PreInit = db.model('PreInit', PreInitSchema, 'pre_inits' + random());

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

        mongoose.model('PostHookTest', schema);

        const BlogPost = db.model('PostHookTest');

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

        mongoose.model('Parent', ParentSchema);

        const Parent = db.model('Parent');

        const parent = new Parent();

        parent.embeds.push({title: 'Testing post hooks for embedded docs'});

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
      const BlogPost = db.model('BlogPost' + random(), bpSchema);

      BlogPost.create({title: 'interoperable count as promise'}, function(err) {
        assert.ifError(err);
        const query = BlogPost.count({title: 'interoperable count as promise'});
        query.exec(function(err, count) {
          assert.ifError(err);
          assert.equal(count, 1);
          done();
        });
      });
    });

    it('countDocuments()', function() {
      const BlogPost = db.model('BlogPost' + random(), bpSchema);

      return BlogPost.create({ title: 'foo' }).
        then(() => BlogPost.countDocuments({ title: 'foo' }).exec()).
        then(count => {
          assert.equal(count, 1);
        });
    });

    it('estimatedDocumentCount()', function() {
      const BlogPost = db.model('BlogPost' + random(), bpSchema);

      return BlogPost.create({ title: 'foo' }).
        then(() => BlogPost.estimatedDocumentCount({ title: 'foo' }).exec()).
        then(count => {
          assert.equal(count, 1);
        });
    });

    it('update()', function(done) {
      const col = 'BlogPost' + random();
      const BlogPost = db.model(col, bpSchema);

      BlogPost.create({title: 'interoperable update as promise'}, function(err) {
        assert.ifError(err);
        const query = BlogPost.update({title: 'interoperable update as promise'}, {title: 'interoperable update as promise delta'});
        query.exec(function(err, res) {
          assert.ifError(err);
          assert.equal(res.n, 1);
          assert.equal(res.nModified, 1);
          BlogPost.count({title: 'interoperable update as promise delta'}, function(err, count) {
            assert.ifError(err);
            assert.equal(count, 1);
            done();
          });
        });
      });
    });

    it('findOne()', function(done) {
      const BlogPost = db.model('BlogPost' + random(), bpSchema);

      BlogPost.create({title: 'interoperable findOne as promise'}, function(err, created) {
        assert.ifError(err);
        const query = BlogPost.findOne({title: 'interoperable findOne as promise'});
        query.exec(function(err, found) {
          assert.ifError(err);
          assert.equal(found.id, created.id);
          done();
        });
      });
    });

    it('find()', function(done) {
      const BlogPost = db.model('BlogPost' + random(), bpSchema);

      BlogPost.create(
        {title: 'interoperable find as promise'},
        {title: 'interoperable find as promise'},
        function(err, createdOne, createdTwo) {
          assert.ifError(err);
          const query = BlogPost.find({title: 'interoperable find as promise'}).sort('_id');
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
      const BlogPost = db.model('BlogPost' + random(), bpSchema);

      BlogPost.create(
        {title: 'interoperable remove as promise'},
        function(err) {
          assert.ifError(err);
          const query = BlogPost.remove({title: 'interoperable remove as promise'});
          query.exec(function(err) {
            assert.ifError(err);
            BlogPost.count({title: 'interoperable remove as promise'}, function(err, count) {
              assert.equal(count, 0);
              done();
            });
          });
        });
    });

    it('op can be changed', function(done) {
      const BlogPost = db.model('BlogPost' + random(), bpSchema);
      const title = 'interop ad-hoc as promise';

      BlogPost.create({title: title}, function(err, created) {
        assert.ifError(err);
        const query = BlogPost.count({title: title});
        query.exec('findOne', function(err, found) {
          assert.ifError(err);
          assert.equal(found.id, created.id);
          done();
        });
      });
    });

    describe('promises', function() {
      it.skip('count()', function(done) {
        const BlogPost = db.model('BlogPost' + random(), bpSchema);

        BlogPost.create({title: 'interoperable count as promise 2'}, function(err) {
          assert.ifError(err);
          const query = BlogPost.count({title: 'interoperable count as promise 2'});
          const promise = query.exec();
          promise.then(function(count) {
            assert.equal(count, 1);
            done();
          }).catch(done);
        });
      });

      it.skip('update()', function(done) {
        const col = 'BlogPost' + random();
        const BlogPost = db.model(col, bpSchema);

        BlogPost.create({title: 'interoperable update as promise 2'}, function(err) {
          assert.ifError(err);
          const query = BlogPost.update({title: 'interoperable update as promise 2'}, {title: 'interoperable update as promise delta 2'});
          const promise = query.exec();
          promise.then(function() {
            BlogPost.count({title: 'interoperable update as promise delta 2'}, function(err, count) {
              assert.ifError(err);
              assert.equal(count, 1);
              done();
            });
          });
        });
      });

      it('findOne()', function() {
        const BlogPost = db.model('BlogPost' + random(), bpSchema);

        let created;
        return BlogPost.create({title: 'interoperable findOne as promise 2'}).
          then(doc => {
            created = doc;
            return BlogPost.
              findOne({title: 'interoperable findOne as promise 2'}).
              exec();
          }).
          then(found => {
            assert.equal(found.id, created.id);
          });
      });

      it('find()', function(done) {
        const BlogPost = db.model('BlogPost' + random(), bpSchema);

        BlogPost.create(
          {title: 'interoperable find as promise 2'},
          {title: 'interoperable find as promise 2'},
          function(err, createdOne, createdTwo) {
            assert.ifError(err);
            const query = BlogPost.find({title: 'interoperable find as promise 2'}).sort('_id');
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
        const BlogPost = db.model('BlogPost' + random(), bpSchema);

        return BlogPost.create({title: 'interoperable remove as promise 2'}).
          then(() => {
            return BlogPost.remove({title: 'interoperable remove as promise 2'});
          }).
          then(() => {
            return BlogPost.count({title: 'interoperable remove as promise 2'});
          }).
          then(count => {
            assert.equal(count, 0);
          });
      });

      it('are thenable', function(done) {
        const B = db.model('BlogPost' + random(), bpSchema);

        const peopleSchema = new Schema({name: String, likes: ['ObjectId']});
        const P = db.model('promise-BP-people', peopleSchema, random());
        B.create(
          {title: 'then promise 1'},
          {title: 'then promise 2'},
          {title: 'then promise 3'},
          function(err, d1, d2, d3) {
            assert.ifError(err);

            P.create(
              {name: 'brandon', likes: [d1]},
              {name: 'ben', likes: [d2]},
              {name: 'bernie', likes: [d3]},
              function(err) {
                assert.ifError(err);

                const promise = B.find({title: /^then promise/}).select('_id').exec();
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
      const BlogPost = db.model('BlogPost', collection);

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
        meta: {visitors: 45},
        comments: [
          {_id: id2, title: 'my comment', date: date, body: 'this is a comment'},
          {_id: id3, title: 'the next thang', date: date, body: 'this is a comment too!'}]
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
      const P = db.model('pathnametest', new Schema({path: String}));

      let threw = false;
      try {
        new P({path: 'i should not throw'});
      } catch (err) {
        threw = true;
      }

      assert.ok(!threw);
      done();
    });
  });

  it('subdocuments with changed values should persist the values', function(done) {
    const Subdoc = new Schema({name: String, mixed: Schema.Types.Mixed});
    const T = db.model('SubDocMixed', new Schema({subs: [Subdoc]}));

    const t = new T({subs: [{name: 'Hubot', mixed: {w: 1, x: 2}}]});
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
      const db = start();
      const BlogPost = db.model('BlogPost', collection);

      const post = new BlogPost({mixed: {rgx: /^asdf$/}});
      assert.ok(post.mixed.rgx instanceof RegExp);
      assert.equal(post.mixed.rgx.source, '^asdf$');
      post.save(function(err) {
        assert.ifError(err);
        BlogPost.findById(post._id, function(err, post) {
          db.close();
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
    const BlogPost = db.model('BlogPost', collection);

    const post = new BlogPost();
    post.comments.push({title: 'one'});
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
          next(new Error);
        });

        const DefaultErr = db.model('DefaultErr3', DefaultErrSchema, 'default_err_' + random());

        DefaultErr.on('error', function(err) {
          assert.ok(err instanceof Error);
          done();
        });

        new DefaultErr().save().catch(() => {});
      });
    });

    it('saved changes made within callback of a previous no-op save gh-1139', function(done) {
      const B = db.model('BlogPost', collection);

      const post = new B({title: 'first'});
      post.save(function(err) {
        assert.ifError(err);

        // no op
        post.save(function(err) {
          assert.ifError(err);

          post.title = 'changed';
          post.save(function(err) {
            assert.ifError(err);

            B.findById(post, function(err, doc) {
              assert.ifError(err);
              assert.equal(doc.title, 'changed');
              done();
            });
          });
        });
      });
    });

    it('rejects new documents that have no _id set (1595)', function(done) {
      const s = new Schema({_id: {type: String}});
      const B = db.model('1595', s);
      const b = new B;
      b.save(function(err) {
        assert.ok(err);
        assert.ok(/must have an _id/.test(err));
        done();
      });
    });

    it('no TypeError when attempting to save more than once after using atomics', function(done) {
      const M = db.model('M', new Schema({
        test: {type: 'string', unique: true},
        elements: [{
          el: {type: 'string', required: true}
        }]
      }));
      const a = new M({
        test: 'a',
        elements: [{el: 'b'}]
      });
      const b = new M({
        test: 'b',
        elements: [{el: 'c'}]
      });
      a.save(function() {
        b.save(function() {
          b.elements.push({el: 'd'});
          b.test = 'a';
          b.save(function(error,res) {
            assert.strictEqual(!error,false);
            assert.strictEqual(res,undefined);
            b.save(function(error,res) {
              assert.strictEqual(!error,false);
              assert.strictEqual(res,undefined);
              done();
            });
          });
        });
      });
    });
    it('should clear $versionError and saveOptions after saved (gh-8040)', function(done) {
      const schema = new Schema({name: String});
      const Model = db.model('gh8040', schema);
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
      const B = db.model('BlogPost', collection);

      B.create({title: 'gh-1126', numbers: [1, 2]}, function(err, b) {
        assert.ifError(err);
        B.findById(b._id, function(err, b) {
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

            B.findById(b._id, function(err, b) {
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
                B.findById(b._id, function(err, b) {
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
      const B = db.model('BlogPost', 'gh-1303-' + random());

      B.create(
        {title: 'gh-1303', comments: [{body: 'a'}, {body: 'b'}, {body: 'c'}]},
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
      const M = db.model('backwardDataConflict', new Schema({namey: {first: String, last: String}}));
      const m = new M({namey: '[object Object]'});
      m.namey = {first: 'GI', last: 'Joe'};// <-- should overwrite the string
      m.save(function(err) {
        assert.strictEqual(err, null);
        assert.strictEqual('GI', m.namey.first);
        assert.strictEqual('Joe', m.namey.last);
        done();
      });
    });

    it('with positional notation on path not existing in schema (gh-1048)', function(done) {
      const db = start();

      const M = db.model('backwardCompat-gh-1048', Schema({name: 'string'}));
      db.on('open', function() {
        const o = {
          name: 'gh-1048',
          _id: new mongoose.Types.ObjectId,
          databases: {
            0: {keys: 100, expires: 0},
            15: {keys: 1, expires: 0}
          }
        };

        M.collection.insertOne(o, {safe: true}, function(err) {
          assert.ifError(err);
          M.findById(o._id, function(err, doc) {
            db.close();
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
  });

  describe('non-schema adhoc property assignments', function() {
    it('are not saved', function(done) {
      const B = db.model('BlogPost', collection);

      const b = new B;
      b.whateveriwant = 10;
      b.save(function(err) {
        assert.ifError(err);
        B.collection.findOne({_id: b._id}, function(err, doc) {
          assert.ifError(err);
          assert.ok(!('whateveriwant' in doc));
          done();
        });
      });
    });
  });

  it('should not throw range error when using Number _id and saving existing doc (gh-691)', function(done) {
    const T = new Schema({_id: Number, a: String});
    const D = db.model('Testing691', T, 'asdf' + random());
    const d = new D({_id: 1});
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
      const DefaultTestObject = db.model('defaultTestObject',
        new Schema({
          score: {type: Number, default: 55}
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
  });

  it('path is cast to correct value when retreived from db', function(done) {
    const schema = new Schema({title: {type: 'string', index: true}});
    const T = db.model('T', schema);
    T.collection.insertOne({title: 234}, {safe: true}, function(err) {
      assert.ifError(err);
      T.findOne(function(err, doc) {
        assert.ifError(err);
        assert.equal(doc.title, '234');
        done();
      });
    });
  });

  it('setting a path to undefined should retain the value as undefined', function(done) {
    const B = db.model('BlogPost', collection + random());

    const doc = new B;
    doc.title = 'css3';
    assert.equal(doc.$__delta()[1].$set.title, 'css3');
    doc.title = undefined;
    assert.equal(doc.$__delta()[1].$unset.title, 1);
    assert.strictEqual(undefined, doc.$__delta()[1].$set.title);

    doc.title = 'css3';
    doc.author = 'aaron';
    doc.numbers = [3, 4, 5];
    doc.meta.date = new Date;
    doc.meta.visitors = 89;
    doc.comments = [{title: 'thanksgiving', body: 'yuuuumm'}];
    doc.comments.push({title: 'turkey', body: 'cranberries'});

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
              B.collection.findOne({_id: b._id}, function(err, b) {
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
      const M = db.model('758', new Schema({s: String, n: Number, a: Array}));
      M.collection.insertOne({}, {safe: true}, function(err) {
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
    const schA = new Schema({title: String});
    const schma = new Schema({
      thing: {type: Schema.Types.ObjectId, ref: 'A'},
      subdoc: {
        some: String,
        thing: [{type: Schema.Types.ObjectId, ref: 'A'}]
      }
    });

    const M1 = db.model('A', schA);
    const M2 = db.model('A2', schma);
    const a = new M1({title: 'hihihih'}).toObject();
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

    const Order = db.model('order' + random(), OrderSchema);
    const o = new Order({total: null});

    assert.deepEqual(calls, [0, null]);
    assert.equal(o.total, 10);
    done();
  });

  describe('Skip setting default value for Geospatial-indexed fields (gh-1668)', function() {
    let db;

    before(function() {
      db = start({ noErrorListener: true });
    });

    after(function(done) {
      db.close(done);
    });

    it('2dsphere indexed field with value is saved', function() {
      const PersonSchema = new Schema({
        name: String,
        loc: {
          type: [Number],
          index: '2dsphere'
        }
      });

      const Person = db.model('Person_1', PersonSchema);
      const loc = [0.3, 51.4];
      const p = new Person({
        name: 'Jimmy Page',
        loc: loc
      });

      return co(function*() {
        yield Person.init();

        yield p.save();

        const personDoc = yield Person.findById(p._id);

        assert.equal(personDoc.loc[0], loc[0]);
        assert.equal(personDoc.loc[1], loc[1]);
      });
    });

    it('2dsphere indexed field without value is saved (gh-1668)', function() {
      const PersonSchema = new Schema({
        name: String,
        loc: {
          type: [Number],
          index: '2dsphere'
        }
      });

      const Person = db.model('Person_2', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page'
      });

      return co(function*() {
        yield Person.init();

        yield p.save();

        const personDoc = yield Person.findById(p._id);

        assert.equal(personDoc.name, 'Jimmy Page');
        assert.equal(personDoc.loc, undefined);
      });
    });

    it('2dsphere indexed field in subdoc without value is saved', function() {
      const PersonSchema = new Schema({
        name: {type: String, required: true},
        nested: {
          tag: String,
          loc: {
            type: [Number]
          }
        }
      });

      PersonSchema.index({'nested.loc': '2dsphere'});

      const Person = db.model('Person_3', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page'
      });

      p.nested.tag = 'guitarist';

      return co(function*() {
        yield Person.init();

        yield p.save();

        const personDoc = yield Person.findById(p._id);

        assert.equal(personDoc.name, 'Jimmy Page');
        assert.equal(personDoc.nested.tag, 'guitarist');
        assert.equal(personDoc.nested.loc, undefined);
      });
    });

    it('2dsphere indexed field with geojson without value is saved (gh-3233)', function() {
      const LocationSchema = new Schema({
        name: { type: String, required: true },
        location: {
          type: { type: String, enum: ['Point'] },
          coordinates: [Number]
        }
      });

      LocationSchema.index({ 'location': '2dsphere' });

      const Location = db.model('gh3233', LocationSchema);

      return co(function*() {
        yield Location.init();

        yield Location.create({
          name: 'Undefined location'
        });
      });
    });

    it('Doc with 2dsphere indexed field without initial value can be updated', function() {
      const PersonSchema = new Schema({
        name: String,
        loc: {
          type: [Number],
          index: '2dsphere'
        }
      });

      const Person = db.model('Person_4', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page'
      });

      return co(function*() {
        yield Person.init();

        yield p.save();

        const updates = {
          $set: {
            loc: [0.3, 51.4]
          }
        };

        const personDoc = yield Person.findByIdAndUpdate(p._id, updates, {new: true});

        assert.equal(personDoc.loc[0], updates.$set.loc[0]);
        assert.equal(personDoc.loc[1], updates.$set.loc[1]);
      });
    });

    it('2dsphere indexed required field without value is rejected', function() {
      const PersonSchema = new Schema({
        name: String,
        loc: {
          type: [Number],
          required: true,
          index: '2dsphere'
        }
      });

      const Person = db.model('Person_5', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page'
      });

      return co(function*() {
        yield Person.init();

        let err;
        yield p.save().catch(_err => { err = _err; });

        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);
      });
    });

    it('2dsphere field without value but with schema default is saved', function() {
      const loc = [0, 1];
      const PersonSchema = new Schema({
        name: String,
        loc: {
          type: [Number],
          default: loc,
          index: '2dsphere'
        }
      });

      const Person = db.model('Person_6', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page'
      });

      return co(function*() {
        yield Person.init();

        yield p.save();

        const personDoc = yield Person.findById(p._id);

        assert.equal(loc[0], personDoc.loc[0]);
        assert.equal(loc[1], personDoc.loc[1]);
      });
    });

    it('2d indexed field without value is saved', function() {
      const PersonSchema = new Schema({
        name: String,
        loc: {
          type: [Number],
          index: '2d'
        }
      });

      const Person = db.model('Person_7', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page'
      });

      return co(function*() {
        yield Person.init();

        yield p.save();

        const personDoc = yield Person.findById(p._id);

        assert.equal(personDoc.loc, undefined);
      });
    });

    it('Compound index with 2dsphere field without value is saved', function() {
      const PersonSchema = new Schema({
        name: String,
        type: String,
        slug: {type: String, index: {unique: true}},
        loc: {type: [Number]},
        tags: {type: [String], index: true}
      });

      PersonSchema.index({name: 1, loc: '2dsphere'});

      const Person = db.model('Person_8', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page',
        type: 'musician',
        slug: 'ledzep-1',
        tags: ['guitarist']
      });

      return co(function*() {
        yield Person.init();

        yield p.save();

        const personDoc = yield Person.findById(p._id);

        assert.equal(personDoc.name, 'Jimmy Page');
        assert.equal(personDoc.loc, undefined);
      });
    });

    it('Compound index on field earlier declared with 2dsphere index is saved', function() {
      const PersonSchema = new Schema({
        name: String,
        type: String,
        slug: {type: String, index: {unique: true}},
        loc: {type: [Number]},
        tags: {type: [String], index: true}
      });

      PersonSchema.index({loc: '2dsphere'});
      PersonSchema.index({name: 1, loc: -1});

      const Person = db.model('Person_9', PersonSchema);
      const p = new Person({
        name: 'Jimmy Page',
        type: 'musician',
        slug: 'ledzep-1',
        tags: ['guitarist']
      });

      return co(function*() {
        yield Person.init();

        yield p.save();

        const personDoc = yield Person.findById(p._id);

        assert.equal(personDoc.name, 'Jimmy Page');
        assert.equal(personDoc.loc, undefined);
      });
    });
  });

  it('save max bson size error with buffering (gh-3906)', function(done) {
    this.timeout(10000);
    const db = start({ noErrorListener: true });
    const Test = db.model('gh3906_0', { name: Object });

    const test = new Test({
      name: {
        data: (new Array(16 * 1024 * 1024)).join('x')
      }
    });

    test.save(function(error) {
      assert.ok(error);
      assert.equal(error.name, 'MongoError');
      db.close(done);
    });
  });

  it('reports max bson size error in save (gh-3906)', function(done) {
    this.timeout(10000);
    const db = start({ noErrorListener: true });
    const Test = db.model('gh3906', { name: Object });

    const test = new Test({
      name: {
        data: (new Array(16 * 1024 * 1024)).join('x')
      }
    });

    db.on('connected', function() {
      test.save(function(error) {
        assert.ok(error);
        assert.equal(error.name, 'MongoError');
        db.close(done);
      });
    });
  });

  describe('bug fixes', function() {
    let db;

    before(function() {
      db = start({ noErrorListener: true });
    });

    after(function(done) {
      db.close(done);
    });

    it('doesnt crash (gh-1920)', function(done) {
      const parentSchema = new Schema({
        children: [new Schema({
          name: String
        })]
      });

      const Parent = db.model('gh-1920', parentSchema);

      const parent = new Parent();
      parent.children.push({name: 'child name'});
      parent.save(function(err, it) {
        assert.ifError(err);
        parent.children.push({name: 'another child'});
        Parent.findByIdAndUpdate(it._id, {$set: {children: parent.children}}, function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    it('doesnt reset "modified" status for fields', function(done) {
      const UniqueSchema = new Schema({
        changer: String,
        unique: {
          type: Number,
          unique: true
        }
      });

      const Unique = db.model('Unique', UniqueSchema);

      const u1 = new Unique({
        changer: 'a',
        unique: 5
      });

      const u2 = new Unique({
        changer: 'a',
        unique: 6
      });

      Unique.on('index', function() {
        u1.save(function(err) {
          assert.ifError(err);
          assert.ok(!u1.isModified('changer'));
          u2.save(function(err) {
            assert.ifError(err);
            assert.ok(!u2.isModified('changer'));
            u2.changer = 'b';
            u2.unique = 5;
            assert.ok(u2.isModified('changer'));
            u2.save(function(err) {
              assert.ok(err);
              assert.ok(u2.isModified('changer'));
              done();
            });
          });
        });
      });
    });

    it('insertMany() (gh-723)', function(done) {
      const schema = new Schema({
        name: String
      }, { timestamps: true });
      const Movie = db.model('gh723', schema);

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

    it('insertMany() ordered option for constraint errors (gh-3893)', function(done) {
      start.mongodVersion(function(err, version) {
        if (err) {
          done(err);
          return;
        }
        const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
        if (!mongo34) {
          done();
          return;
        }

        test();
      });

      function test() {
        const schema = new Schema({
          name: { type: String, unique: true }
        });
        const Movie = db.model('gh3893', schema);

        const arr = [
          { name: 'Star Wars' },
          { name: 'Star Wars' },
          { name: 'The Empire Strikes Back' }
        ];
        Movie.on('index', function(error) {
          assert.ifError(error);
          Movie.insertMany(arr, { ordered: false }, function(error) {
            assert.equal(error.message.indexOf('E11000'), 0);
            Movie.find({}).sort({ name: 1 }).exec(function(error, docs) {
              assert.ifError(error);
              assert.equal(docs.length, 2);
              assert.equal(docs[0].name, 'Star Wars');
              assert.equal(docs[1].name, 'The Empire Strikes Back');
              done();
            });
          });
        });
      }
    });

    it('insertMany() ordered option for validation errors (gh-5068)', function(done) {
      start.mongodVersion(function(err, version) {
        if (err) {
          done(err);
          return;
        }
        const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
        if (!mongo34) {
          done();
          return;
        }

        test();
      });

      function test() {
        const schema = new Schema({
          name: { type: String, required: true }
        });
        const Movie = db.model('gh5068', schema);

        const arr = [
          { name: 'Star Wars' },
          { foo: 'Star Wars' },
          { name: 'The Empire Strikes Back' }
        ];
        Movie.insertMany(arr, { ordered: false }, function(error) {
          assert.ifError(error);
          Movie.find({}).sort({ name: 1 }).exec(function(error, docs) {
            assert.ifError(error);
            assert.equal(docs.length, 2);
            assert.equal(docs[0].name, 'Star Wars');
            assert.equal(docs[1].name, 'The Empire Strikes Back');
            done();
          });
        });
      }
    });

    it('insertMany() ordered option for single validation error', function(done) {
      start.mongodVersion(function(err, version) {
        if (err) {
          done(err);
          return;
        }
        const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
        if (!mongo34) {
          done();
          return;
        }

        test();
      });

      function test() {
        const schema = new Schema({
          name: { type: String, required: true }
        });
        const Movie = db.model('gh5068-2', schema);

        const arr = [
          { foo: 'Star Wars' },
          { foo: 'The Fast and the Furious' }
        ];
        Movie.insertMany(arr, { ordered: false }, function(error) {
          assert.ifError(error);
          Movie.find({}).sort({ name: 1 }).exec(function(error, docs) {
            assert.equal(docs.length, 0);
            done();
          });
        });
      }
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
      const Movie = db.model('gh3846', schema);

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

    it('insertMany() with timestamps (gh-723)', function() {
      const schema = new Schema({ name: String }, { timestamps: true });
      const Movie = db.model('gh723_0', schema);
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

    it('returns empty array if no documents (gh-8130)', function() {
      const Movie = db.model('gh8130', Schema({ name: String }));
      return Movie.insertMany([]).then(docs => assert.deepEqual(docs, []));
    });

    it('insertMany() multi validation error with ordered false (gh-5337)', function(done) {
      const schema = new Schema({
        name: { type: String, required: true }
      });
      const Movie = db.model('gh5337', schema);

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

      const Person = db.model('gh4590', personSchema);
      const Movie = db.model('gh4590_0', movieSchema);

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
      const Movie = db.model('gh4237', schema);

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

    it('insertMany() with error handlers (gh-6228)', function() {
      const schema = new Schema({
        name: { type: String, unique: true }
      });

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

      const Movie = db.model('gh6228', schema);

      return co(function*() {
        yield Movie.init();

        let threw = false;
        try {
          yield Movie.insertMany([
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
      });
    });

    it('insertMany() return docs with empty modifiedPaths (gh-7852)', function() {
      const schema = new Schema({
        name: { type: String }
      });

      const Food = db.model('gh7852', schema);

      return co(function*() {
        const foods = yield Food.insertMany([
          { name: 'Rice dumplings' },
          { name: 'Beef noodle' }
        ]);
        assert.equal(foods[0].modifiedPaths().length, 0);
        assert.equal(foods[1].modifiedPaths().length, 0);
      });
    });

    it('deleteOne() with options (gh-7857)', function(done) {
      const schema = new Schema({
        name: String
      });
      const Character = db.model('gh7857', schema);

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
      const Character = db.model('gh6805', schema);

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
            if (this.title === 'Passenger') {
              return [
                { name: 'Jennifer Lawrence', character: 'Aurora Lane' },
                { name: 'Chris Pratt', character: 'Jim Preston' }
              ];
            }
            return [];
          }
        }
      });

      const Movie = db.model('gh6840', schema);
      const movie = new Movie({ title: 'Passenger'});
      assert.equal(movie.actors.length, 2);
    });

    describe('3.6 features', function() {
      before(function(done) {
        start.mongodVersion((err, version) => {
          if (err) {
            done(err);
            return;
          }
          const mongo36 = version[0] > 3 || (version[0] === 3 && version[1] >= 6);
          if (!mongo36) {
            this.skip();
          }

          done();
        });
      });

      it('arrayFilter (gh-5965)', function() {
        return co(function*() {
          const MyModel = db.model('gh5965', new Schema({
            _id: Number,
            grades: [Number]
          }));

          yield MyModel.create([
            { _id: 1, grades: [95, 92, 90] },
            { _id: 2, grades: [98, 100, 102] },
            { _id: 3, grades: [95, 110, 100] }
          ]);

          yield MyModel.updateMany({}, { $set: { 'grades.$[element]': 100 } }, {
            arrayFilters: [ { element: { $gte: 100 } } ]
          });

          const docs = yield MyModel.find().sort({ _id: 1 });
          assert.deepEqual(docs[0].toObject().grades, [95, 92, 90]);
          assert.deepEqual(docs[1].toObject().grades, [98, 100, 100]);
          assert.deepEqual(docs[2].toObject().grades, [95, 100, 100]);
        });
      });

      it('arrayFilter casting (gh-5965) (gh-7079)', function() {
        return co(function*() {
          const MyModel = db.model('gh7079', new Schema({
            _id: Number,
            grades: [Number]
          }));

          yield MyModel.create([
            { _id: 1, grades: [95, 92, 90] },
            { _id: 2, grades: [98, 100, 102] },
            { _id: 3, grades: [95, 110, 100] }
          ]);

          yield MyModel.updateMany({}, { $set: { 'grades.$[element]': 100 } }, {
            arrayFilters: [{
              element: { $gte: '100', $lte: { valueOf: () => 109 } }
            }]
          });

          const docs = yield MyModel.find().sort({ _id: 1 });
          assert.deepEqual(docs[0].toObject().grades, [95, 92, 90]);
          assert.deepEqual(docs[1].toObject().grades, [98, 100, 100]);
          assert.deepEqual(docs[2].toObject().grades, [95, 110, 100]);
        });
      });

      describe('watch()', function() {
        before(function() {
          if (!process.env.REPLICA_SET) {
            this.skip();
          }
        });

        it('watch() (gh-5964)', function() {
          return co(function*() {
            const MyModel = db.model('gh5964', new Schema({ name: String }));

            const doc = yield MyModel.create({ name: 'Ned Stark' });

            const changed = new global.Promise(resolve => {
              MyModel.watch().once('change', data => resolve(data));
            });

            yield doc.remove();

            const changeData = yield changed;
            assert.equal(changeData.operationType, 'delete');
            assert.equal(changeData.documentKey._id.toHexString(),
              doc._id.toHexString());
          });
        });

        it('watch() before connecting (gh-5964)', function() {
          return co(function*() {
            const db = start();

            const MyModel = db.model('gh5964', new Schema({ name: String }));

            // Synchronous, before connection happens
            const changeStream = MyModel.watch();
            const changed = new global.Promise(resolve => {
              changeStream.once('change', data => resolve(data));
            });

            yield db;
            yield MyModel.create({ name: 'Ned Stark' });

            const changeData = yield changed;
            assert.equal(changeData.operationType, 'insert');
            assert.equal(changeData.fullDocument.name, 'Ned Stark');
          });
        });

        it('watch() close() prevents buffered watch op from running (gh-7022)', function() {
          return co(function*() {
            const db = start();
            const MyModel = db.model('gh7022', new Schema({}));
            const changeStream = MyModel.watch();
            const ready = new global.Promise(resolve => {
              changeStream.once('ready', () => {
                resolve(true);
              });
              setTimeout(resolve, 500, false);
            });

            changeStream.close();
            yield db;
            const readyCalled = yield ready;
            assert.strictEqual(readyCalled, false);
          });
        });

        it('watch() close() closes the stream (gh-7022)', function() {
          return co(function*() {
            const db = yield start();
            const MyModel = db.model('gh7022', new Schema({ name: String }));

            yield MyModel.createCollection();

            const changeStream = MyModel.watch();
            const closed = new global.Promise(resolve => {
              changeStream.once('close', () => resolve(true));
            });

            yield MyModel.create({ name: 'Hodor' });

            changeStream.close();
            const closedData = yield closed;
            assert.strictEqual(closedData, true);
          });
        });
      });

      describe('sessions (gh-6362)', function() {
        let MyModel;
        const delay = ms => done => setTimeout(done, ms);

        before(function(done) {
          const nestedSchema = new Schema({ foo: String });
          MyModel = db.model('gh6362', new Schema({
            name: String,
            nested: nestedSchema,
            arr: [nestedSchema]
          }));

          start.mongodVersion((err, version) => {
            if (err) {
              done(err);
              return;
            }
            const mongo36 = version[0] > 3 || (version[0] === 3 && version[1] >= 6);
            if (!mongo36) {
              this.skip();
            }

            done();
          });
        });

        it('startSession()', function() {
          return co(function*() {
            const session = yield MyModel.startSession({ causalConsistency: true });

            assert.equal(session.supports.causalConsistency, true);

            session.endSession();
          });
        });

        it('startSession() before connecting', function() {
          return co(function*() {
            const db = start();

            const MyModel = db.model('gh6362_2', new Schema({ name: String }));

            // Don't wait for promise
            const sessionPromise = MyModel.startSession({ causalConsistency: true });

            yield db;

            const session = yield sessionPromise;

            assert.equal(session.supports.causalConsistency, true);

            session.endSession();
          });
        });

        it('sets session when pulling a document from db', function() {
          return co(function*() {
            let doc = yield MyModel.create({ name: 'test', nested: { foo: 'bar' } });

            const session = yield MyModel.startSession();

            let lastUse = session.serverSession.lastUse;

            yield delay(1);

            doc = yield MyModel.findOne({ _id: doc._id }, null, { session });
            assert.strictEqual(doc.$__.session, session);
            assert.strictEqual(doc.$session(), session);
            assert.strictEqual(doc.nested.$session(), session);

            assert.ok(session.serverSession.lastUse > lastUse);
            lastUse = session.serverSession.lastUse;

            yield delay(1);

            doc = yield MyModel.findOneAndUpdate({}, { name: 'test2' },
              { session: session });
            assert.strictEqual(doc.$__.session, session);
            assert.strictEqual(doc.$session(), session);
            assert.strictEqual(doc.nested.$session(), session);

            assert.ok(session.serverSession.lastUse > lastUse);
            lastUse = session.serverSession.lastUse;

            yield delay(1);

            doc.name = 'test3';

            yield doc.save();

            assert.ok(session.serverSession.lastUse > lastUse);

            session.endSession();
          });
        });

        it('sets session on child doc when creating new doc (gh-7104)', function() {
          return co(function*() {
            let doc = yield MyModel.create({ name: 'test', arr: [{ foo: 'bar' }] });

            const session = yield MyModel.startSession();

            const lastUse = session.serverSession.lastUse;

            yield delay(1);

            doc = yield MyModel.findOne({ _id: doc._id }, null, { session });
            assert.strictEqual(doc.$__.session, session);
            assert.strictEqual(doc.$session(), session);
            assert.strictEqual(doc.arr[0].$session(), session);

            assert.ok(session.serverSession.lastUse > lastUse);

            doc.arr.push({ foo: 'baz' });

            assert.strictEqual(doc.arr[0].$session(), session);
            assert.strictEqual(doc.arr[1].$session(), session);

            doc.nested = { foo: 'foo' };
            assert.strictEqual(doc.nested.$session(), session);

            yield doc.save();

            assert.strictEqual(doc.arr[0].$session(), session);
            assert.strictEqual(doc.arr[1].$session(), session);

            doc.$session(null);

            assert.equal(doc.arr[0].$session(), null);
            assert.equal(doc.arr[1].$session(), null);
          });
        });

        it('sets session when pulling multiple docs from db', function() {
          return co(function*() {
            const doc = yield MyModel.create({ name: 'test' });

            const session = yield MyModel.startSession();

            let lastUse = session.serverSession.lastUse;

            yield delay(1);

            const docs = yield MyModel.find({ _id: doc._id }, null,
              { session: session });
            assert.equal(docs.length, 1);
            assert.strictEqual(docs[0].$__.session, session);
            assert.strictEqual(docs[0].$session(), session);

            assert.ok(session.serverSession.lastUse > lastUse);
            lastUse = session.serverSession.lastUse;

            yield delay(1);

            docs[0].name = 'test3';

            yield docs[0].save();

            assert.ok(session.serverSession.lastUse > lastUse);

            session.endSession();
          });
        });

        it('supports overwriting `session` in save()', function() {
          return co(function*() {
            let doc = yield MyModel.create({ name: 'test' });

            const session = yield MyModel.startSession();

            let lastUse = session.serverSession.lastUse;

            yield delay(1);

            doc = yield MyModel.findOne({ _id: doc._id }, null, { session });

            assert.ok(session.serverSession.lastUse > lastUse);
            lastUse = session.serverSession.lastUse;

            yield delay(1);

            doc.name = 'test3';

            yield doc.save({ session: null });

            assert.ok(session.serverSession.lastUse <= lastUse);

            session.endSession();
          });
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
        db.model('gh4475', testSchema);
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
      const Movie = db.model('gh3222', schema);

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
      const Test = db.model('gh4449_0', testSchema);

      const t = new Test();
      Test.create(t, function(error, t2) {
        assert.ifError(error);
        assert.ok(t === t2);
        done();
      });
    });

    it('emits errors correctly from exec (gh-4500)', function(done) {
      const someModel = db.model('gh4500', new Schema({}));

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

      const Parent = db.model('gh5548', ParentSchema);

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

        const M = db.model('gh3998', schema);

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

        const M = db.model('gh5708', schema);

        const ops = [
          {
            updateOne: {
              filter: { num: 0 },
              update: {
                $inc: { num: 1 }
              },
              upsert: true,
              setDefaultsOnInsert: true
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

      it('timestamps (gh-5708)', function() {
        const schema = new Schema({
          str: { type: String, default: 'test' },
          num: Number
        }, { timestamps: true });

        const M = db.model('gh5708_ts', schema);

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

        return co(function*() {
          yield M.bulkWrite(ops);

          let doc = yield M.findOne({ num: 42 });
          assert.ok(doc.createdAt);
          assert.ok(doc.createdAt.valueOf() >= now.valueOf());
          assert.ok(doc.updatedAt);
          assert.ok(doc.updatedAt.valueOf() >= now.valueOf());

          doc = yield M.findOne({ num: 1 });
          assert.ok(doc.createdAt);
          assert.ok(doc.createdAt.valueOf() >= now.valueOf());
          assert.ok(doc.updatedAt);
          assert.ok(doc.updatedAt.valueOf() >= now.valueOf());
        });
      });

      it('with child timestamps and array filters (gh-7032)', function() {
        const childSchema = new Schema({ name: String }, { timestamps: true });

        const parentSchema = new Schema({ children: [childSchema] }, {
          timestamps: true
        });

        const Parent = db.model('gh7032_Parent', parentSchema);

        return co(function*() {
          yield Parent.create({ children: [{ name: 'foo' }] });

          const end = Date.now();
          yield new Promise(resolve => setTimeout(resolve, 100));

          yield Parent.bulkWrite([
            {
              updateOne: {
                filter: {},
                update: { $set: { 'children.$[].name': 'bar' } },
              }
            }
          ]);

          const doc = yield Parent.findOne();
          assert.ok(doc.children[0].updatedAt.valueOf() > end);
        });
      });

      it('with timestamps and replaceOne (gh-5708)', function() {
        const schema = new Schema({ num: Number }, { timestamps: true });

        const M = db.model('gh5708_ts2', schema);

        return co(function*() {
          yield M.create({ num: 42 });

          yield cb => setTimeout(cb, 10);
          const now = Date.now();

          yield M.bulkWrite([{
            replaceOne: {
              filter: { num: 42 },
              replacement: { num: 100 }
            }
          }]);

          const doc = yield M.findOne({ num: 100 });
          assert.ok(doc.createdAt);
          assert.ok(doc.createdAt.valueOf() >= now.valueOf());
          assert.ok(doc.updatedAt);
          assert.ok(doc.updatedAt.valueOf() >= now.valueOf());
        });
      });

      it('with child timestamps (gh-7032)', function() {
        const nested = new Schema({ name: String }, { timestamps: true });
        const schema = new Schema({ nested: [nested] }, { timestamps: true });

        const M = db.model('gh7032', schema);

        return co(function*() {
          yield M.create({ nested: [] });

          yield cb => setTimeout(cb, 10);
          const now = Date.now();

          yield M.bulkWrite([{
            updateOne: {
              filter: {},
              update: { $push: { nested: { name: 'test' } } }
            }
          }]);

          const doc = yield M.findOne({});
          assert.ok(doc.nested[0].createdAt);
          assert.ok(doc.nested[0].createdAt.valueOf() >= now.valueOf());
          assert.ok(doc.nested[0].updatedAt);
          assert.ok(doc.nested[0].updatedAt.valueOf() >= now.valueOf());
        });
      });

      it('with single nested and setOnInsert (gh-7534)', function() {
        const nested = new Schema({ name: String });
        const schema = new Schema({ nested: nested });

        const Model = db.model('gh7534', schema);

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

      it('throws an error if no update object is provided (gh-8331)', function() {
        const userSchema = new Schema({ name: { type: String, required: true } });
        const User = db.model('gh8331', userSchema);

        return co(function*() {
          const createdUser = yield User.create({ name: 'Hafez' });
          let threw = false;
          try {
            yield User.bulkWrite([{
              updateOne: {
                filter: { _id: createdUser._id }
              }
            }]);
          }
          catch (err) {
            threw = true;
            assert.equal(err.message, 'Must provide an update object.');
          }
          finally {
            assert.equal(threw, true);

            const userAfterUpdate = yield User.findOne({ _id: createdUser._id });

            assert.equal(userAfterUpdate.name, 'Hafez', 'Document data is not wiped if no update object is provided.');
          }
        });
      });
    });

    it('insertMany with Decimal (gh-5190)', function(done) {
      start.mongodVersion(function(err, version) {
        if (err) {
          done(err);
          return;
        }
        const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
        if (!mongo34) {
          done();
          return;
        }

        test();
      });

      function test() {
        const schema = new mongoose.Schema({
          amount : mongoose.Schema.Types.Decimal
        });
        const Money = db.model('gh5190', schema);

        Money.insertMany([{ amount : '123.45' }], function(error) {
          assert.ifError(error);
          done();
        });
      }
    });

    it('remove with cast error (gh-5323)', function(done) {
      const schema = new mongoose.Schema({
        name: String
      });

      const Model = db.model('gh5323', schema);
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

      const Model = db.model('gh2037', schema);

      Model.create(1, function(error) {
        assert.ok(error);
        assert.equal(error.name, 'ObjectParameterError');
        done();
      });
    });

    it('save() with unacknowledged writes (gh-6012)', function() {
      const schema = new mongoose.Schema({ name: String }, { safe: false });

      const Model = db.model('gh6012', schema);

      return Model.create({});
    });

    it('save() with unacknowledged writes in options (gh-6012)', function() {
      const schema = new mongoose.Schema({ name: String });

      const Model = db.model('gh6012_1', schema);
      const doc = new Model();

      return doc.save({ safe: { w: 0 } });
    });

    it('save() with acknowledged writes fail if topology is not replica set (gh-6862)', function(done) {
      // If w > 1 and there is no replica sets, mongodb will throw BadValue error
      // This test uses this to check if option `w` is correctly propagated to mongodb

      // skip this test if the server is a replica set
      if (db.client.topology.constructor.name === 'ReplSet') {
        return this.skip();
      }

      const schemaA = new Schema({
        name: String
      }, { writeConcern: { w: 2 }});
      const schemaB = new Schema({
        name: String
      });

      const UserA = db.model('gh6862_1', schemaA);
      const UserB = db.model('gh6862_2', schemaB);

      const userA = new UserA();
      const userB = new UserB();
      userA.save(function(error) {
        assert.ok(error);
        assert.equal(error.name, 'MongoError');
        assert.equal(error.codeName, 'BadValue');

        userB.save({ w: 2 },function(error) {
          assert.ok(error);
          assert.equal(error.name, 'MongoError');
          assert.equal(error.codeName, 'BadValue');
          done();
        });
      });
    });

    it.skip('save() with wtimeout defined in schema (gh-6862)', function(done) {
      // If you want to test this, setup replica set with 1 primary up and 1 secondary down
      this.timeout(process.env.TRAVIS ? 9000 : 5500);
      const schema = new Schema({
        name: String
      }, {
        writeConcern: {
          w: 2,
          wtimeout: 1000
        }
      });
      const User = db.model('gh6862_3', schema);
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
      this.timeout(process.env.TRAVIS ? 9000 : 5500);
      const schema = new Schema({
        name: String
      });
      const User = db.model('gh6862_4', schema);
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

      const M = db.model('gh3998_0', schema);

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

      const M = db.model('gh3998_1', schema);

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

    it('alias with lean virtual (gh-6069)', function() {
      const schema = new mongoose.Schema({
        name: {
          type: String,
          alias: 'nameAlias'
        }
      });

      const Model = db.model('gh6069', schema);

      return co(function*() {
        const doc = yield Model.create({ name: 'Val' });

        const res = yield Model.findById(doc._id).lean();

        assert.equal(schema.virtual('nameAlias').getters[0].call(res), 'Val');
      });
    });

    it('marks array as modified when initializing non-array from db (gh-2442)', function(done) {
      const s1 = new Schema({
        array: mongoose.Schema.Types.Mixed
      }, {minimize: false});

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

      const M1 = db.model('gh-2442-1', s1, 'gh-2442');
      const M2 = db.model('gh-2442-2', s2, 'gh-2442');

      M1.create({array: {}}, function(err, doc) {
        assert.ifError(err);
        assert.ok(doc.array);
        M2.findOne({_id: doc._id}, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.array[0].value, 0);
          doc.array[0].value = 1;
          doc.save(function(err) {
            assert.ifError(err);
            M2.findOne({_id: doc._id}, function(err, doc) {
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

      const Test = db.model('gh6456', schema);

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

    it('listIndexes() (gh-6281)', function() {
      return co(function*() {
        const M = db.model('gh6281', new Schema({
          name: { type: String, index: true }
        }), 'gh6281_0');

        yield M.init();

        const indexes = yield M.listIndexes();
        assert.deepEqual(indexes.map(i => i.key), [
          { _id: 1 },
          { name: 1 }
        ]);
      });
    });

    it('syncIndexes() (gh-6281)', function() {
      return co(function*() {
        let M = db.model('gh6281', new Schema({
          name: { type: String, index: true }
        }, { autoIndex: false }), 'gh6281');

        let dropped = yield M.syncIndexes();
        assert.deepEqual(dropped, []);

        let indexes = yield M.listIndexes();
        assert.deepEqual(indexes.map(i => i.key), [
          { _id: 1 },
          { name: 1 }
        ]);

        // New model, same collection, index on different property
        M = db.model('gh6281_0', new Schema({
          otherName: { type: String, index: true }
        }, { autoIndex: false }), 'gh6281');

        dropped = yield M.syncIndexes();
        assert.deepEqual(dropped, ['name_1']);

        indexes = yield M.listIndexes();
        assert.deepEqual(indexes.map(i => i.key), [
          { _id: 1 },
          { otherName: 1 }
        ]);

        // New model, same collection, different options
        M = db.model('gh6281_1', new Schema({
          otherName: { type: String, unique: true }
        }, { autoIndex: false }), 'gh6281');

        dropped = yield M.syncIndexes();
        assert.deepEqual(dropped, ['otherName_1']);

        indexes = yield M.listIndexes();
        assert.deepEqual(indexes.map(i => i.key), [
          { _id: 1 },
          { otherName: 1 }
        ]);

        // Re-run syncIndexes(), shouldn't change anything
        dropped = yield M.syncIndexes();
        assert.deepEqual(dropped, []);
      });
    });

    it('syncIndexes() with different key order (gh-8135)', function() {
      return co(function*() {
        const opts = { autoIndex: false };
        let schema = new Schema({ name: String, age: Number }, opts);
        schema.index({ name: 1, age: -1 });
        let M = db.model('gh8135', schema, 'gh8135');

        let dropped = yield M.syncIndexes();
        assert.deepEqual(dropped, []);

        const indexes = yield M.listIndexes();
        assert.deepEqual(indexes.map(i => i.key), [
          { _id: 1 },
          { name: 1, age: -1 }
        ]);

        // New model, same collection, different key order
        schema = new Schema({ name: String, age: Number }, opts);
        schema.index({ age: -1, name: 1 });
        M = db.model('gh8135_0', schema, 'gh8135');

        dropped = yield M.syncIndexes();
        assert.deepEqual(dropped, ['name_1_age_-1']);
      });
    });

    it('using `new db.model()()` (gh-6698)', function(done) {
      db.model('gh6698', new Schema({
        name: String
      }));

      assert.throws(function() {
        new db.model('gh6698')({ name: 'test' });
      }, /should not be run with `new`/);

      done();
    });

    it('throws if non-function passed as callback (gh-6640)', function(done) {
      const Model = db.model('gh6640', new Schema({
        name: String
      }));

      const doc = new Model({});

      assert.throws(function() {
        doc.save({}, {});
      }, /callback must be a function/i);

      done();
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

      const Test = db.model('gh6456_2', schema);

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

    it('allows calling save in a post save hook (gh-6611)', function() {
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


      const Note = db.model('gh6611', noteSchema);
      return co(function*() {
        yield Note.create({ body: 'a note.' });
        const doc = yield Note.findOne({});
        assert.strictEqual(doc.body, 'a note, part deux.');
      });
    });
    it('createCollection() (gh-6711)', function() {
      const userSchema = new Schema({
        name: String
      });
      const rand = random();
      const model = db.model('gh6711_' + rand + '_User', userSchema);

      return co(function*() {
        yield model.createCollection();
        // If the collection is not created, the following will throw
        // MongoError: Collection [mongoose_test.create_xxx_users] not found.
        yield db.collection('gh6711_' + rand + '_users').stats();
      });
    });

    it('createCollection() respects schema collation (gh-6489)', function() {
      const userSchema = new Schema({
        name: String
      }, { collation: { locale: 'en_US', strength: 1 } });
      const Model = db.model('gh6489_User', userSchema, 'gh6489_User');

      return co(function*() {
        yield Model.createCollection();

        // If the collection is not created, the following will throw
        // MongoError: Collection [mongoose_test.create_xxx_users] not found.
        yield db.collection('gh6489_User').stats();

        yield Model.create([{ name: 'alpha' }, { name: 'Zeta' }]);

        // Ensure that the default collation is set. Mongoose will set the
        // collation on the query itself (see gh-4839).
        const res = yield db.collection('gh6489_User').
          find({}).sort({ name: 1 }).toArray();
        assert.deepEqual(res.map(v => v.name), ['alpha', 'Zeta']);
      });
    });
  });

  it('dropDatabase() after init allows re-init (gh-6967)', function() {
    const db = mongoose.createConnection(start.uri + '_6967');

    const Model = db.model('gh6640', new Schema({
      name: { type: String, index: true }
    }));

    return co(function*() {
      yield Model.init();

      yield db.dropDatabase();

      assert.ok(!Model.$init);

      let threw = false;

      try {
        yield Model.listIndexes();
      } catch (err) {
        assert.ok(err.message.indexOf('_6967') !== -1,
          err.message);
        threw = true;
      }
      assert.ok(threw);

      yield Model.init();

      const indexes = yield Model.listIndexes();

      assert.equal(indexes.length, 2);
      assert.deepEqual(indexes[1].key, { name: 1});
    });
  });

  it('replaceOne always sets version key in top-level (gh-7138)', function() {
    const key = 'A';

    const schema = new mongoose.Schema({
      key: String,
      items: { type: [String], default: [] }
    });

    const Record = db.model('gh7138', schema);

    const record = { key: key, items: ['A', 'B', 'C'] };

    return co(function*() {
      yield Record.replaceOne({ key: key }, record, { upsert: true });

      const fetchedRecord = yield Record.findOne({ key: key });

      assert.deepEqual(fetchedRecord.toObject().items, ['A', 'B', 'C']);
    });
  });

  it('can JSON.stringify(Model.schema) with nested (gh-7220)', function() {
    const nested = Schema({ name: String });
    const Model = mongoose.model('gh7220', Schema({ nested }));

    const _schema = JSON.parse(JSON.stringify(Model.schema));
    assert.ok(_schema.obj.nested);
  });

  it('Model.events() (gh-7125)', function() {
    const Model = db.model('gh7125', Schema({
      name: { type: String, validate: () => false }
    }));

    let called = [];
    Model.events.on('error', err => { called.push(err); });

    return co(function*() {
      yield Model.findOne({ _id: 'notanid' }).catch(() => {});
      assert.equal(called.length, 1);
      assert.equal(called[0].name, 'CastError');

      called = [];

      const doc = new Model({ name: 'fail' });
      yield doc.save().catch(() => {});
      assert.equal(called.length, 1);
      assert.equal(called[0].name, 'ValidationError');

      called = [];

      yield Model.aggregate([{ $group: { fail: true } }]).exec().catch(() => {});
      assert.equal(called.length, 1);
      assert.equal(called[0].name, 'MongoError');
    });
  });

  it('sets $session() before pre save hooks run (gh-7742)', function() {
    const schema = new Schema({ name: String });
    let sessions = [];
    schema.pre('save', function() {
      sessions.push(this.$session());
    });

    const SampleModel = db.model('gh7742', schema);

    return co(function*() {
      yield SampleModel.create({ name: 'foo' });
      // start session
      const session = yield db.startSession();

      // get doc
      const doc = yield SampleModel.findOne();
      doc.foo = 'bar';

      sessions = [];
      yield doc.save({ session });
      assert.equal(sessions.length, 1);
      assert.strictEqual(sessions[0], session);

      sessions = [];
      yield doc.save({ session: null });
      assert.equal(sessions.length, 1);
      assert.strictEqual(sessions[0], null);
    });
  });

  it('sets $session() before pre remove hooks run (gh-7742)', function() {
    const schema = new Schema({ name: String });
    let sessions = [];
    schema.pre('remove', function() {
      sessions.push(this.$session());
    });

    const SampleModel = db.model('gh7742_remove', schema);

    return co(function*() {
      yield SampleModel.create({ name: 'foo' });
      // start session
      const session = yield db.startSession();

      // get doc
      const doc = yield SampleModel.findOne();
      doc.foo = 'bar';

      sessions = [];
      yield doc.remove({ session });
      assert.equal(sessions.length, 1);
      assert.strictEqual(sessions[0], session);
    });
  });

  it('set $session() before pre validate hooks run on bulkWrite and insertMany (gh-7769)', function() {
    const schema = new Schema({ name: String });
    const sessions = [];
    schema.pre('validate', function() {
      sessions.push(this.$session());
    });

    const SampleModel = db.model('gh7769_validate', schema);

    return co(function*() {
      // start session
      const session = yield db.startSession();

      yield SampleModel.insertMany([{ name: 'foo' }, { name: 'bar' }], { session });
      assert.strictEqual(sessions[0], session);
      assert.strictEqual(sessions[1], session);

      yield SampleModel.bulkWrite([{
        insertOne: {
          doc: { name: 'Samwell Tarly' }
        },
      }, {
        replaceOne: {
          filter: { name: 'bar' },
          replacement: { name: 'Gilly' }
        }
      }], { session });

      assert.strictEqual(sessions[2], session);
      assert.strictEqual(sessions[3], session);
    });
  });

  it('custom statics that overwrite query functions dont get hooks by default (gh-7790)', function() {
    return co(function*() {
      const schema = new Schema({ name: String, loadedAt: Date });

      schema.statics.findOne = function() {
        return this.findOneAndUpdate({}, { loadedAt: new Date() }, { new: true });
      };

      let called = 0;
      schema.pre('findOne', function() {
        ++called;
      });
      const Model = db.model('gh7790', schema);

      yield Model.create({ name: 'foo' });

      const res = yield Model.findOne();
      assert.ok(res.loadedAt);
      assert.equal(called, 0);
    });
  });

  it('error handling middleware passes saved doc (gh-7832)', function() {
    const schema = new Schema({ _id: Number });

    const errs = [];
    const docs = [];
    schema.post('save', (err, doc, next) => {
      errs.push(err);
      docs.push(doc);
      next();
    });
    const Model = db.model('gh7832', schema);

    return co(function*() {
      yield Model.create({ _id: 1 });

      const doc = new Model({ _id: 1 });
      const err = yield doc.save().then(() => null, err => err);
      assert.ok(err);
      assert.equal(err.code, 11000);

      assert.equal(errs.length, 1);
      assert.equal(errs[0].code, 11000);

      assert.equal(docs.length, 1);
      assert.strictEqual(docs[0], doc);
    });
  });

  it('throws readable error if calling Model function with bad context (gh-7957)', function() {
    const Model = db.model('gh7957_new', Schema({ name: String }));

    assert.throws(() => {
      new Model.discriminator('gh5957_fail', Schema({ doesntMatter: String }));
    }, /Model\.discriminator.*new Model/);

    const discriminator = Model.discriminator;

    assert.throws(() => {
      discriminator('gh5957_fail', Schema({ doesntMatter: String }));
    }, /Model\.discriminator.*MyModel/);
  });

  describe('exists() (gh-6872)', function() {
    it('returns true if document exists', function() {
      const Model = db.model('gh6872_exists', new Schema({ name: String }));

      return Model.create({ name: 'foo' }).
        then(() => Model.exists({ name: 'foo' })).
        then(res => assert.strictEqual(res, true)).
        then(() => Model.exists({})).
        then(res => assert.strictEqual(res, true)).
        then(() => Model.exists()).
        then(res => assert.strictEqual(res, true));
    });

    it('returns false if no doc exists', function() {
      const Model = db.model('gh6872_false', new Schema({ name: String }));

      return Model.create({ name: 'foo' }).
        then(() => Model.exists({ name: 'bar' })).
        then(res => assert.strictEqual(res, false)).
        then(() => Model.exists({ otherProp: 'foo' })).
        then(res => assert.strictEqual(res, false));
    });

    it('options (gh-8075)', function() {
      const Model = db.model('gh8075', new Schema({ name: String }));

      return Model.exists({}).
        then(res => assert.ok(!res)).
        then(() => Model.exists({}, { explain: true })).
        then(res => assert.ok(res));
    });
  });
});
