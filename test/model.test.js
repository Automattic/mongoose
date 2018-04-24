'use strict';

/**
 * Test dependencies.
 */

const assert = require('power-assert');
const co = require('co');
const random = require('../lib/utils').random;
const start = require('./common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ValidatorError = mongoose.Error.ValidatorError;
const ValidationError = mongoose.Error.ValidationError;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;
const EmbeddedDocument = mongoose.Types.Embedded;
const MongooseError = mongoose.Error;

describe('Model', function() {
  var db;
  var Test;
  var Comments;
  var BlogPost;
  var bpSchema;
  var collection;

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

    mongoose.model('BlogPost', BlogPost);
    bpSchema = BlogPost;

    collection = 'blogposts_' + random();
  });

  before(function() {
    db = start();
    var testSchema = new Schema({
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
    var t = new Test({
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
      var B = mongoose.model('BlogPost');
      var b = B();
      assert.ok(b instanceof B);
      B = db.model('BlogPost');
      b = B();
      assert.ok(b instanceof B);
      done();
    });
    it('works "new" keyword', function(done) {
      var B = mongoose.model('BlogPost');
      var b = new B();
      assert.ok(b instanceof B);
      B = db.model('BlogPost');
      b = new B();
      assert.ok(b instanceof B);
      done();
    });
  });
  describe('isNew', function() {
    it('is true on instantiation', function(done) {
      var BlogPost = db.model('BlogPost', collection);
      var post = new BlogPost;
      assert.equal(post.isNew, true);
      done();
    });

    it('on parent and subdocs on failed inserts', function(done) {
      var schema = new Schema({
        name: {type: String, unique: true},
        em: [new Schema({x: Number})]
      }, {collection: 'testisnewonfail_' + random()});

      var A = db.model('isNewOnFail', schema);

      A.on('index', function() {
        var a = new A({name: 'i am new', em: [{x: 1}]});
        a.save(function(err) {
          assert.ifError(err);
          assert.equal(a.isNew, false);
          assert.equal(a.em[0].isNew, false);
          var b = new A({name: 'i am new', em: [{x: 2}]});
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
    var S = new Schema({
      field: [{text: String}]
    });

    var Model = db.model('gh-2140', S, 'gh-2140');
    var s = new Model();
    s.field = [null];
    s.field = [{text: 'text'}];

    assert.ok(s.field[0]);
    done();
  });

  describe('schema', function() {
    it('should exist', function(done) {
      var BlogPost = db.model('BlogPost', collection);

      assert.ok(BlogPost.schema instanceof Schema);
      assert.ok(BlogPost.prototype.schema instanceof Schema);
      done();
    });
    it('emits init event', function(done) {
      var schema = new Schema({name: String}),
          model;

      schema.on('init', function(model_) {
        model = model_;
      });

      var Named = db.model('EmitInitOnSchema', schema);
      assert.equal(model, Named);
      done();
    });
  });

  describe('structure', function() {
    it('default when instantiated', function(done) {
      var BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost;
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
          var DefaultArraySchema = new Schema({
            arr: {type: Array, cast: String, default: ['a', 'b', 'c']},
            single: {type: Array, cast: String, default: ['a']}
          });
          mongoose.model('DefaultArray', DefaultArraySchema);
          var DefaultArray = db.model('DefaultArray', collection);
          var arr = new DefaultArray;
          assert.equal(arr.get('arr').length, 3);
          assert.equal(arr.get('arr')[0], 'a');
          assert.equal(arr.get('arr')[1], 'b');
          assert.equal(arr.get('arr')[2], 'c');
          assert.equal(arr.get('single').length, 1);
          assert.equal(arr.get('single')[0], 'a');
          done();
        });

        it('empty', function(done) {
          var DefaultZeroCardArraySchema = new Schema({
            arr: {type: Array, cast: String, default: []},
            auto: [Number]
          });
          mongoose.model('DefaultZeroCardArray', DefaultZeroCardArraySchema);
          var DefaultZeroCardArray = db.model('DefaultZeroCardArray', collection);
          var arr = new DefaultZeroCardArray();
          assert.equal(arr.get('arr').length, 0);
          assert.equal(arr.arr.length, 0);
          assert.equal(arr.auto.length, 0);
          done();
        });
      });
    });

    it('a hash with one null value', function(done) {
      var BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost({
        title: null
      });
      assert.strictEqual(null, post.title);
      done();
    });

    it('when saved', function(done) {
      var BlogPost = db.model('BlogPost', collection),
          pending = 2;

      function cb() {
        if (--pending) {
          return;
        }
        done();
      }

      var post = new BlogPost();
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
        var BlogPost = db.model('BlogPost', collection);

        var post = new BlogPost();

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
        var BlogPost = db.model('BlogPost', collection);

        var post = new BlogPost;
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
        var BlogPost = db.model('BlogPost', collection);

        var post = new BlogPost({
          meta: {
            date: new Date,
            visitors: 5
          }
        });

        assert.equal(post.get('meta.visitors').valueOf(), 5);
        done();
      });

      it('isNew on embedded documents', function(done) {
        var BlogPost = db.model('BlogPost', collection);

        var post = new BlogPost();
        post.init({
          title: 'Test',
          slug: 'test',
          comments: [{title: 'Test', date: new Date, body: 'Test'}]
        });

        assert.equal(post.get('comments')[0].isNew, false);
        done();
      });

      it('isNew on embedded documents after saving', function(done) {
        var BlogPost = db.model('BlogPost', collection);

        var post = new BlogPost({title: 'hocus pocus'});
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
    var schema = new Schema({name: String}, {collection: 'users1'});
    var Named = mongoose.model('CollectionNamedInSchema1', schema);
    assert.equal(Named.prototype.collection.name, 'users1');

    var users2schema = new Schema({name: String}, {collection: 'users2'});
    var Named2 = db.model('CollectionNamedInSchema2', users2schema);
    assert.equal(Named2.prototype.collection.name, 'users2');
    done();
  });

  it('saving a model with a null value should perpetuate that null value to the db', function(done) {
    var BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost({
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
    var child_hook;
    var parent_hook;
    var childSchema = new Schema({
      name: String
    });

    childSchema.pre('save', function(next) {
      child_hook = this.name;
      next();
    });

    var parentSchema = new Schema({
      name: String,
      children: [childSchema]
    });

    parentSchema.pre('save', function(next) {
      parent_hook = this.name;
      next();
    });

    var Parent = db.model('doc', parentSchema);

    var parent = new Parent({
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
    var BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost({
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
    var schema = new Schema({
      nested: {
        num: Number
      }
    });

    var M = db.model('NestedObjectWithMongooseNumber', schema);
    var m = new M;
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
    var MySchema = new Schema({
      _id: {type: Number},
      name: String
    });

    var MyModel = db.model('MyModel', MySchema, 'numberrangeerror' + random());

    var instance = new MyModel({
      name: 'test',
      _id: 35
    });
    instance.save(function(err) {
      assert.ifError(err);

      MyModel.findById(35, function(err, doc) {
        assert.ifError(err);

        doc.remove(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });
  });

  it('over-writing a number should persist to the db (gh-342)', function(done) {
    var BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost({
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
      var BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost();
      assert.equal(post.cool(), post);
      done();
    });

    it('can be defined on embedded documents', function(done) {
      var ChildSchema = new Schema({name: String});
      ChildSchema.method('talk', function() {
        return 'gaga';
      });

      var ParentSchema = new Schema({
        children: [ChildSchema]
      });

      var ChildA = db.model('ChildA', ChildSchema, 'children_' + random());
      var ParentA = db.model('ParentA', ParentSchema, 'parents_' + random());

      var c = new ChildA;
      assert.equal(typeof c.talk, 'function');

      var p = new ParentA();
      p.children.push({});
      assert.equal(typeof p.children[0].talk, 'function');
      done();
    });

    it('can be defined with nested key', function(done) {
      var NestedKeySchema = new Schema({});
      NestedKeySchema.method('foo', {
        bar: function() {
          return this;
        }
      });
      var NestedKey = db.model('NestedKey', NestedKeySchema);
      var n = new NestedKey();
      assert.equal(n.foo.bar(), n);
      done();
    });
  });

  describe('statics', function() {
    it('can be defined', function(done) {
      var BlogPost = db.model('BlogPost', collection);

      assert.equal(BlogPost.woot(), BlogPost);
      done();
    });
  });

  describe('casting as validation errors', function() {
    it('error', function(done) {
      var BlogPost = db.model('BlogPost', collection),
          threw = false;

      var post;
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
      var BlogPost = db.model('BlogPost', collection),
          threw = false;

      var post = new BlogPost;

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
      var BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost({
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

      var db = start(),
          subs = new Schema({
            str: {
              type: String, validate: failingvalidator
            }
          }),
          BlogPost = db.model('BlogPost', {subs: [subs]});

      var post = new BlogPost();
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
      var BlogPost = db.model('BlogPost', collection),
          threw = false;

      var post = new BlogPost();

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
      var BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost();
      post.set('title', '1');

      var id = post.get('_id');

      post.save(function(err) {
        assert.ifError(err);

        BlogPost.update({title: 1, _id: id}, {title: 2}, function(err) {
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
      var BlogPost = db.model('BlogPost', collection),
          post = new BlogPost();

      post.get('numbers').push('3');
      assert.equal(post.get('numbers')[0], 3);
      done();
    });

    it('$push', function(done) {
      var BlogPost = db.model('BlogPost', collection),
          post = new BlogPost();

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
      var BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost();
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

      var S = new Schema({
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

      var M = db.model('gh502', S);

      var m = new M;
      m.save(function(err) {
        assert.ifError(err);
        M.findById(m._id, function(err, m) {
          assert.ifError(err);
          m.save(function(err) {
            assert.ifError(err);
            M.remove(function(err) {
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

      var TestValidation = db.model('TestValidation');

      var post = new TestValidation();
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

      var TestValidationMessage = db.model('TestValidationMessage');

      var post = new TestValidationMessage();
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
      var IntrospectionValidationSchema = new Schema({
        name: String
      });
      var IntrospectionValidation = db.model('IntrospectionValidation', IntrospectionValidationSchema, 'introspections_' + random());
      IntrospectionValidation.schema.path('name').validate(function(value) {
        return value.length < 2;
      }, 'Name cannot be greater than 1 character for path "{PATH}" with value `{VALUE}`');
      var doc = new IntrospectionValidation({name: 'hi'});
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

      var TestUndefinedValidation = db.model('TestUndefinedValidation');

      var post = new TestUndefinedValidation;

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
      var D = db.model('CallbackFiresOnceValidation', new Schema({
        username: {type: String, validate: /^[a-z]{6}$/i},
        email: {type: String, validate: /^[a-z]{6}$/i},
        password: {type: String, validate: /^[a-z]{6}$/i}
      }));

      var post = new D({
        username: 'nope',
        email: 'too',
        password: 'short'
      });

      var timesCalled = 0;

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

      var TestV = db.model('TestValidationOnResult');

      var post = new TestV;

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

      var TestP = db.model('TestPreviousNullValidation');

      TestP.collection.insert({a: null, previous: null}, {}, function(err, f) {
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

      var TestNestedValidation = db.model('TestNestedValidation');

      var post = new TestNestedValidation();
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
      var Subsubdocs = new Schema({required: {type: String, required: true}});

      var Subdocs = new Schema({
        required: {type: String, required: true},
        subs: [Subsubdocs]
      });

      mongoose.model('TestSubdocumentsValidation', new Schema({
        items: [Subdocs]
      }));

      var TestSubdocumentsValidation = db.model('TestSubdocumentsValidation');

      var post = new TestSubdocumentsValidation();

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

      var TestCallingValidation = db.model('TestCallingValidation');

      var post = new TestCallingValidation;

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

      var TestV = db.model('TestRequiredFalse');

      var post = new TestV;

      assert.equal(post.schema.path('result').isRequired, false);
      done();
    });

    describe('middleware', function() {
      it('works', function(done) {
        var ValidationMiddlewareSchema = null,
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
        var AsyncValidationMiddlewareSchema = null,
            Post = null,
            post = null;

        AsyncValidationMiddlewareSchema = new Schema({
          prop: {type: String}
        });

        AsyncValidationMiddlewareSchema.pre('validate', true, function(next, done) {
          var _this = this;
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
        var ComplexValidationMiddlewareSchema = null,
            Post = null,
            post = null,
            abc = function(v) {
              return v === 'abc';
            };

        ComplexValidationMiddlewareSchema = new Schema({
          baz: {type: String},
          abc: {type: String, validate: [abc, 'must be abc']},
          test: {type: String, validate: [/test/, 'must also be abc']},
          required: {type: String, required: true}
        });

        ComplexValidationMiddlewareSchema.pre('validate', true, function(next, done) {
          var _this = this;
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
      var now = Date.now();

      mongoose.model('TestDefaults', new Schema({
        date: {type: Date, default: now}
      }));

      var TestDefaults = db.model('TestDefaults');

      var post = new TestDefaults;
      assert.ok(post.get('date') instanceof Date);
      assert.equal(+post.get('date'), now);
      done();
    });

    it('nested', function(done) {
      var now = Date.now();

      mongoose.model('TestNestedDefaults', new Schema({
        nested: {
          date: {type: Date, default: now}
        }
      }));

      var TestDefaults = db.model('TestNestedDefaults');

      var post = new TestDefaults();
      assert.ok(post.get('nested.date') instanceof Date);
      assert.equal(+post.get('nested.date'), now);
      done();
    });

    it('subdocument', function(done) {
      var now = Date.now();

      var Items = new Schema({
        date: {type: Date, default: now}
      });

      mongoose.model('TestSubdocumentsDefaults', new Schema({
        items: [Items]
      }));

      var TestSubdocumentsDefaults = db.model('TestSubdocumentsDefaults');

      var post = new TestSubdocumentsDefaults();
      post.get('items').push({});
      assert.ok(post.get('items')[0].get('date') instanceof Date);
      assert.equal(+post.get('items')[0].get('date'), now);
      done();
    });

    it('allows nulls', function(done) {
      var T = db.model('NullDefault', new Schema({name: {type: String, default: null}}), collection);
      var t = new T();

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
      var BlogPost = db.model('BlogPost', collection),
          post = new BlogPost({
            title: 'Letters from Earth',
            author: 'Mark Twain'
          });

      assert.equal(post.get('titleWithAuthor'), 'Letters from Earth by Mark Twain');
      assert.equal(post.titleWithAuthor, 'Letters from Earth by Mark Twain');
      done();
    });

    it('set()', function(done) {
      var BlogPost = db.model('BlogPost', collection),
          post = new BlogPost();

      post.set('titleWithAuthor', 'Huckleberry Finn by Mark Twain');
      assert.equal(post.get('title'), 'Huckleberry Finn');
      assert.equal(post.get('author'), 'Mark Twain');
      done();
    });

    it('should not be saved to the db AZZ', function(done) {
      var BlogPost = db.model('BlogPost', collection),
          post = new BlogPost();

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
      var PersonSchema = new Schema({
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
          var split = fullName.split(' ');
          this.set('name.first', split[0]);
          this.set('name.last', split[1]);
        });

      mongoose.model('Person', PersonSchema);

      var Person = db.model('Person');
      var person = new Person({
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
      var collection = 'blogposts_' + random(),
          BlogPost = db.model('BlogPost', collection);

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
      var collection = 'blogposts_' + random(),
          BlogPost = db.model('BlogPost', collection);

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
      var collection = 'blogposts_' + random();
      var BlogPost = db.model('BlogPost', collection);
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
      var collection = 'blogposts_' + random(),
          BlogPost = db.model('BlogPost', collection);

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
    var B;

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
      var called = 0;
      var RHS = new Schema({
        name: String
      });
      RHS.pre('remove', function(next) {
        called++;
        return next();
      });

      var RH = db.model('RH', RHS, 'RH_' + random());

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

    describe('when called multiple times', function() {
      it('always executes the passed callback gh-1210', function(done) {
        var collection = 'blogposts_' + random(),
            BlogPost = db.model('BlogPost', collection),
            post = new BlogPost();

        post.save(function(err) {
          assert.ifError(err);

          var pending = 2;

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
      var Post = new Schema({
        title: String,
        author: {name: String},
        subject: {name: String}
      });

      mongoose.model('PostWithClashGetters', Post);

      var PostModel = db.model('PostWithClashGetters', 'postwithclash' + random());

      var post = new PostModel({
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
      var called = false;

      var schema = new mongoose.Schema({
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

      var A = mongoose.model('gettersShouldNotBeTriggeredAtConstruction', schema);

      var a = new A({number: 100});
      assert.equal(called, false);
      var num = a.number;
      assert.equal(called, true);
      assert.equal(num.valueOf(), 100);
      assert.equal(a.getValue('number').valueOf(), 50);

      called = false;
      var b = new A;
      b.init({number: 50});
      assert.equal(called, false);
      num = b.number;
      assert.equal(called, true);
      assert.equal(num.valueOf(), 100);
      assert.equal(b.getValue('number').valueOf(), 50);
      done();
    });

    it('with type defined with { type: Native } (gh-190)', function(done) {
      var schema = new Schema({
        date: {type: Date}
      });

      mongoose.model('ShortcutGetterObject', schema);

      var ShortcutGetter = db.model('ShortcutGetterObject', 'shortcut' + random()),
          post = new ShortcutGetter();

      post.set('date', Date.now());
      assert.ok(post.date instanceof Date);
      done();
    });

    describe('nested', function() {
      it('works', function(done) {
        var schema = new Schema({
          first: {
            second: [Number]
          }
        });
        mongoose.model('ShortcutGetterNested', schema);

        var ShortcutGetterNested = db.model('ShortcutGetterNested', collection),
            doc = new ShortcutGetterNested();

        assert.equal(typeof doc.first, 'object');
        assert.ok(doc.first.second.isMongooseArray);
        done();
      });

      it('works with object literals', function(done) {
        var BlogPost = db.model('BlogPost', collection);

        var date = new Date;

        var meta = {
          date: date,
          visitors: 5
        };

        var post = new BlogPost();
        post.init({
          meta: meta
        });

        assert.ok(post.get('meta').date instanceof Date);
        assert.ok(post.meta.date instanceof Date);

        var threw = false;
        var getter1;
        var getter2;
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

        var newmeta = {
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
        var schema = new Schema({
          nest: {
            st: String
          }
        });

        mongoose.model('NestedStringA', schema);
        var T = db.model('NestedStringA', collection);

        var t = new T({nest: null});

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
        var schema = new Schema({
          nest: {
            st: String
          }
        });

        mongoose.model('NestedStringB', schema);
        var T = db.model('NestedStringB', collection);

        var t = new T({nest: undefined});

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
        var schema = new Schema({
          nest: {
            st: String,
            yep: String
          }
        });

        mongoose.model('NestedStringC', schema);
        var T = db.model('NestedStringC', collection);

        var t = new T({nest: null});

        t.save(function(err) {
          assert.ifError(err);

          t.nest = {st: 'jsconf rules', yep: 'it does'};

          // check that entire `nest` object is being $set
          var u = t.$__delta()[1];
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

        var DooDad = db.model('MySchema'),
            doodad = new DooDad({nested: {arrays: []}}),
            date = 1234567890;

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

        var DooDad = db.model('MySchema2', collection),
            doodad = new DooDad();

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

      var tick = 0;

      function uptick() {
        return ++tick;
      }

      var Location = new Schema({
        lat: {type: Number, default: 0, set: setLat},
        long: {type: Number, set: uptick}
      });

      var Deal = new Schema({
        title: String,
        locations: [Location]
      });

      Location = db.model('Location', Location, 'locations_' + random());
      Deal = db.model('Deal', Deal, 'deals_' + random());

      var location = new Location({lat: 1.2, long: 10});
      assert.equal(location.lat.valueOf(), 1);
      assert.equal(location.long.valueOf(), 1);

      var deal = new Deal({title: 'My deal', locations: [{lat: 1.2, long: 33}]});
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
    var BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();

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
      var BlogPost = db.model('BlogPost', collection),
          totalDocs = 4,
          saveQueue = [];

      var post = new BlogPost;

      function complete() {
        BlogPost.findOne({_id: post.get('_id')}, function(err, doc) {

          assert.ifError(err);
          assert.equal(doc.get('comments').length, 5);

          var v = doc.get('comments').some(function(comment) {
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
      var BlogPost = db.model('BlogPost', collection);

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
                  var comment = foundBlog.get('comments')[0];
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
    var Inner = new Schema({
      arr: [Number]
    });

    var Outer = new Schema({
      inner: [Inner]
    });
    mongoose.model('Outer', Outer);

    Outer = db.model('Outer', 'arr_test_' + random());

    var outer = new Outer();
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
    var schema = new Schema({
      nested: {
        nums: [Number]
      }
    });

    mongoose.model('NestedPushes', schema);
    var Temp = db.model('NestedPushes', collection);

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
    var schema = new Schema({
      nested: {
        nums: [Number]
      }
    });

    var Temp = db.model('NestedPushes', schema, collection);

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
    var schema = new Schema({
      nested: {
        nums: [Number]
      }
    });

    var Temp = db.model('NestedPushes', schema, collection);

    Temp.create({nested: {nums: [1, 2, 3, 4, 5]}}, function(err, t) {
      assert.ifError(err);
      t.nested.nums.pull(1);
      t.nested.nums.pull(2);
      assert.equal(t.$__.activePaths.paths['nested.nums'], 'modify');
      done();
    });
  });


  it('activePaths should be updated for nested modifieds as promise', function(done) {
    var schema = new Schema({
      nested: {
        nums: [Number]
      }
    });

    var Temp = db.model('NestedPushes', schema, collection);

    var p1 = Temp.create({nested: {nums: [1, 2, 3, 4, 5]}});
    p1.then(function(t) {
      t.nested.nums.pull(1);
      t.nested.nums.pull(2);
      assert.equal(t.$__.activePaths.paths['nested.nums'], 'modify');
      done();
    }).catch(done);
  });

  it('$pull should affect what you see in an array before a save', function(done) {
    var schema = new Schema({
      nested: {
        nums: [Number]
      }
    });

    var Temp = db.model('NestedPushes', schema, collection);

    Temp.create({nested: {nums: [1, 2, 3, 4, 5]}}, function(err, t) {
      assert.ifError(err);
      t.nested.nums.pull(1);
      assert.equal(t.nested.nums.length, 4);
      done();
    });
  });

  it('$shift', function(done) {
    var schema = new Schema({
      nested: {
        nums: [Number]
      }
    });

    mongoose.model('TestingShift', schema);
    var Temp = db.model('TestingShift', collection);

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
      var TempSchema = new Schema({
            nums: [Number]
          }),
          totalDocs = 2,
          saveQueue = [];

      mongoose.model('Temp', TempSchema);
      var Temp = db.model('Temp', collection);

      var t = new Temp();

      function complete() {
        Temp.findOne({_id: t.get('_id')}, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.get('nums').length, 3);

          var v = doc.get('nums').some(function(num) {
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
      var StrListSchema = new Schema({
            strings: [String]
          }),
          totalDocs = 2,
          saveQueue = [];

      mongoose.model('StrList', StrListSchema);
      var StrList = db.model('StrList');

      var t = new StrList();

      function complete() {
        StrList.findOne({_id: t.get('_id')}, function(err, doc) {
          assert.ifError(err);

          assert.equal(doc.get('strings').length, 3);

          var v = doc.get('strings').some(function(str) {
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
      var BufListSchema = new Schema({
            buffers: [Buffer]
          }),
          totalDocs = 2,
          saveQueue = [];

      mongoose.model('BufList', BufListSchema);
      var BufList = db.model('BufList');

      var t = new BufList();

      function complete() {
        BufList.findOne({_id: t.get('_id')}, function(err, doc) {
          assert.ifError(err);

          assert.equal(doc.get('buffers').length, 3);

          var v = doc.get('buffers').some(function(buf) {
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
          doc.get('buffers').push(new Buffer([140]));
          save(doc);
        });

        BufList.findOne({_id: t.get('_id')}, function(err, doc) {
          assert.ifError(err);
          doc.get('buffers').push(new Buffer([141]), new Buffer([142]));
          save(doc);
        });
      });
    });

    it('works with modified element properties + doc removal (gh-975)', function(done) {
      var B = db.model('BlogPost', collection),
          b = new B({comments: [{title: 'gh-975'}]});

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
      var BlogPost = db.model('BlogPost', collection);

      BlogPost.create({
        comments: [{
          title: 'before-change'
        }]
      }, function(err, post) {
        assert.ifError(err);
        BlogPost.findById(post._id, function(err, found) {
          assert.ifError(err);
          assert.equal(found.comments[0].title, 'before-change');
          var subDoc = [{
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
    var BlogPost = db.model('BlogPost', collection);

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
    var SubSchema = new Schema({
      name: String,
      subObj: {subName: String}
    });
    var GH334Schema = new Schema({name: String, arrData: [SubSchema]});

    mongoose.model('GH334', GH334Schema);
    var AModel = db.model('GH334');
    var instance = new AModel();

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
    var BlogPost = db.model('BlogPost', collection),
        post = new BlogPost();

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
      var BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost();

      post.comments.push({title: 'woot'});
      post.comments.push({title: 'aaaa'});

      var subdoc1 = post.comments[0];
      var subdoc2 = post.comments[1];

      post.save(function(err) {
        assert.ifError(err);

        BlogPost.findById(post.get('_id'), function(err, doc) {
          assert.ifError(err);

          // test with an objectid
          assert.equal(doc.comments.id(subdoc1.get('_id')).title, 'woot');

          // test with a string
          var id = subdoc2._id.toString();
          assert.equal(doc.comments.id(id).title, 'aaaa');
          done();
        });
      });
    });

    it('by the id with cast error', function(done) {
      var BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost();

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
      var BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost();

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
    var BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
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
    var BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
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
    var BlogPost = db.model('BlogPost', collection),
        count = 3;

    // string
    var post = new BlogPost();
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
    var post2 = new BlogPost();
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
          var post3 = new BlogPost();
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
    var BlogPost = db.model('BlogPost');

    var post = new BlogPost({
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

    var TestDefaults = db.model('TestTypeDefaults');

    var post = new TestDefaults();
    assert.equal(typeof post.get('type'), 'string');
    assert.equal(post.get('type'), 'YES!');

    // GH-402
    var TestDefaults2 = db.model('TestTypeDefaults2', new Schema({
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
    var BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
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
        var schema = new Schema({name: String});
        var called = 0;

        schema.pre('save', function(next) {
          called++;
          next(undefined);
        });

        schema.pre('save', function(next) {
          called++;
          next(null);
        });

        var S = db.model('S', schema, collection);
        var s = new S({name: 'zupa'});

        s.save(function(err) {
          assert.ifError(err);
          assert.equal(called, 2);
          done();
        });
      });


      it('with an async waterfall', function(done) {
        var schema = new Schema({name: String});
        var called = 0;

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

        var S = db.model('S', schema, collection);
        var s = new S({name: 'zupa'});

        var p = s.save();
        p.then(function() {
          assert.equal(called, 2);
          done();
        }).catch(done);
      });


      it('called on all sub levels', function(done) {
        var grandSchema = new Schema({name: String});
        grandSchema.pre('save', function(next) {
          this.name = 'grand';
          next();
        });

        var childSchema = new Schema({name: String, grand: [grandSchema]});
        childSchema.pre('save', function(next) {
          this.name = 'child';
          next();
        });

        var schema = new Schema({name: String, child: [childSchema]});

        schema.pre('save', function(next) {
          this.name = 'parent';
          next();
        });

        var S = db.model('presave_hook', schema, 'presave_hook');
        var s = new S({name: 'a', child: [{name: 'b', grand: [{name: 'c'}]}]});

        s.save(function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.name, 'parent');
          assert.equal(doc.child[0].name, 'child');
          assert.equal(doc.child[0].grand[0].name, 'grand');
          done();
        });
      });


      it('error on any sub level', function(done) {
        var grandSchema = new Schema({name: String});
        grandSchema.pre('save', function(next) {
          next(new Error('Error 101'));
        });

        var childSchema = new Schema({name: String, grand: [grandSchema]});
        childSchema.pre('save', function(next) {
          this.name = 'child';
          next();
        });

        var schema = new Schema({name: String, child: [childSchema]});
        schema.pre('save', function(next) {
          this.name = 'parent';
          next();
        });

        var S = db.model('presave_hook_error', schema, 'presave_hook_error');
        var s = new S({name: 'a', child: [{name: 'b', grand: [{name: 'c'}]}]});

        s.save(function(err) {
          assert.ok(err instanceof Error);
          assert.equal(err.message, 'Error 101');
          done();
        });
      });

      describe('init', function() {
        it('has access to the true ObjectId when used with querying (gh-289)', function(done) {
          var PreInitSchema = new Schema({}),
              preId = null;

          PreInitSchema.pre('init', function() {
            preId = this._id;
          });

          var PreInit = db.model('PreInit', PreInitSchema, 'pre_inits' + random());

          var doc = new PreInit();
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
        var schema = new Schema({
              title: String
            }),
            save = false,
            remove = false,
            init = false,
            post = undefined;

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

        var BlogPost = db.model('PostHookTest');

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
        var save = false;

        var EmbeddedSchema = new Schema({
          title: String
        });

        EmbeddedSchema.post('save', function() {
          save = true;
        });

        var ParentSchema = new Schema({
          embeds: [EmbeddedSchema]
        });

        mongoose.model('Parent', ParentSchema);

        var Parent = db.model('Parent');

        var parent = new Parent();

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
    it('count()', function(done) {
      var BlogPost = db.model('BlogPost' + random(), bpSchema);

      BlogPost.create({title: 'interoperable count as promise'}, function(err) {
        assert.ifError(err);
        var query = BlogPost.count({title: 'interoperable count as promise'});
        query.exec(function(err, count) {
          assert.ifError(err);
          assert.equal(count, 1);
          done();
        });
      });
    });

    it('update()', function(done) {
      var col = 'BlogPost' + random();
      var BlogPost = db.model(col, bpSchema);

      BlogPost.create({title: 'interoperable update as promise'}, function(err) {
        assert.ifError(err);
        var query = BlogPost.update({title: 'interoperable update as promise'}, {title: 'interoperable update as promise delta'});
        query.exec(function(err) {
          assert.ifError(err);
          BlogPost.count({title: 'interoperable update as promise delta'}, function(err, count) {
            assert.ifError(err);
            assert.equal(count, 1);
            done();
          });
        });
      });
    });

    it('findOne()', function(done) {
      var BlogPost = db.model('BlogPost' + random(), bpSchema);

      BlogPost.create({title: 'interoperable findOne as promise'}, function(err, created) {
        assert.ifError(err);
        var query = BlogPost.findOne({title: 'interoperable findOne as promise'});
        query.exec(function(err, found) {
          assert.ifError(err);
          assert.equal(found.id, created.id);
          done();
        });
      });
    });

    it('find()', function(done) {
      var BlogPost = db.model('BlogPost' + random(), bpSchema);

      BlogPost.create(
        {title: 'interoperable find as promise'},
        {title: 'interoperable find as promise'},
        function(err, createdOne, createdTwo) {
          assert.ifError(err);
          var query = BlogPost.find({title: 'interoperable find as promise'}).sort('_id');
          query.exec(function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 2);
            var ids = {};
            ids[String(found[0]._id)] = 1;
            ids[String(found[1]._id)] = 1;
            assert.ok(String(createdOne._id) in ids);
            assert.ok(String(createdTwo._id) in ids);
            done();
          });
        });
    });

    it('remove()', function(done) {
      var BlogPost = db.model('BlogPost' + random(), bpSchema);

      BlogPost.create(
        {title: 'interoperable remove as promise'},
        function(err) {
          assert.ifError(err);
          var query = BlogPost.remove({title: 'interoperable remove as promise'});
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
      var BlogPost = db.model('BlogPost' + random(), bpSchema),
          title = 'interop ad-hoc as promise';

      BlogPost.create({title: title}, function(err, created) {
        assert.ifError(err);
        var query = BlogPost.count({title: title});
        query.exec('findOne', function(err, found) {
          assert.ifError(err);
          assert.equal(found.id, created.id);
          done();
        });
      });
    });

    describe('promises', function() {
      it('count()', function(done) {
        var BlogPost = db.model('BlogPost' + random(), bpSchema);

        BlogPost.create({title: 'interoperable count as promise 2'}, function(err) {
          assert.ifError(err);
          var query = BlogPost.count({title: 'interoperable count as promise 2'});
          var promise = query.exec();
          promise.then(function(count) {
            assert.equal(count, 1);
            done();
          }).catch(done);
        });
      });

      it('update()', function(done) {
        var col = 'BlogPost' + random();
        var BlogPost = db.model(col, bpSchema);

        BlogPost.create({title: 'interoperable update as promise 2'}, function(err) {
          assert.ifError(err);
          var query = BlogPost.update({title: 'interoperable update as promise 2'}, {title: 'interoperable update as promise delta 2'});
          var promise = query.exec();
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
        var BlogPost = db.model('BlogPost' + random(), bpSchema);

        BlogPost.create(
          {title: 'interoperable find as promise 2'},
          {title: 'interoperable find as promise 2'},
          function(err, createdOne, createdTwo) {
            assert.ifError(err);
            var query = BlogPost.find({title: 'interoperable find as promise 2'}).sort('_id');
            var promise = query.exec();
            promise.then(function(found) {
              assert.ifError(err);
              assert.equal(found.length, 2);
              assert.equal(found[0].id, createdOne.id);
              assert.equal(found[1].id, createdTwo.id);
              done();
            }).catch(done);
          });
      });

      it('remove()', function() {
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
        var B = db.model('BlogPost' + random(), bpSchema);

        var peopleSchema = new Schema({name: String, likes: ['ObjectId']});
        var P = db.model('promise-BP-people', peopleSchema, random());
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

                var promise = B.find({title: /^then promise/}).select('_id').exec();
                promise.then(function(blogs) {
                  var ids = blogs.map(function(m) {
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
      var BlogPost = db.model('BlogPost', collection);

      var date = new Date(1305730951086);
      var id0 = new DocumentObjectId('4dd3e169dbfb13b4570000b9');
      var id1 = new DocumentObjectId('4dd3e169dbfb13b4570000b6');
      var id2 = new DocumentObjectId('4dd3e169dbfb13b4570000b7');
      var id3 = new DocumentObjectId('4dd3e169dbfb13b4570000b8');

      var post = new BlogPost({
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

      var out = post.inspect();
      assert.equal(out.meta.visitors, post.meta.visitors);
      assert.deepEqual(out.numbers, Array.prototype.slice.call(post.numbers));
      assert.equal(out.date.valueOf(), post.date.valueOf());
      assert.equal(out.activePaths, undefined);
      assert.equal(out._atomics, undefined);
      done();
    });
  });

  describe('pathnames', function() {
    it('named path can be used', function(done) {
      var P = db.model('pathnametest', new Schema({path: String}));

      var threw = false;
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
    var Subdoc = new Schema({name: String, mixed: Schema.Types.Mixed});
    var T = db.model('SubDocMixed', new Schema({subs: [Subdoc]}));

    var t = new T({subs: [{name: 'Hubot', mixed: {w: 1, x: 2}}]});
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

        var sub = t.subs[0];
        sub.name = 'Hubot1';
        assert.equal(sub.name, 'Hubot1');
        assert.ok(sub.isModified('name'));
        assert.ok(t.isModified());

        t.save(function(err) {
          assert.ifError(err);

          T.findById(t._id, function(err, t) {
            assert.ifError(err);
            assert.strictEqual(t.subs[0].name, 'Hubot1');

            var sub = t.subs[0];
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
      var db = start(),
          BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost({mixed: {rgx: /^asdf$/}});
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
    var BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
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

        var DefaultErr = db.model('DefaultErr3', DefaultErrSchema, 'default_err_' + random());

        DefaultErr.on('error', function(err) {
          assert.ok(err instanceof Error);
          done();
        });

        new DefaultErr().save().catch(() => {});
      });
    });

    it('saved changes made within callback of a previous no-op save gh-1139', function(done) {
      var B = db.model('BlogPost', collection);

      var post = new B({title: 'first'});
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
      var s = new Schema({_id: {type: String}});
      var B = db.model('1595', s);
      var b = new B;
      b.save(function(err) {
        assert.ok(err);
        assert.ok(/must have an _id/.test(err));
        done();
      });
    });
  });


  describe('_delta()', function() {
    it('should overwrite arrays when directly set (gh-1126)', function(done) {
      var B = db.model('BlogPost', collection);

      B.create({title: 'gh-1126', numbers: [1, 2]}, function(err, b) {
        assert.ifError(err);
        B.findById(b._id, function(err, b) {
          assert.ifError(err);
          assert.deepEqual([1, 2].join(), b.numbers.join());

          b.numbers = [];
          b.numbers.push(3);

          var d = b.$__delta()[1];
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
              var d = b.$__delta();
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
      var B = db.model('BlogPost', 'gh-1303-' + random());

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

            var d = b.$__delta()[1];
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
      var M = db.model('backwardDataConflict', new Schema({namey: {first: String, last: String}}));
      var m = new M({namey: '[object Object]'});
      m.namey = {first: 'GI', last: 'Joe'};// <-- should overwrite the string
      m.save(function(err) {
        assert.strictEqual(err, null);
        assert.strictEqual('GI', m.namey.first);
        assert.strictEqual('Joe', m.namey.last);
        done();
      });
    });

    it('with positional notation on path not existing in schema (gh-1048)', function(done) {
      var db = start();

      var M = db.model('backwardCompat-gh-1048', Schema({name: 'string'}));
      db.on('open', function() {
        var o = {
          name: 'gh-1048',
          _id: new mongoose.Types.ObjectId,
          databases: {
            0: {keys: 100, expires: 0},
            15: {keys: 1, expires: 0}
          }
        };

        M.collection.insert(o, {safe: true}, function(err) {
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
      var B = db.model('BlogPost', collection);

      var b = new B;
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
    var T = new Schema({_id: Number, a: String});
    var D = db.model('Testing691', T, 'asdf' + random());
    var d = new D({_id: 1});
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
      var DefaultTestObject = db.model('defaultTestObject',
        new Schema({
          score: {type: Number, default: 55}
        })
      );

      var myTest = new DefaultTestObject();

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
    var schema = new Schema({title: {type: 'string', index: true}});
    var T = db.model('T', schema);
    T.collection.insert({title: 234}, {safe: true}, function(err) {
      assert.ifError(err);
      T.findOne(function(err, doc) {
        assert.ifError(err);
        assert.equal(doc.title, '234');
        done();
      });
    });
  });

  it('setting a path to undefined should retain the value as undefined', function(done) {
    var B = db.model('BlogPost', collection + random());

    var doc = new B;
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
      var M = db.model('758', new Schema({s: String, n: Number, a: Array}));
      M.collection.insert({}, {safe: true}, function(err) {
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
    var schA = new Schema({title: String});
    var schma = new Schema({
      thing: {type: Schema.Types.ObjectId, ref: 'A'},
      subdoc: {
        some: String,
        thing: [{type: Schema.Types.ObjectId, ref: 'A'}]
      }
    });

    var M1 = db.model('A', schA);
    var M2 = db.model('A2', schma);
    var a = new M1({title: 'hihihih'}).toObject();
    var thing = new M2({
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
    var OrderSchema = new Schema({
      total: {
        type: Number,
        default: 0,
        set: function(value) {
          assert.strictEqual(null, value);
          return 10;
        }
      }
    });

    var Order = db.model('order' + random(), OrderSchema);
    var o = new Order({total: null});
    assert.equal(o.total, 10);
    done();
  });

  describe('Skip setting default value for Geospatial-indexed fields (gh-1668)', function() {
    var db;

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
        yield p.save().catch(_err => { err = _err });

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
    var db = start({ noErrorListener: true });
    var Test = db.model('gh3906_0', { name: Object });

    var test = new Test({
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
    var db = start({ noErrorListener: true });
    var Test = db.model('gh3906', { name: Object });

    var test = new Test({
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
    var db;

    before(function() {
      db = start({ noErrorListener: true });
    });

    after(function(done) {
      db.close(done);
    });

    it('doesnt crash (gh-1920)', function(done) {
      var parentSchema = new Schema({
        children: [new Schema({
          name: String
        })]
      });

      var Parent = db.model('gh-1920', parentSchema);

      var parent = new Parent();
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
      var UniqueSchema = new Schema({
        changer: String,
        unique: {
          type: Number,
          unique: true
        }
      });

      var Unique = db.model('Unique', UniqueSchema);

      var u1 = new Unique({
        changer: 'a',
        unique: 5
      });

      var u2 = new Unique({
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
      var schema = new Schema({
        name: String
      }, { timestamps: true });
      var Movie = db.model('gh723', schema);

      var arr = [{ name: 'Star Wars' }, { name: 'The Empire Strikes Back' }];
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
        var mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
        if (!mongo34) {
          done();
          return;
        }

        test();
      });

      function test() {
        var schema = new Schema({
          name: { type: String, unique: true }
        });
        var Movie = db.model('gh3893', schema);

        var arr = [
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
        var mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
        if (!mongo34) {
          done();
          return;
        }

        test();
      });

      function test() {
        var schema = new Schema({
          name: { type: String, required: true }
        });
        var Movie = db.model('gh5068', schema);

        var arr = [
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
        var mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
        if (!mongo34) {
          done();
          return;
        }

        test();
      });

      function test() {
        var schema = new Schema({
          name: { type: String, required: true }
        });
        var Movie = db.model('gh5068-2', schema);

        var arr = [
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
      var schema = new Schema({
        name: String
      });
      var calledPre = 0;
      var calledPost = 0;
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
      var Movie = db.model('gh3846', schema);

      var arr = [{ name: 'Star Wars' }, { name: 'The Empire Strikes Back' }];
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

    it('insertMany() with timestamps (gh-723)', function(done) {
      var schema = new Schema({
        name: String
      });
      var Movie = db.model('gh723_0', schema);

      var arr = [{ name: 'Star Wars' }, { name: 'The Empire Strikes Back' }];
      Movie.insertMany(arr, function(error, docs) {
        assert.ifError(error);
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

    it('insertMany() multi validation error with ordered false (gh-5337)', function(done) {
      var schema = new Schema({
        name: { type: String, required: true }
      });
      var Movie = db.model('gh5337', schema);

      var arr = [
        { foo: 'The Phantom Menace' },
        { name: 'Star Wars' },
        { name: 'The Empire Strikes Back' },
        { foobar: 'The Force Awakens' }
      ];
      var opts = { ordered: false, rawResult: true };
      Movie.insertMany(arr, opts, function(error, res) {
        assert.ifError(error);
        assert.equal(res.mongoose.validationErrors.length, 2);
        assert.equal(res.mongoose.validationErrors[0].name, 'ValidationError');
        assert.equal(res.mongoose.validationErrors[1].name, 'ValidationError');
        done();
      });
    });

    it('insertMany() depopulate (gh-4590)', function(done) {
      var personSchema = new Schema({
        name: String
      });
      var movieSchema = new Schema({
        name: String,
        leadActor: {
          type: Schema.Types.ObjectId,
          ref: 'gh4590'
        }
      });

      var Person = db.model('gh4590', personSchema);
      var Movie = db.model('gh4590_0', movieSchema);

      var arnold = new Person({ name: 'Arnold Schwarzenegger' });
      var movies = [{ name: 'Predator', leadActor: arnold }];
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
      var schema = new Schema({
        name: String
      });
      var Movie = db.model('gh4237', schema);

      var arr = [{ name: 'Star Wars' }, { name: 'The Empire Strikes Back' }];
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

    describe('3.6 features', function() {
      before(function(done) {
        start.mongodVersion((err, version) => {
          if (err) {
            done(err);
            return;
          }
          var mongo36 = version[0] > 3 || (version[0] === 3 && version[1] >= 6);
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

      it.skip('watch() (gh-5964)', function() {
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

      it.skip('watch() before connecting (gh-5964)', function() {
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

      describe('sessions (gh-6362)', function() {
        let MyModel;

        before(function() {
          MyModel = db.model('gh6362', new Schema({ name: String }));
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
            yield MyModel.create({ name: 'test' });

            const session = yield MyModel.startSession();

            let lastUse = session.serverSession.lastUse;

            let doc = yield MyModel.findOne({}, null, { session });
            assert.strictEqual(doc.$__.session, session);
            assert.strictEqual(doc.$session(), session);

            assert.ok(session.serverSession.lastUse > lastUse);
            lastUse = session.serverSession.lastUse;

            doc = yield MyModel.findOneAndUpdate({}, { name: 'test2' },
              { session: session });
            assert.strictEqual(doc.$__.session, session);
            assert.strictEqual(doc.$session(), session);

            assert.ok(session.serverSession.lastUse > lastUse);
            lastUse = session.serverSession.lastUse;

            doc.name = 'test3';

            yield doc.save();

            assert.ok(session.serverSession.lastUse > lastUse);

            session.endSession();
          });
        });

        it('sets session when pulling multiple docs from db', function() {
          return co(function*() {
            const doc = yield MyModel.create({ name: 'test' });

            const session = yield MyModel.startSession();

            let lastUse = session.serverSession.lastUse;

            let docs = yield MyModel.find({ _id: doc._id }, null,
              { session: session });
            assert.equal(docs.length, 1);
            assert.strictEqual(docs[0].$__.session, session);
            assert.strictEqual(docs[0].$session(), session);

            assert.ok(session.serverSession.lastUse > lastUse);
            lastUse = session.serverSession.lastUse;

            docs[0].name = 'test3';

            yield docs[0].save();

            assert.ok(session.serverSession.lastUse > lastUse);

            session.endSession();
          });
        });

        it('supports overwriting `session` in save()', function() {
          return co(function*() {
            yield MyModel.create({ name: 'test' });

            const session = yield MyModel.startSession();

            let lastUse = session.serverSession.lastUse;

            let doc = yield MyModel.findOne({}, null, { session });

            assert.ok(session.serverSession.lastUse > lastUse);
            lastUse = session.serverSession.lastUse;

            doc.name = 'test3';

            yield doc.save({ session: null });

            assert.ok(session.serverSession.lastUse <= lastUse);

            session.endSession();
          });
        });
      });
    });

    it('method with same name as prop should throw (gh-4475)', function(done) {
      var testSchema = new mongoose.Schema({
        isPaid: Boolean
      });
      testSchema.methods.isPaid = function() {
        return false;
      };

      var threw = false;
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
      var schema = new Schema({ name: 'String' });
      var Movie = db.model('gh3222', schema);

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
      var testSchema = new mongoose.Schema({
        name: String
      });
      var Test = db.model('gh4449_0', testSchema);

      var t = new Test();
      Test.create(t, function(error, t2) {
        assert.ifError(error);
        assert.ok(t === t2);
        done();
      });
    });

    it('emits errors correctly from exec (gh-4500)', function(done) {
      var someModel = db.model('gh4500', new Schema({}));

      someModel.on('error', function(error) {
        assert.equal(error.message, 'This error will not disappear');
        done();
      });

      someModel.findOne().exec(function() {
        throw new Error('This error will not disappear');
      });
    });

    it('disabling id getter with .set() (gh-5548)', function(done) {
      var ChildSchema = new mongoose.Schema({
        name: String,
        _id: false
      });

      ChildSchema.set('id', false);

      var ParentSchema = new mongoose.Schema({
        child: {
          type: ChildSchema,
          default: {}
        }
      }, { id: false });

      var Parent = db.model('gh5548', ParentSchema);

      var doc = new Parent({ child: { name: 'test' } });
      assert.ok(!doc.id);
      assert.ok(!doc.child.id);

      var obj = doc.toObject({ virtuals: true });
      assert.ok(!('id' in obj));
      assert.ok(!('id' in obj.child));

      done();
    });

    it('creates new array when initializing from existing doc (gh-4449)', function(done) {
      var TodoSchema = new mongoose.Schema({
        title: String
      }, { _id: false });

      var UserSchema = new mongoose.Schema({
        name: String,
        todos: [TodoSchema]
      });
      var User = db.model('User', UserSchema);

      var val = new User({ name: 'Val' });
      User.create(val, function(error, val) {
        assert.ifError(error);
        val.todos.push({ title: 'Groceries' });
        val.save(function(error) {
          assert.ifError(error);
          User.findById(val, function(error, val) {
            assert.ifError(error);
            assert.deepEqual(val.toObject().todos, [{ title: 'Groceries' }]);
            var u2 = new User();
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

    it('bulkWrite casting (gh-3998)', function(done) {
      var schema = new Schema({
        str: String,
        num: Number
      });

      var M = db.model('gh3998', schema);

      var ops = [
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

    it('bulkWrite with setDefaultsOnInsert (gh-5708)', function(done) {
      var schema = new Schema({
        str: { type: String, default: 'test' },
        num: Number
      });

      var M = db.model('gh5708', schema);

      var ops = [
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

    it('insertMany with Decimal (gh-5190)', function(done) {
      start.mongodVersion(function(err, version) {
        if (err) {
          done(err);
          return;
        }
        var mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
        if (!mongo34) {
          done();
          return;
        }

        test();
      });

      function test() {
        var schema = new mongoose.Schema({
          amount : mongoose.Schema.Types.Decimal
        });
        var Money = db.model('gh5190', schema);

        Money.insertMany([{ amount : '123.45' }], function(error) {
          assert.ifError(error);
          done();
        });
      }
    });

    it('remove with cast error (gh-5323)', function(done) {
      var schema = new mongoose.Schema({
        name: String
      });

      var Model = db.model('gh5323', schema);
      var arr = [
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
      var schema = new mongoose.Schema({ name: String });

      var Model = db.model('gh2037', schema);

      Model.create(1, function(error) {
        assert.ok(error);
        assert.equal(error.name, 'ObjectParameterError');
        done();
      });
    });

    it('save() with unacknowledged writes (gh-6012)', function() {
      var schema = new mongoose.Schema({ name: String }, { safe: false });

      const Model = db.model('gh6012', schema);

      return Model.create({});
    });

    it('save() with unacknowledged writes in options (gh-6012)', function() {
      var schema = new mongoose.Schema({ name: String });

      const Model = db.model('gh6012_1', schema);
      const doc = new Model();

      return doc.save({ safe: { w: 0 } });
    });

    it('bulkWrite casting updateMany, deleteOne, deleteMany (gh-3998)', function(done) {
      var schema = new Schema({
        str: String,
        num: Number
      });

      var M = db.model('gh3998_0', schema);

      var ops = [
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
        M.count({}, function(error, count) {
          assert.ifError(error);
          assert.equal(count, 0);
          done();
        });
      });
    });

    it('bulkWrite casting replaceOne (gh-3998)', function(done) {
      var schema = new Schema({
        str: String,
        num: Number
      });

      var M = db.model('gh3998_1', schema);

      var ops = [
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
      var s1 = new Schema({
        array: mongoose.Schema.Types.Mixed
      }, {minimize: false});

      var s2 = new Schema({
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

      var M1 = db.model('gh-2442-1', s1, 'gh-2442');
      var M2 = db.model('gh-2442-2', s2, 'gh-2442');

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
  });
});
