
/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Query = require('../lib/query')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , CastError = SchemaType.CastError
  , ValidatorError = SchemaType.ValidatorError
  , ValidationError = mongoose.Document.ValidationError
  , ObjectId = Schema.ObjectId
  , DocumentObjectId = mongoose.Types.ObjectId
  , DocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = mongoose.Types.Embedded
  , MongooseArray = mongoose.Types.Array
  , MongooseError = mongoose.Error;

/**
 * Setup.
 */

var Comments = new Schema;

Comments.add({
    title     : String
  , date      : Date
  , body      : String
  , comments  : [Comments]
});

var BlogPost = new Schema({
    title     : String
  , author    : String
  , slug      : String
  , date      : Date
  , meta      : {
        date      : Date
      , visitors  : Number
    }
  , published : Boolean
  , mixed     : {}
  , numbers   : [Number]
  , owners    : [ObjectId]
  , comments  : [Comments]
  , nested    : { array: [Number] }
});

BlogPost
.virtual('titleWithAuthor')
.get(function () {
  return this.get('title') + ' by ' + this.get('author');
})
.set(function (val) {
  var split = val.split(' by ');
  this.set('title', split[0]);
  this.set('author', split[1]);
});

BlogPost.method('cool', function(){
  return this;
});

BlogPost.static('woot', function(){
  return this;
});

mongoose.model('BlogPost', BlogPost);

var collection = 'blogposts_' + random();

describe('model', function(){
  describe('constructor', function(){
    it('works without "new" keyword', function(){
      var B = mongoose.model('BlogPost');
      var b = B();
      assert.ok(b instanceof B);
      var db = start();
      B = db.model('BlogPost');
      db.close();
      b = B();
      assert.ok(b instanceof B);
    })
    it('works "new" keyword', function(){
      var B = mongoose.model('BlogPost');
      var b = new B();
      assert.ok(b instanceof B);
      var db = start();
      B = db.model('BlogPost');
      db.close();
      b = new B();
      assert.ok(b instanceof B);
    })
  })
  describe('isNew', function(){
    it('is true on instantiation', function(){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      db.close();
      var post = new BlogPost;
      assert.equal(true, post.isNew);
    });

    it('on parent and subdocs on failed inserts', function(done){
      var db = start()

      var schema = new Schema({
          name: { type: String, unique: true }
        , em: [new Schema({ x: Number })]
      }, { collection: 'testisnewonfail_'+random() });

      var A = db.model('isNewOnFail', schema);

      A.on('index', function () {
        var a = new A({ name: 'i am new', em: [{ x: 1 }] });
        a.save(function (err) {
          assert.ifError(err);
          assert.equal(a.isNew, false);
          assert.equal(a.em[0].isNew, false);
          var b = new A({ name: 'i am new', em: [{x:2}] });
          b.save(function (err) {
            db.close();
            assert.ok(err);
            assert.equal(b.isNew, true);
            assert.equal(b.em[0].isNew, true);
            done();
          });
        });
      });
    })
  });

  describe('schema:', function(){
    it('should exist', function(){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      db.close();
      assert.ok(BlogPost.schema instanceof Schema);
      assert.ok(BlogPost.prototype.schema instanceof Schema);
    });
    it('emits init event', function(){
      var db = start()
        , schema = new Schema({ name: String })
        , model

      schema.on('init', function (model_) {
        model = model_;
      });

      var Named = db.model('EmitInitOnSchema', schema);
      db.close();
      assert.equal(model,Named);
    });
  });

  describe('structure', function(){
    it('default when instantiated', function(){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      db.close();
      var post = new BlogPost;
      assert.equal(post.db.model('BlogPost').modelName,'BlogPost');
      assert.equal(post.constructor.modelName,'BlogPost');

      assert.ok(post.get('_id') instanceof DocumentObjectId);

      assert.equal(undefined, post.get('title'));
      assert.equal(undefined, post.get('slug'));
      assert.equal(undefined, post.get('date'));

      assert.equal('object', typeof post.get('meta'));
      assert.deepEqual(post.get('meta'), {});
      assert.equal(undefined, post.get('meta.date'));
      assert.equal(undefined, post.get('meta.visitors'));
      assert.equal(undefined, post.get('published'));
      assert.equal(1, Object.keys(post.get('nested')).length);
      assert.ok(Array.isArray(post.get('nested').array));

      assert.ok(post.get('numbers') instanceof MongooseArray);
      assert.ok(post.get('owners') instanceof MongooseArray);
      assert.ok(post.get('comments') instanceof DocumentArray);
      assert.ok(post.get('nested.array') instanceof MongooseArray);
    });

    describe('array', function(){
      describe('defaults', function(){
        it('to a non-empty array', function(){
          var db = start()
            , DefaultArraySchema = new Schema({
                  arr: {type: Array, cast: String, default: ['a', 'b', 'c']}
                , single: {type: Array, cast: String, default: ['a']}
              });
          mongoose.model('DefaultArray', DefaultArraySchema);
          var DefaultArray = db.model('DefaultArray', collection);
          var arr = new DefaultArray;
          db.close();
          assert.equal(arr.get('arr').length, 3)
          assert.equal(arr.get('arr')[0],'a');
          assert.equal(arr.get('arr')[1],'b');
          assert.equal(arr.get('arr')[2],'c');
          assert.equal(arr.get('single').length, 1)
          assert.equal(arr.get('single')[0],'a');
        });

        it('empty', function(){
          var db = start()
            , DefaultZeroCardArraySchema = new Schema({
                arr: {type: Array, cast: String, default: []}
              , auto: [Number]
              });
          mongoose.model('DefaultZeroCardArray', DefaultZeroCardArraySchema);
          var DefaultZeroCardArray = db.model('DefaultZeroCardArray', collection);
          db.close();
          var arr = new DefaultZeroCardArray();
          assert.equal(arr.get('arr').length, 0);
          assert.equal(arr.arr.length, 0);
          assert.equal(arr.auto.length, 0);
        });
      });
    })

    it('a hash with one null value', function(){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost({
        title: null
      });
      db.close();
      assert.strictEqual(null, post.title);
    });

    it('when saved', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)
        , pending = 2;

      function cb () {
        if (--pending) return;
        db.close();
        done();
      }

      var post = new BlogPost();
      post.on('save', function (post) {
        assert.ok(post.get('_id') instanceof DocumentObjectId);

        assert.equal(undefined, post.get('title'));
        assert.equal(undefined, post.get('slug'));
        assert.equal(undefined, post.get('date'));
        assert.equal(undefined, post.get('published'));

        assert.equal(typeof post.get('meta'), 'object');
        assert.deepEqual(post.get('meta'), {});
        assert.equal(undefined, post.get('meta.date'));
        assert.equal(undefined, post.get('meta.visitors'));

        assert.ok(post.get('owners') instanceof MongooseArray);
        assert.ok(post.get('comments') instanceof DocumentArray);
        cb();
      });

      post.save(function(err, post){
        assert.ifError(err);
        assert.ok(post.get('_id') instanceof DocumentObjectId);

        assert.equal(undefined, post.get('title'));
        assert.equal(undefined, post.get('slug'));
        assert.equal(undefined, post.get('date'));
        assert.equal(undefined, post.get('published'));

        assert.equal(typeof post.get('meta'), 'object');
        assert.deepEqual(post.get('meta'),{});
        assert.equal(undefined, post.get('meta.date'));
        assert.equal(undefined, post.get('meta.visitors'));

        assert.ok(post.get('owners') instanceof MongooseArray);
        assert.ok(post.get('comments') instanceof DocumentArray);
        cb();
      });
    })

    describe('init', function(){
      it('works', function(){
        var db = start()
          , BlogPost = db.model('BlogPost', collection);

        var post = new BlogPost()
        db.close();

        post.init({
            title       : 'Test'
          , slug        : 'test'
          , date        : new Date
          , meta        : {
                date      : new Date
              , visitors  : 5
            }
          , published   : true
          , owners      : [new DocumentObjectId, new DocumentObjectId]
          , comments    : [
                              { title: 'Test', date: new Date, body: 'Test' }
                            , { title: 'Super', date: new Date, body: 'Cool' }
                          ]
        });

        assert.equal(post.get('title'),'Test');
        assert.equal(post.get('slug'),'test');
        assert.ok(post.get('date') instanceof Date);
        assert.equal('object', typeof post.get('meta'));
        assert.ok(post.get('meta').date instanceof Date);
        assert.equal(typeof post.get('meta').visitors, 'number')
        assert.equal(post.get('published'), true);

        assert.equal(post.title,'Test');
        assert.equal(post.slug,'test');
        assert.ok(post.date instanceof Date);
        assert.equal(typeof post.meta,'object');
        assert.ok(post.meta.date instanceof Date);
        assert.equal(typeof post.meta.visitors,'number');
        assert.equal(post.published, true);

        assert.ok(post.get('owners') instanceof MongooseArray);
        assert.ok(post.get('owners')[0] instanceof DocumentObjectId);
        assert.ok(post.get('owners')[1] instanceof DocumentObjectId);

        assert.ok(post.owners instanceof MongooseArray);
        assert.ok(post.owners[0] instanceof DocumentObjectId);
        assert.ok(post.owners[1] instanceof DocumentObjectId);

        assert.ok(post.get('comments') instanceof DocumentArray);
        assert.ok(post.get('comments')[0] instanceof EmbeddedDocument);
        assert.ok(post.get('comments')[1] instanceof EmbeddedDocument);

        assert.ok(post.comments instanceof DocumentArray);
        assert.ok(post.comments[0] instanceof EmbeddedDocument);
        assert.ok(post.comments[1] instanceof EmbeddedDocument);
      })

      it('partially', function(){
        var db = start()
          , BlogPost = db.model('BlogPost', collection);

        db.close();
        var post = new BlogPost;
        post.init({
            title       : 'Test'
          , slug        : 'test'
          , date        : new Date
        });

        assert.equal(post.get('title'),'Test');
        assert.equal(post.get('slug'),'test');
        assert.ok(post.get('date') instanceof Date);
        assert.equal('object', typeof post.get('meta'));

        assert.deepEqual(post.get('meta'),{});
        assert.equal(undefined, post.get('meta.date'));
        assert.equal(undefined, post.get('meta.visitors'));
        assert.equal(undefined, post.get('published'));

        assert.ok(post.get('owners') instanceof MongooseArray);
        assert.ok(post.get('comments') instanceof DocumentArray);
      })

      it('with partial hash', function(){
        var db = start()
          , BlogPost = db.model('BlogPost', collection);

        db.close();
        var post = new BlogPost({
          meta: {
              date      : new Date
            , visitors  : 5
          }
        });

        assert.equal(5, post.get('meta.visitors').valueOf());
      });

      it('isNew on embedded documents', function(){
        var db = start()
          , BlogPost = db.model('BlogPost', collection);

        db.close();
        var post = new BlogPost()
        post.init({
            title       : 'Test'
          , slug        : 'test'
          , comments    : [ { title: 'Test', date: new Date, body: 'Test' } ]
        });

        assert.equal(false, post.get('comments')[0].isNew);
      })

      it('isNew on embedded documents after saving', function(done){
        var db = start()
          , BlogPost = db.model('BlogPost', collection);

        var post = new BlogPost({ title: 'hocus pocus' })
        post.comments.push({ title: 'Humpty Dumpty', comments: [{title: 'nested'}] });
        assert.equal(true, post.get('comments')[0].isNew);
        assert.equal(true, post.get('comments')[0].comments[0].isNew);
        post.invalidate('title'); // force error
        post.save(function (err) {
          assert.equal(true, post.isNew);
          assert.equal(true, post.get('comments')[0].isNew);
          assert.equal(true, post.get('comments')[0].comments[0].isNew);
          post.save(function (err) {
            db.close();
            assert.strictEqual(null, err);
            assert.equal(false, post.isNew);
            assert.equal(false, post.get('comments')[0].isNew);
            assert.equal(false, post.get('comments')[0].comments[0].isNew);
            done()
          });
        });
      })
    });
  });

  it('collection name can be specified through schema', function(){
    var schema = new Schema({ name: String }, { collection: 'users1' });
    var Named = mongoose.model('CollectionNamedInSchema1', schema);
    assert.equal(Named.prototype.collection.name,'users1');

    var db = start();
    var users2schema = new Schema({ name: String }, { collection: 'users2' });
    var Named2 = db.model('CollectionNamedInSchema2', users2schema);
    db.close();
    assert.equal(Named2.prototype.collection.name,'users2');
  });

  it('saving a model with a null value should perpetuate that null value to the db', function(done){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost({
      title: null
    });
    assert.strictEqual(null, post.title);
    post.save( function (err) {
      assert.strictEqual(err, null);
      BlogPost.findById(post.id, function (err, found) {
        db.close();
        assert.strictEqual(err, null);
        assert.strictEqual(found.title, null);
        done();
      });
    });
  });

  it('instantiating a model with a hash that maps to at least 1 undefined value', function(done){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost({
      title: undefined
    });
    assert.strictEqual(undefined, post.title);
    post.save( function (err) {
      assert.strictEqual(null, err);
      BlogPost.findById(post.id, function (err, found) {
        db.close();
        assert.strictEqual(err, null);
        assert.strictEqual(found.title, undefined);
        done();
      });
    });
  })

  it('modified nested objects which contain MongoseNumbers should not cause a RangeError on save (gh-714)', function(done){
    var db =start()

    var schema = new Schema({
        nested: {
            num: Number
        }
    });

    var M = db.model('NestedObjectWithMongooseNumber', schema);
    var m = new M;
    m.nested = null;
    m.save(function (err) {
      assert.ifError(err);

      M.findById(m, function (err, m) {
        assert.ifError(err);
        m.nested.num = 5;
        m.save(function (err) {
          db.close();
          assert.ifError(err);
          done();
        });
      });
    });
  })

  it('no RangeError on remove() of a doc with Number _id (gh-714)', function(done){
    var db = start()

    var MySchema = new Schema({
        _id: { type: Number },
        name: String
    });

    var MyModel = db.model('MyModel', MySchema, 'numberrangeerror'+random());

    var instance = new MyModel({
        name: 'test'
      , _id: 35
    });

    instance.save(function (err) {
      assert.ifError(err);

      MyModel.findById(35, function (err, doc) {
        assert.ifError(err);

        doc.remove(function (err) {
          db.close();
          assert.ifError(err);
          done();
        });
      });
    });
  });

  it('over-writing a number should persist to the db (gh-342)', function(done){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost({
      meta: {
          date      : new Date
        , visitors  : 10
      }
    });

    post.save( function (err) {
      assert.ifError(err);
      post.set('meta.visitors', 20);
      post.save( function (err) {
        assert.ifError(err);
        BlogPost.findById(post.id, function (err, found) {
          assert.ifError(err);
          assert.equal(20, found.get('meta.visitors').valueOf());
          db.close();
          done();
        });
      });
    });
  });

  describe('methods', function(){
    it('can be defined', function(){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      db.close();
      var post = new BlogPost();
      assert.equal(post, post.cool());
    })

    it('can be defined on embedded documents', function(){
      var db = start();
      var ChildSchema = new Schema({ name: String });
      ChildSchema.method('talk', function () {
        return 'gaga';
      });

      var ParentSchema = new Schema({
        children: [ChildSchema]
      });

      var ChildA = db.model('ChildA', ChildSchema, 'children_' + random());
      var ParentA = db.model('ParentA', ParentSchema, 'parents_' + random());
      db.close();

      var c = new ChildA;
      assert.equal('function', typeof c.talk);

      var p = new ParentA();
      p.children.push({});
      assert.equal('function', typeof p.children[0].talk);
    })
  })

  describe('statics', function(){
    it('can be defined', function(){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      db.close();
      assert.equal(BlogPost, BlogPost.woot());
    });
  });

  describe('casting', function(){
    it('error', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)
        , threw = false;

      var post = new BlogPost;

      try {
        post.init({
            date: 'Test'
        });
      } catch(e){
        threw = true;
      }

      assert.equal(false, threw);

      try {
        post.set('title', 'Test');
      } catch(e){
        threw = true;
      }

      assert.equal(false, threw);

      post.save(function(err){
        db.close();
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof CastError);
        done();
      });
    })
    it('nested error', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)
        , threw = false;

      var post = new BlogPost;

      try {
        post.init({
            meta: {
                date: 'Test'
            }
        });
      } catch(e){
        threw = true;
      }

      assert.equal(false, threw);

      try {
        post.set('meta.date', 'Test');
      } catch(e){
        threw = true;
      }

      assert.equal(false, threw);

      post.save(function(err){
        db.close();
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof CastError);
        done();
      });
    });
    it('subdocument error', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)
        , threw = false;

      var post = new BlogPost()
      post.init({
          title       : 'Test'
        , slug        : 'test'
        , comments    : [ { title: 'Test', date: new Date, body: 'Test' } ]
      });

      post.get('comments')[0].set('date', 'invalid');

      post.save(function(err){
        db.close();
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof CastError);
        done();
      });
    });
    it('subdocument error when adding a subdoc', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)
        , threw = false;

      var post = new BlogPost()

      try {
        post.get('comments').push({
            date: 'Bad date'
        });
      } catch (e) {
        threw = true;
      }

      assert.equal(false, threw);

      post.save(function(err){
        db.close();
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof CastError);
        done();
      });
    });

    it('updates', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost();
      post.set('title', '1');

      var id = post.get('_id');

      post.save(function (err) {
        assert.ifError(err);

        BlogPost.update({ title: 1, _id: id }, { title: 2 }, function (err) {
          assert.ifError(err);

          BlogPost.findOne({ _id: post.get('_id') }, function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.equal(doc.get('title'), '2');
            done();
          });
        });
      });
    });

    it('$pull', function(){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)
        , post = new BlogPost();

      db.close();
      post.get('numbers').push('3');
      assert.equal(post.get('numbers')[0], 3);
    });

    it('$push', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)
        , post = new BlogPost();

      post.get('numbers').push(1, 2, 3, 4);
      post.save( function (err) {
        BlogPost.findById( post.get('_id'), function (err, found) {
          assert.equal(found.get('numbers').length,4);
          found.get('numbers').pull('3');
          found.save( function (err) {
            BlogPost.findById(found.get('_id'), function (err, found2) {
              db.close();
              assert.ifError(err);
              assert.equal(found2.get('numbers').length,3);
              done();
            });
          });
        });
      });
    });

    it('Number arrays', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost();
      post.numbers.push(1, '2', 3);

      post.save(function (err) {
        assert.strictEqual(err, null);

        BlogPost.findById(post._id, function (err, doc) {
          assert.ifError(err);

          assert.ok(~doc.numbers.indexOf(1));
          assert.ok(~doc.numbers.indexOf(2));
          assert.ok(~doc.numbers.indexOf(3));

          db.close();
          done();
        });
      })
    });

    it('date casting compat with datejs (gh-502)', function(done){
      var db = start()

      Date.prototype.toObject = function() {
          return {
                millisecond: 86
              , second: 42
              , minute: 47
              , hour: 17
              , day: 13
              , week: 50
              , month: 11
              , year: 2011
          };
      };

      var S = new Schema({
          name: String
        , description: String
        , sabreId: String
        , data: {
              lastPrice: Number
            , comm: String
            , curr: String
            , rateName: String
          }
        , created: { type: Date, default: Date.now }
        , valid: { type: Boolean, default: true }
      });

      var M = db.model('gh502', S);

      var m = new M;
      m.save(function (err) {
        assert.ifError(err);
        M.findById(m._id, function (err, m) {
          assert.ifError(err);
          m.save(function (err) {
            assert.ifError(err);
            M.remove(function (err) {
              db.close();
              delete Date.prototype.toObject;
              assert.ifError(err);
              done();
            });
          });
        });
      });
    });
  });

  describe('validation', function(){
    it('works', function(done){
      function dovalidate (val) {
        assert.equal('correct', this.asyncScope);
        return true;
      }

      function dovalidateAsync (val, callback) {
        assert.equal('correct', this.scope);
        process.nextTick(function () {
          callback(true);
        });
      }

      mongoose.model('TestValidation', new Schema({
          simple: { type: String, required: true }
        , scope: { type: String, validate: [dovalidate, 'scope failed'], required: true }
        , asyncScope: { type: String, validate: [dovalidateAsync, 'async scope failed'], required: true }
      }));

      var db = start()
        , TestValidation = db.model('TestValidation');

      var post = new TestValidation();
      post.set('simple', '');
      post.set('scope', 'correct');
      post.set('asyncScope', 'correct');

      post.save(function(err){
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);

        post.set('simple', 'here');
        post.save(function(err){
          db.close();
          assert.ifError(err);
          done();
        });
      });
    });

    it('custom messaging', function(done){
      function validate (val) {
        return val === 'abc';
      }
      mongoose.model('TestValidationMessage', new Schema({
          simple: { type: String, validate: [validate, 'must be abc'] }
      }));

      var db = start()
        , TestValidationMessage = db.model('TestValidationMessage');

      var post = new TestValidationMessage();
      post.set('simple', '');

      post.save(function(err){
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);
        assert.ok(err.errors.simple instanceof ValidatorError);
        assert.equal(err.errors.simple.message,'Validator "must be abc" failed for path simple');
        assert.equal(post.errors.simple.message,'Validator "must be abc" failed for path simple');

        post.set('simple', 'abc');
        post.save(function(err){
          db.close();
          assert.ifError(err);
          done();
        });
      });
    })

    it('with Model.schema.path introspection (gh-272)', function(done){
      var db = start();
      var IntrospectionValidationSchema = new Schema({
        name: String
      });
      var IntrospectionValidation = db.model('IntrospectionValidation', IntrospectionValidationSchema, 'introspections_' + random());
      IntrospectionValidation.schema.path('name').validate(function (value) {
        return value.length < 2;
      }, 'Name cannot be greater than 1 character');
      var doc = new IntrospectionValidation({name: 'hi'});
      doc.save( function (err) {
        db.close();
        assert.equal(err.errors.name.message,"Validator \"Name cannot be greater than 1 character\" failed for path name");
        assert.equal(err.name,"ValidationError");
        assert.equal(err.message,"Validation failed");
        done();
      });
    });

    it('of required undefined values', function(done){
      mongoose.model('TestUndefinedValidation', new Schema({
          simple: { type: String, required: true }
      }));

      var db = start()
        , TestUndefinedValidation = db.model('TestUndefinedValidation');

      var post = new TestUndefinedValidation;

      post.save(function(err){
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);

        post.set('simple', 'here');
        post.save(function(err){
          db.close();
          assert.ifError(err);
          done();
        });
      });
    })

    it('save callback should only execute once (gh-319)', function(done){
      var db = start()

      var D = db.model('CallbackFiresOnceValidation', new Schema({
          username: { type: String, validate: /^[a-z]{6}$/i }
        , email: { type: String, validate: /^[a-z]{6}$/i }
        , password: { type: String, validate: /^[a-z]{6}$/i }
      }));

      var post = new D({
          username: "nope"
        , email: "too"
        , password: "short"
      });

      var timesCalled = 0;

      post.save(function (err) {
        db.close();
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);

        assert.equal(1, ++timesCalled);

        assert.equal(Object.keys(err.errors).length, 3);
        assert.ok(err.errors.password instanceof ValidatorError);
        assert.ok(err.errors.email instanceof ValidatorError);
        assert.ok(err.errors.username instanceof ValidatorError);
        assert.equal(err.errors.password.message,'Validator failed for path password');
        assert.equal(err.errors.email.message,'Validator failed for path email');
        assert.equal(err.errors.username.message,'Validator failed for path username');

        assert.equal(Object.keys(post.errors).length, 3);
        assert.ok(post.errors.password instanceof ValidatorError);
        assert.ok(post.errors.email instanceof ValidatorError);
        assert.ok(post.errors.username instanceof ValidatorError);
        assert.equal(post.errors.password.message,'Validator failed for path password');
        assert.equal(post.errors.email.message,'Validator failed for path email');
        assert.equal(post.errors.username.message,'Validator failed for path username');
        done();
      });
    });

    it('query result', function(done){
      mongoose.model('TestValidationOnResult', new Schema({
          resultv: { type: String, required: true }
      }));

      var db = start()
        , TestV = db.model('TestValidationOnResult');

      var post = new TestV;

      post.validate(function (err) {
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);

        post.resultv = 'yeah';
        post.save(function (err) {
          assert.ifError(err);
          TestV.findOne({ _id: post.id }, function (err, found) {
            assert.ifError(err);
            assert.equal(found.resultv,'yeah');
            found.save(function(err){
              db.close();
              assert.ifError(err);
              done();
            })
          });
        });
      });
    });

    it('of required previously existing null values', function(done){
      mongoose.model('TestPreviousNullValidation', new Schema({
          previous: { type: String, required: true }
        , a: String
      }));

      var db = start()
        , TestP = db.model('TestPreviousNullValidation')

      TestP.collection.insert({ a: null, previous: null}, {}, function (err, f) {
        assert.ifError(err);

        TestP.findOne({_id: f[0]._id}, function (err, found) {
          assert.ifError(err);
          assert.equal(false, found.isNew);
          assert.strictEqual(found.get('previous'), null);

          found.validate(function(err){
            assert.ok(err instanceof MongooseError);
            assert.ok(err instanceof ValidationError);

            found.set('previous', 'yoyo');
            found.save(function (err) {
              assert.strictEqual(err, null);
              db.close();
              done()
            });
          })
        })
      });
    })

    it('nested', function(done){
      mongoose.model('TestNestedValidation', new Schema({
          nested: {
              required: { type: String, required: true }
          }
      }));

      var db = start()
        , TestNestedValidation = db.model('TestNestedValidation');

      var post = new TestNestedValidation();
      post.set('nested.required', null);

      post.save(function(err){
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);

        post.set('nested.required', 'here');
        post.save(function(err){
          db.close();
          assert.ifError(err);
          done();
        });
      });
    })

    it('of nested subdocuments', function(done){
      var Subsubdocs= new Schema({ required: { type: String, required: true }});

      var Subdocs = new Schema({
          required: { type: String, required: true }
        , subs: [Subsubdocs]
      });

      mongoose.model('TestSubdocumentsValidation', new Schema({
          items: [Subdocs]
      }));

      var db = start()
        , TestSubdocumentsValidation = db.model('TestSubdocumentsValidation');

      var post = new TestSubdocumentsValidation();

      post.get('items').push({ required: '', subs: [{required: ''}] });

      post.save(function(err){
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);
        assert.ok(err.errors['items.0.subs.0.required'] instanceof ValidatorError);
        assert.equal(err.errors['items.0.subs.0.required'].message,'Validator "required" failed for path required');
        assert.ok(post.errors['items.0.subs.0.required'] instanceof ValidatorError);
        assert.equal(post.errors['items.0.subs.0.required'].message,'Validator "required" failed for path required');

        assert.ok(!err.errors['items.0.required']);
        assert.ok(!err.errors['items.0.required']);
        assert.ok(!post.errors['items.0.required']);
        assert.ok(!post.errors['items.0.required']);

        post.items[0].subs[0].set('required', true);
        assert.equal(undefined, post._validationError);

        post.save(function(err){
          assert.ok(err);
          assert.ok(err.errors);
          assert.ok(err.errors['items.0.required'] instanceof ValidatorError);
          assert.equal(err.errors['items.0.required'].message,'Validator "required" failed for path required');

          assert.ok(!err.errors['items.0.subs.0.required']);
          assert.ok(!err.errors['items.0.subs.0.required']);
          assert.ok(!post.errors['items.0.subs.0.required']);
          assert.ok(!post.errors['items.0.subs.0.required']);

          post.get('items')[0].set('required', true);
          post.save(function(err){
            db.close();
            assert.ok(!post.errors);
            assert.ifError(err);
            done();
          });
        });
      });
    });

    describe('async', function(){
      it('works', function(done){
        var executed = false;

        function validator(v, fn){
          setTimeout(function () {
            executed = true;
            fn(v !== 'test');
          }, 5);
        };
        mongoose.model('TestAsyncValidation', new Schema({
            async: { type: String, validate: [validator, 'async validator'] }
        }));

        var db = start()
          , TestAsyncValidation = db.model('TestAsyncValidation');

        var post = new TestAsyncValidation();
        post.set('async', 'test');

        post.save(function(err){
          assert.ok(err instanceof MongooseError);
          assert.ok(err instanceof ValidationError);
          assert.ok(err.errors.async instanceof ValidatorError);
          assert.equal(err.errors.async.message,'Validator "async validator" failed for path async');
          assert.equal(true, executed);
          executed = false;

          post.set('async', 'woot');
          post.save(function(err){
            db.close();
            assert.equal(true, executed);
            assert.strictEqual(err, null);
            done();
          });
        });
      })

      it('nested', function(done){
        var executed = false;

        function validator(v, fn){
          setTimeout(function () {
            executed = true;
            fn(v !== 'test');
          }, 5);
        };

        mongoose.model('TestNestedAsyncValidation', new Schema({
            nested: {
                async: { type: String, validate: [validator, 'async validator'] }
            }
        }));

        var db = start()
          , TestNestedAsyncValidation = db.model('TestNestedAsyncValidation');

        var post = new TestNestedAsyncValidation();
        post.set('nested.async', 'test');

        post.save(function(err){
          assert.ok(err instanceof MongooseError);
          assert.ok(err instanceof ValidationError);
          assert.ok(executed);
          executed = false;

          post.validate(function(err){
            assert.ok(err instanceof MongooseError);
            assert.ok(err instanceof ValidationError);
            assert.ok(executed);
            executed = false;

            post.set('nested.async', 'woot');
            post.validate(function(err){
              assert.ok(executed);
              assert.equal(err, null);
              executed = false;

              post.save(function(err){
                db.close();
                assert.ok(executed);
                assert.strictEqual(err, null);
                done();
              });
            });
          });
        });
      });

      it('subdocuments', function(done){
        var executed = false;

        function validator (v, fn) {
          setTimeout(function(){
            executed = true;
            fn(v !== '');
          }, 5);
        };

        var Subdocs = new Schema({
            required: { type: String, validate: [validator, 'async in subdocs'] }
        });

        mongoose.model('TestSubdocumentsAsyncValidation', new Schema({
            items: [Subdocs]
        }));

        var db = start()
          , Test = db.model('TestSubdocumentsAsyncValidation');

        var post = new Test();

        post.get('items').push({ required: '' });

        post.save(function(err){
          assert.ok(err instanceof MongooseError);
          assert.ok(err instanceof ValidationError);
          assert.ok(executed);
          executed = false;

          post.get('items')[0].set({ required: 'here' });
          post.save(function(err){
            db.close();
            assert.ok(executed);
            assert.strictEqual(err, null);
            done();
          });
        });
      });

    });

    it('without saving', function(done){
      mongoose.model('TestCallingValidation', new Schema({
        item: { type: String, required: true }
      }));

      var db = start()
        , TestCallingValidation = db.model('TestCallingValidation');

      var post = new TestCallingValidation;

      assert.equal(true, post.schema.path('item').isRequired);
      assert.strictEqual(post.isNew, true);

      post.validate(function(err){
        assert.ok(err instanceof MongooseError);
        assert.ok(err instanceof ValidationError);
        assert.strictEqual(post.isNew, true);

        post.item = 'yo';
        post.validate(function(err){
          db.close();
          assert.equal(err, null);
          assert.strictEqual(post.isNew, true);
          done();
        });
      });
    });

    it('when required is set to false', function(){
      function validator () {
        return true;
      }

      mongoose.model('TestRequiredFalse', new Schema({
        result: { type: String, validate: [validator, 'chump validator'], required: false }
      }));

      var db = start()
        , TestV = db.model('TestRequiredFalse');

      var post = new TestV;

      db.close();
      assert.equal(false, post.schema.path('result').isRequired);
    })

    describe('middleware', function(){
      it('works', function(done){
        var db = start()
          , ValidationMiddlewareSchema = null
          , Post = null
          , post = null;

        ValidationMiddlewareSchema = new Schema({
          baz: { type: String }
        });

        ValidationMiddlewareSchema.pre('validate', function(next) {
          if (this.get('baz') == 'bad') {
            this.invalidate('baz', 'bad');
          }
          next();
        });

        mongoose.model('ValidationMiddleware', ValidationMiddlewareSchema);

        Post = db.model('ValidationMiddleware');
        post = new Post();
        post.set({baz: 'bad'});

        post.save(function(err){
          assert.ok(err instanceof MongooseError);
          assert.ok(err instanceof ValidationError);
          assert.equal(err.errors.baz.type,'bad');
          assert.equal(err.errors.baz.path,'baz');

          post.set('baz', 'good');
          post.save(function(err){
            db.close();
            assert.strictEqual(err, null);
            done();
          });
        });
      })

      it('async', function(done){
        var db = start()
          , AsyncValidationMiddlewareSchema = null
          , Post = null
          , post = null;

        AsyncValidationMiddlewareSchema = new Schema({
          prop: { type: String }
        });

        AsyncValidationMiddlewareSchema.pre('validate', true, function(next, done) {
          var self = this;
          setTimeout(function() {
            if (self.get('prop') == 'bad') {
              self.invalidate('prop', 'bad');
            }
            done();
          }, 5);
          next();
        });

        mongoose.model('AsyncValidationMiddleware', AsyncValidationMiddlewareSchema);

        Post = db.model('AsyncValidationMiddleware');
        post = new Post();
        post.set({prop: 'bad'});

        post.save(function(err){
          assert.ok(err instanceof MongooseError);
          assert.ok(err instanceof ValidationError);
          assert.equal(err.errors.prop.type,'bad');
          assert.equal(err.errors.prop.path,'prop');

          post.set('prop', 'good');
          post.save(function(err){
            db.close();
            assert.strictEqual(err, null);
            done();
          });
        });
      });

      it('complex', function(done){
        var db = start()
          , ComplexValidationMiddlewareSchema = null
          , Post = null
          , post = null
          , abc = function(v) {
              return v === 'abc';
            };

        ComplexValidationMiddlewareSchema = new Schema({
          baz: { type: String },
          abc: { type: String, validate: [abc, 'must be abc'] },
          test: { type: String, validate: [/test/, 'must also be abc'] },
          required: { type: String, required: true }
        });

        ComplexValidationMiddlewareSchema.pre('validate', true, function(next, done) {
          var self = this;
          setTimeout(function() {
            if (self.get('baz') == 'bad') {
              self.invalidate('baz', 'bad');
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

        post.save(function(err){
          assert.ok(err instanceof MongooseError);
          assert.ok(err instanceof ValidationError);
          assert.equal(4, Object.keys(err.errors).length);
          assert.ok(err.errors.baz instanceof ValidatorError);
          assert.equal(err.errors.baz.type,'bad');
          assert.equal(err.errors.baz.path,'baz');
          assert.ok(err.errors.abc instanceof ValidatorError);
          assert.equal(err.errors.abc.type,'must be abc');
          assert.equal(err.errors.abc.path,'abc');
          assert.ok(err.errors.test instanceof ValidatorError);
          assert.equal(err.errors.test.type,'must also be abc');
          assert.equal(err.errors.test.path,'test');
          assert.ok(err.errors.required instanceof ValidatorError);
          assert.equal(err.errors.required.type,'required');
          assert.equal(err.errors.required.path,'required');

          post.set({
            baz: 'good',
            abc: 'abc',
            test: 'test',
            required: 'here'
          });

          post.save(function(err){
            db.close();
            assert.strictEqual(err, null);
            done();
          });
        });
      })
    })
  });

  describe('defaults application', function(){
    it('works', function(){
      var now = Date.now();

      mongoose.model('TestDefaults', new Schema({
          date: { type: Date, default: now }
      }));

      var db = start()
        , TestDefaults = db.model('TestDefaults');

      db.close();
      var post = new TestDefaults;
      assert.ok(post.get('date') instanceof Date);
      assert.equal(+post.get('date'), now);
    });

    it('nested', function(){
      var now = Date.now();

      mongoose.model('TestNestedDefaults', new Schema({
          nested: {
              date: { type: Date, default: now }
          }
      }));

      var db = start()
        , TestDefaults = db.model('TestNestedDefaults');

      var post = new TestDefaults();
      db.close();
      assert.ok(post.get('nested.date') instanceof Date);
      assert.equal(+post.get('nested.date'), now);
    })

    it('subdocument', function(){
      var now = Date.now();

      var Items = new Schema({
          date: { type: Date, default: now }
      });

      mongoose.model('TestSubdocumentsDefaults', new Schema({
          items: [Items]
      }));

      var db = start()
        , TestSubdocumentsDefaults = db.model('TestSubdocumentsDefaults');

      db.close();
      var post = new TestSubdocumentsDefaults();
      post.get('items').push({});
      assert.ok(post.get('items')[0].get('date') instanceof Date);
      assert.equal(+post.get('items')[0].get('date'), now);
    });

    it('allows nulls', function(done){
      var db = start();
      var T = db.model('NullDefault', new Schema({ name: { type: String, default: null }}), collection);
      var t = new T();

      assert.strictEqual(null, t.name);

      t.save(function (err) {
        assert.ifError(err);

        T.findById(t._id, function (err, t) {
          db.close();
          assert.ifError(err);
          assert.strictEqual(null, t.name);
          done();
        });
      });
    });
  });

  describe('virtuals', function(){
    it('getters', function(){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)
        , post = new BlogPost({
              title: 'Letters from Earth'
            , author: 'Mark Twain'
          });

      db.close();
      assert.equal(post.get('titleWithAuthor'), 'Letters from Earth by Mark Twain');
      assert.equal(post.titleWithAuthor,'Letters from Earth by Mark Twain');
    });

    it('set()', function(){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)
        , post = new BlogPost();

      db.close();
      post.set('titleWithAuthor', 'Huckleberry Finn by Mark Twain')
      assert.equal(post.get('title'),'Huckleberry Finn');
      assert.equal(post.get('author'),'Mark Twain');
    });

    it('should not be saved to the db', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)
        , post = new BlogPost();

      post.set('titleWithAuthor', 'Huckleberry Finn by Mark Twain');

      post.save(function (err) {
        assert.ifError(err);

        BlogPost.findById(post.get('_id'), function (err, found) {
          assert.ifError(err);

          assert.equal(found.get('title'),'Huckleberry Finn');
          assert.equal(found.get('author'),'Mark Twain');
          assert.ok(! ('titleWithAuthor' in found.toObject()));
          db.close();
          done();
        });
      });
    });

    it('nested', function(){
      var db = start()
        , PersonSchema = new Schema({
            name: {
                first: String
              , last: String
            }
          });

      PersonSchema
      .virtual('name.full')
      .get(function () {
        return this.get('name.first') + ' ' + this.get('name.last');
      })
      .set(function (fullName) {
        var split = fullName.split(' ');
        this.set('name.first', split[0]);
        this.set('name.last', split[1]);
      });

      mongoose.model('Person', PersonSchema);

      var Person = db.model('Person')
        , person = new Person({
            name: {
                first: 'Michael'
              , last: 'Sorrentino'
            }
          });

      db.close();

      assert.equal(person.get('name.full'),'Michael Sorrentino');
      person.set('name.full', 'The Situation');
      assert.equal(person.get('name.first'),'The');
      assert.equal(person.get('name.last'),'Situation');

      assert.equal(person.name.full,'The Situation');
      person.name.full = 'Michael Sorrentino';
      assert.equal(person.name.first,'Michael');
      assert.equal(person.name.last,'Sorrentino');
    });
  });

  describe('remove()', function(){
    it('works', function(done){
      var db = start()
        , collection = 'blogposts_' + random()
        , BlogPost = db.model('BlogPost', collection)
        , post = new BlogPost();

      post.save(function (err) {
        assert.ifError(err);

        BlogPost.find({}, function (err, found) {
          assert.ifError(err);
          assert.equal(1, found.length);

          BlogPost.remove({}, function (err) {
            assert.ifError(err);

            BlogPost.find({}, function (err, found2) {
              db.close();
              assert.ifError(err);
              assert.equal(0, found2.length);
              done();
            });
          });
        });
      });
    });
  });

  describe('getters', function(){
    it('with same name on embedded docs do not class', function(){
      var Post = new Schema({
          title   : String
        , author  : { name : String }
        , subject : { name : String }
      });

      mongoose.model('PostWithClashGetters', Post);

      var db = start()
        , PostModel = db.model('PostWithClashGetters', 'postwithclash' + random());

      var post = new PostModel({
          title: 'Test'
        , author: { name: 'A' }
        , subject: { name: 'B' }
      });

      db.close();
      assert.equal(post.author.name,'A');
      assert.equal(post.subject.name,'B');
      assert.equal(post.author.name,'A');
    });

    it('should not be triggered at construction (gh-685)', function(){
      var db = start()
        , called = false

      db.close();

      var schema = new mongoose.Schema({
          number: {
              type:Number
            , set: function(x){return x/2}
            , get: function(x){
                called = true;
                return x*2;
              }
          }
      });

      var A = mongoose.model('gettersShouldNotBeTriggeredAtConstruction', schema);

      var a = new A({ number: 100 });
      assert.equal(false, called);
      var num = a.number;
      assert.equal(true, called);
      assert.equal(100, num.valueOf());
      assert.equal(50, a.getValue('number').valueOf());

      called = false;
      var b = new A;
      b.init({ number: 50 });
      assert.equal(false, called);
      num = b.number;
      assert.equal(true, called);
      assert.equal(100, num.valueOf());
      assert.equal(50, b.getValue('number').valueOf());
    })

    it('with type defined with { type: Native } (gh-190)', function(){
      var schema = new Schema({
          date: { type: Date }
      });

      mongoose.model('ShortcutGetterObject', schema);

      var db = start()
        , ShortcutGetter = db.model('ShortcutGetterObject', 'shortcut' + random())
        , post = new ShortcutGetter();

      db.close();
      post.set('date', Date.now());
      assert.ok(post.date instanceof Date);
    });

    describe('nested', function(){
      it('works', function(){
        var schema = new Schema({
          first: {
            second: [Number]
          }
        });
        mongoose.model('ShortcutGetterNested', schema);

        var db = start()
          , ShortcutGetterNested = db.model('ShortcutGetterNested', collection)
          , doc = new ShortcutGetterNested();

        db.close();
        assert.equal('object', typeof doc.first);
        assert.ok(doc.first.second instanceof MongooseArray);
      });

      it('works with object literals', function(){
        var db = start()
          , BlogPost = db.model('BlogPost', collection);

        db.close();
        var date = new Date;

        var meta = {
            date: date
          , visitors: 5
        };

        var post = new BlogPost()
        post.init({
            meta: meta
        });

        assert.ok(post.get('meta').date instanceof Date);
        assert.ok(post.meta.date instanceof Date);

        var threw = false;
        var getter1;
        var getter2;
        var strmet;
        try {
          strmet = JSON.stringify(meta);
          getter1 = JSON.stringify(post.get('meta'));
          getter2 = JSON.stringify(post.meta);
        } catch (err) {
          threw = true;
        }

        assert.equal(false, threw);
        getter1 = JSON.parse(getter1);
        getter2 = JSON.parse(getter2);
        assert.equal(getter1.visitors, getter2.visitors);
        assert.equal(getter1.date, getter2.date);

        post.meta.date = new Date - 1000;
        assert.ok(post.meta.date instanceof Date);
        assert.ok(post.get('meta').date instanceof Date);

        post.meta.visitors = 2;
        assert.equal('number', typeof post.get('meta').visitors);
        assert.equal('number', typeof post.meta.visitors);

        var newmeta = {
            date: date - 2000
          , visitors: 234
        };

        post.set(newmeta, 'meta');

        assert.ok(post.meta.date instanceof Date);
        assert.ok(post.get('meta').date instanceof Date);
        assert.equal('number', typeof post.meta.visitors);
        assert.equal('number', typeof post.get('meta').visitors);
        assert.equal((+post.meta.date),date - 2000);
        assert.equal((+post.get('meta').date),date - 2000);
        assert.equal((+post.meta.visitors),234);
        assert.equal((+post.get('meta').visitors),234);

        // set object directly
        post.meta = {
            date: date - 3000
          , visitors: 4815162342
        };

        assert.ok(post.meta.date instanceof Date);
        assert.ok(post.get('meta').date instanceof Date);
        assert.equal('number', typeof post.meta.visitors);
        assert.equal('number', typeof post.get('meta').visitors);
        assert.equal((+post.meta.date),date - 3000);
        assert.equal((+post.get('meta').date),date - 3000);
        assert.equal((+post.meta.visitors),4815162342);
        assert.equal((+post.get('meta').visitors),4815162342);
      })

      it('object property access works when root initd with null', function(done){
        var db = start()

        var schema = new Schema({
          nest: {
            st: String
          }
        });

        mongoose.model('NestedStringA', schema);
        var T = db.model('NestedStringA', collection);

        var t = new T({ nest: null });

        assert.strictEqual(t.nest.st, undefined);
        t.nest = { st: "jsconf rules" };
        assert.deepEqual(t.nest.toObject(),{ st: "jsconf rules" });
        assert.equal(t.nest.st,"jsconf rules");

        t.save(function (err) {
          db.close();
          assert.ifError(err);
          done();
        });
      });

      it('object property access works when root initd with undefined', function(done){
        var db = start()

        var schema = new Schema({
          nest: {
            st: String
          }
        });

        mongoose.model('NestedStringB', schema);
        var T = db.model('NestedStringB', collection);

        var t = new T({ nest: undefined });

        assert.strictEqual(t.nest.st, undefined);
        t.nest = { st: "jsconf rules" };
        assert.deepEqual(t.nest.toObject(),{ st: "jsconf rules" });
        assert.equal(t.nest.st,"jsconf rules");

        t.save(function (err) {
          db.close();
          assert.ifError(err);
          done();
        })
      });

      it('pre-existing null object re-save', function(done){
        var db = start()

        var schema = new Schema({
          nest: {
              st: String
            , yep: String
          }
        });

        mongoose.model('NestedStringC', schema);
        var T = db.model('NestedStringC', collection);

        var t = new T({ nest: null });

        t.save(function (err) {
          assert.ifError(err);

          t.nest = { st: "jsconf rules", yep: "it does" };

          // check that entire `nest` object is being $set
          var u = t._delta()[1];
          assert.ok(u.$set);
          assert.ok(u.$set.nest);
          assert.equal(2, Object.keys(u.$set.nest).length);
          assert.ok(u.$set.nest.yep);
          assert.ok(u.$set.nest.st);

          t.save(function (err) {
            assert.ifError(err);

            T.findById(t.id, function (err, t) {
              assert.ifError(err);
              assert.equal(t.nest.st,"jsconf rules");
              assert.equal(t.nest.yep,"it does");

              t.nest = null;
              t.save(function (err) {
                db.close();
                assert.ifError(err);
                assert.strictEqual(t._doc.nest, null);
                done();
              });
            });
          });
        });
      });

      it('array of Mixed on existing doc can be pushed to', function(done){
        var db = start();

        mongoose.model('MySchema', new Schema({
          nested: {
            arrays: []
          }
        }));

        var DooDad = db.model('MySchema')
          , doodad = new DooDad({ nested: { arrays: [] } })
          , date = 1234567890;

        doodad.nested.arrays.push(["+10", "yup", date]);

        doodad.save(function (err) {
          assert.ifError(err);

          DooDad.findById(doodad._id, function (err, doodad) {
            assert.ifError(err);

            assert.deepEqual(doodad.nested.arrays.toObject(), [['+10','yup',date]]);

            doodad.nested.arrays.push(["another", 1]);

            doodad.save(function (err) {
              assert.ifError(err);

              DooDad.findById(doodad._id, function (err, doodad) {
                db.close();
                assert.ifError(err);
                assert.deepEqual(doodad.nested.arrays.toObject(), [['+10','yup',date], ["another", 1]]);
                done();
              });
            });
          });
        });
      })

      it('props can be set directly when property was named "type"', function(done){
        var db = start();

        function def () {
          return [{ x: 1 }, { x: 2 }, { x:3 }]
        }

        mongoose.model('MySchema2', new Schema({
          nested: {
              type: { type: String, default: 'yep' }
            , array: {
                type: Array, default: def
              }
          }
        }));

        var DooDad = db.model('MySchema2', collection)
          , doodad = new DooDad()

        doodad.save(function (err) {
          assert.ifError(err);

          DooDad.findById(doodad._id, function (err, doodad) {
            assert.ifError(err);

            assert.equal(doodad.nested.type,"yep");
            assert.deepEqual(doodad.nested.array.toObject(), [{x:1},{x:2},{x:3}]);

            doodad.nested.type = "nope";
            doodad.nested.array = ["some", "new", "stuff"];

            doodad.save(function (err) {
              assert.ifError(err);

              DooDad.findById(doodad._id, function (err, doodad) {
                db.close();
                assert.ifError(err);
                assert.equal(doodad.nested.type,"nope");
                assert.deepEqual(doodad.nested.array.toObject(), ["some", "new", "stuff"]);
                done();
              });
            });
          })
        });
      });

    });
  });

  describe('setters', function(){
    it('are used on embedded docs (gh-365 gh-390 gh-422)', function(done){
      var db = start();

      function setLat (val) {
        return parseInt(val);
      }

      var tick = 0;
      function uptick () {
        return ++tick;
      }

      var Location = new Schema({
          lat:  { type: Number, default: 0, set: setLat}
        , long: { type: Number, set: uptick }
      });

      var Deal = new Schema({
          title: String
        , locations: [Location]
      });

      Location = db.model('Location', Location, 'locations_' + random());
      Deal = db.model('Deal', Deal, 'deals_' + random());

      var location = new Location({lat: 1.2, long: 10});
      assert.equal(location.lat.valueOf(),1);
      assert.equal(location.long.valueOf(),1);

      var deal = new Deal({title: "My deal", locations: [{lat: 1.2, long: 33}]});
      assert.equal(deal.locations[0].lat.valueOf(),1);
      assert.equal(deal.locations[0].long.valueOf(),2);

      deal.save(function (err) {
        assert.ifError(err);
        Deal.findById(deal._id, function (err, deal) {
          db.close();
          assert.ifError(err);
          assert.equal(deal.locations[0].lat.valueOf(),1);
          // GH-422
          assert.equal(deal.locations[0].long.valueOf(),2);
          done();
        });
      });
    });
  });

  it('changing a number non-atomically (gh-203)', function(done){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();

    post.meta.visitors = 5;

    post.save(function (err) {
      assert.ifError(err);

      BlogPost.findById(post._id, function (err, doc) {
        assert.ifError(err);

        doc.meta.visitors -= 2;

        doc.save(function (err) {
          assert.ifError(err);

          BlogPost.findById(post._id, function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.equal(3, +doc.meta.visitors);
            done();
          });
        });
      });
    });
  })

  describe('atomic subdocument', function(){
    it('saving', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)
        , totalDocs = 4
        , saveQueue = [];

      var post = new BlogPost;

      post.save(function(err){
        assert.ifError(err);

        BlogPost.findOne({ _id: post.get('_id') }, function(err, doc){
          assert.ifError(err);
          doc.get('comments').push({ title: '1' });
          save(doc);
        });

        BlogPost.findOne({ _id: post.get('_id') }, function(err, doc){
          assert.ifError(err);
          doc.get('comments').push({ title: '2' });
          save(doc);
        });

        BlogPost.findOne({ _id: post.get('_id') }, function(err, doc){
          assert.ifError(err);
          doc.get('comments').push({ title: '3' });
          save(doc);
        });

        BlogPost.findOne({ _id: post.get('_id') }, function(err, doc){
          assert.ifError(err);
          doc.get('comments').push({ title: '4' }, { title: '5' });
          save(doc);
        });

        function save(doc) {
          saveQueue.push(doc);
          if (saveQueue.length == 4) {
            saveQueue.forEach(function (doc) {
              doc.save(function (err) {
                assert.ifError(err);
                --totalDocs || complete();
              });
            });
          }
        };

        function complete () {
          BlogPost.findOne({ _id: post.get('_id') }, function (err, doc) {
            db.close();

            assert.ifError(err);
            assert.equal(doc.get('comments').length,5);

            var v = doc.get('comments').some(function(comment){
              return comment.get('title') == '1';
            });

            assert.ok(v);

            v = doc.get('comments').some(function(comment){
              return comment.get('title') == '2';
            });

            assert.ok(v);

            v = doc.get('comments').some(function(comment){
              return comment.get('title') == '3';
            })

            assert.ok(v);

            v = doc.get('comments').some(function(comment){
              return comment.get('title') == '4';
            });

            assert.ok(v);

            v = doc.get('comments').some(function(comment){
              return comment.get('title') == '5';
            });

            assert.ok(v);
            done();
          });
        };
      });
    })

    it('setting (gh-310)', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)

      BlogPost.create({
        comments: [{ title: 'first-title', body: 'first-body'}]
      }, function (err, blog) {
        assert.ifError(err);
        BlogPost.findById(blog.id, function (err, agent1blog) {
          assert.ifError(err);
          BlogPost.findById(blog.id, function (err, agent2blog) {
            assert.ifError(err);
            agent1blog.get('comments')[0].title = 'second-title';
            agent1blog.save( function (err) {
              assert.ifError(err);
              agent2blog.get('comments')[0].body = 'second-body';
              agent2blog.save( function (err) {
                assert.ifError(err);
                BlogPost.findById(blog.id, function (err, foundBlog) {
                  assert.ifError(err);
                  db.close();
                  var comment = foundBlog.get('comments')[0];
                  assert.equal(comment.title,'second-title');
                  assert.equal(comment.body,'second-body');
                  done();
                });
              });
            });
          });
        });
      });
    })
  });

  it('doubly nested array saving and loading', function(done){
    var Inner = new Schema({
        arr: [Number]
    });

    var Outer = new Schema({
        inner: [Inner]
    });
    mongoose.model('Outer', Outer);

    var db = start();
    var Outer = db.model('Outer', 'arr_test_' + random());

    var outer = new Outer();
    outer.inner.push({});
    outer.save(function(err) {
      assert.ifError(err);
      assert.ok(outer.get('_id') instanceof DocumentObjectId);

      Outer.findById(outer.get('_id'), function(err, found) {
        assert.ifError(err);
        assert.equal(1, found.inner.length);
        found.inner[0].arr.push(5);
        found.save(function(err) {
          assert.ifError(err);
          assert.ok(found.get('_id') instanceof DocumentObjectId);
          Outer.findById(found.get('_id'), function(err, found2) {
            db.close();
            assert.ifError(err);
            assert.equal(1, found2.inner.length);
            assert.equal(1, found2.inner[0].arr.length);
            assert.equal(5, found2.inner[0].arr[0]);
            done();
          });
        });
      });
    });
  });

  it('updating multiple Number $pushes as a single $pushAll', function(done){
    var db = start()
      , schema = new Schema({
          nested: {
            nums: [Number]
          }
        });

    mongoose.model('NestedPushes', schema);
    var Temp = db.model('NestedPushes', collection);

    Temp.create({}, function (err, t) {
      assert.ifError(err);
      t.nested.nums.push(1);
      t.nested.nums.push(2);

      assert.equal(t.nested.nums.length,2);

      t.save(function (err) {
        assert.ifError(err);
        assert.equal(t.nested.nums.length,2);
        Temp.findById(t._id, function (err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(t.nested.nums.length,2);
          done();
        });
      });
    });
  })

  it('updating at least a single $push and $pushAll as a single $pushAll', function(done){
    var db = start()
      , schema = new Schema({
          nested: {
            nums: [Number]
          }
        });

    mongoose.model('NestedPushes', schema);
    var Temp = db.model('NestedPushes', collection);

    Temp.create({}, function (err, t) {
      assert.ifError(err);
      t.nested.nums.push(1);
      t.nested.nums.push(2, 3);
      assert.equal(3, t.nested.nums.length);

      t.save(function (err) {
        assert.ifError(err);
        assert.equal(t.nested.nums.length, 3);
        Temp.findById(t._id, function (err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(found.nested.nums.length, 3);
          done();
        });
      });
    });
  });

  it('activePaths should be updated for nested modifieds', function(done){
    var db = start()
      , schema = new Schema({
          nested: {
            nums: [Number]
          }
        });

    mongoose.model('NestedPushes', schema);
    var Temp = db.model('NestedPushes', collection);

    Temp.create({nested: {nums: [1, 2, 3, 4, 5]}}, function (err, t) {
      assert.ifError(err);
      t.nested.nums.pull(1);
      t.nested.nums.pull(2);
      assert.equal(t._activePaths.paths['nested.nums'],'modify');
      db.close();
      done();
    });
  })

  it('$pull should affect what you see in an array before a save', function(done){
    var db = start()
      , schema = new Schema({
          nested: {
            nums: [Number]
          }
        });

    mongoose.model('NestedPushes', schema);
    var Temp = db.model('NestedPushes', collection);

    Temp.create({nested: {nums: [1, 2, 3, 4, 5]}}, function (err, t) {
      assert.ifError(err);
      t.nested.nums.pull(1);
      assert.equal(4, t.nested.nums.length);
      db.close();
      done();
    });
  });

  it('$shift', function(done){
    var db = start()
      , schema = new Schema({
          nested: {
            nums: [Number]
          }
        });

    mongoose.model('TestingShift', schema);
    var Temp = db.model('TestingShift', collection);

    Temp.create({ nested: { nums: [1,2,3] }}, function (err, t) {
      assert.ifError(err);

      Temp.findById(t._id, function (err, found) {
        assert.ifError(err);
        assert.equal(found.nested.nums.length, 3);
        found.nested.nums.$pop();
        assert.equal(found.nested.nums.length, 2);
        assert.equal(found.nested.nums[0],1);
        assert.equal(found.nested.nums[1],2);

        found.save(function (err) {
          assert.ifError(err);
          Temp.findById(t._id, function (err, found) {
            assert.ifError(err);
            assert.equal(2, found.nested.nums.length);
            assert.equal(1, found.nested.nums[0],1);
            assert.equal(2, found.nested.nums[1],2);
            found.nested.nums.$shift();
            assert.equal(1, found.nested.nums.length);
            assert.equal(found.nested.nums[0],2);

            found.save(function (err) {
              assert.ifError(err);
              Temp.findById(t._id, function (err, found) {
                db.close();
                assert.ifError(err);
                assert.equal(found.nested.nums.length,1);
                assert.equal(found.nested.nums[0],2);
                done();
              });
            });
          });
        });
      });
    });
  })

  describe('saving embedded arrays', function(){
    it('of Numbers atomically', function(done){
      var db = start()
        , TempSchema = new Schema({
            nums: [Number]
          })
        , totalDocs = 2
        , saveQueue = [];

      mongoose.model('Temp', TempSchema);
      var Temp = db.model('Temp', collection);

      var t = new Temp();

      t.save(function(err){
        assert.ifError(err);

        Temp.findOne({ _id: t.get('_id') }, function(err, doc){
          assert.ifError(err);
          doc.get('nums').push(1);
          save(doc);
        });

        Temp.findOne({ _id: t.get('_id') }, function(err, doc){
          assert.ifError(err);
          doc.get('nums').push(2, 3);
          save(doc);
        });

        function save(doc) {
          saveQueue.push(doc);
          if (saveQueue.length == totalDocs) {
            saveQueue.forEach(function (doc) {
              doc.save(function (err) {
                assert.ifError(err);
                --totalDocs || complete();
              });
            });
          }
        };

        function complete () {
          Temp.findOne({ _id: t.get('_id') }, function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.equal(3, doc.get('nums').length);

            var v = doc.get('nums').some(function(num){
              return num.valueOf() == '1';
            });
            assert.ok(v);

            v = doc.get('nums').some(function(num){
              return num.valueOf() == '2';
            });
            assert.ok(v);

            v = doc.get('nums').some(function(num){
              return num.valueOf() == '3';
            });
            assert.ok(v);
            done()
          });
        };
      });
    })

    it('of Strings atomically', function(done){
      var db = start()
        , StrListSchema = new Schema({
            strings: [String]
          })
        , totalDocs = 2
        , saveQueue = [];

      mongoose.model('StrList', StrListSchema);
      var StrList = db.model('StrList');

      var t = new StrList();

      t.save(function(err){
        assert.ifError(err);

        StrList.findOne({ _id: t.get('_id') }, function(err, doc){
          assert.ifError(err);
          doc.get('strings').push('a');
          save(doc);
        });

        StrList.findOne({ _id: t.get('_id') }, function(err, doc){
          assert.ifError(err);
          doc.get('strings').push('b', 'c');
          save(doc);
        });


        function save(doc) {
          saveQueue.push(doc);
          if (saveQueue.length == totalDocs) {
            saveQueue.forEach(function (doc) {
              doc.save(function (err) {
                assert.ifError(err);
                --totalDocs || complete();
              });
            });
          }
        };

        function complete () {
          StrList.findOne({ _id: t.get('_id') }, function (err, doc) {
            db.close();
            assert.ifError(err);

            assert.equal(3, doc.get('strings').length);

            var v = doc.get('strings').some(function(str){
              return str == 'a';
            });
            assert.ok(v);

            v = doc.get('strings').some(function(str){
              return str == 'b';
            });
            assert.ok(v);

            v = doc.get('strings').some(function(str){
              return str == 'c';
            });
            assert.ok(v);
            done();
          });
        };
      });
    })

    it('of Buffers atomically', function(done){
      var db = start()
        , BufListSchema = new Schema({
            buffers: [Buffer]
          })
        , totalDocs = 2
        , saveQueue = [];

      mongoose.model('BufList', BufListSchema);
      var BufList = db.model('BufList');

      var t = new BufList();

      t.save(function(err){
        assert.ifError(err);

        BufList.findOne({ _id: t.get('_id') }, function(err, doc){
          assert.ifError(err);
          doc.get('buffers').push(new Buffer([140]));
          save(doc);
        });

        BufList.findOne({ _id: t.get('_id') }, function(err, doc){
          assert.ifError(err);
          doc.get('buffers').push(new Buffer([141]), new Buffer([142]));
          save(doc);
        });

        function save(doc) {
          saveQueue.push(doc);
          if (saveQueue.length == totalDocs) {
            saveQueue.forEach(function (doc) {
              doc.save(function (err) {
                assert.ifError(err);
                --totalDocs || complete();
              });
            });
          }
        };

        function complete () {
          BufList.findOne({ _id: t.get('_id') }, function (err, doc) {
            db.close();
            assert.ifError(err);

            assert.equal(3, doc.get('buffers').length);

            var v = doc.get('buffers').some(function(buf){
              return buf[0] == 140;
            });
            assert.ok(v);

            v  = doc.get('buffers').some(function(buf){
              return buf[0] == 141;
            });
            assert.ok(v);

            v = doc.get('buffers').some(function(buf){
              return buf[0] == 142;
            });
            assert.ok(v);

            done();
          });
        };
      });
    })

    it('works with modified element properties + doc removal (gh-975)', function(done){
      var db = start()
        , B = db.model('BlogPost', collection)
        , b = new B({ comments: [{ title: 'gh-975' }] });

      b.save(function (err) {
        assert.ifError(err);

        b.comments[0].title = 'changed';
        b.save(function (err) {
          assert.ifError(err);

          b.comments[0].remove();
          b.save(function (err) {
            assert.ifError(err);
            db.close();
            done();
          })
        });
      })
    })

    it('updating an embedded document in an embedded array with set call', function(done) {
      var db = start(),
        BlogPost = db.model('BlogPost', collection);

      BlogPost.create({
        comments: [{
          title: 'before-change'
        }]
      }, function(err, post) {
        assert.ifError(err);
        BlogPost.findById(post._id, function(err, found) {
          assert.ifError(err);
          assert.equal('before-change', found.comments[0].title);
          var subDoc = [{
            _id: found.comments[0]._id,
            title: 'after-change'
          }];
          found.set('comments', subDoc);

          found.save(function(err) {
            assert.ifError(err);
            BlogPost.findById(found._id, function(err, updated) {
              db.close();
              assert.ifError(err);
              assert.equal('after-change', updated.comments[0].title);
              done();
            });
          });
        });
      });
    });
  });

  it('updating an embedded document in an embedded array (gh-255)', function(done){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    BlogPost.create({comments: [{title: 'woot'}]}, function (err, post) {
      assert.ifError(err);
      BlogPost.findById(post._id, function (err, found) {
        assert.ifError(err);
        assert.equal('woot', found.comments[0].title);
        found.comments[0].title = 'notwoot';
        found.save( function (err) {
          assert.ifError(err);
          BlogPost.findById(found._id, function (err, updated) {
            db.close();
            assert.ifError(err);
            assert.equal('notwoot', updated.comments[0].title);
            done();
          });
        });
      });
    });
  })

  it('updating an embedded array document to an Object value (gh-334)', function(done){
    var db = start()
      , SubSchema = new Schema({ 
          name : String , 
          subObj : { subName : String } 
        });
    var GH334Schema = new Schema ({ name : String , arrData : [ SubSchema] });

    mongoose.model('GH334' , GH334Schema);
    var AModel = db.model('GH334');
    var instance = new AModel();

    instance.set( { name : 'name-value' , arrData : [ { name : 'arrName1' , subObj : { subName : 'subName1' } } ] });
    instance.save(function(err) {
      assert.ifError(err);
      AModel.findById(instance.id, function(err, doc)  {
        assert.ifError(err);
        doc.arrData[0].set('subObj', { subName : 'modified subName' });
        doc.save(function (err) {
          assert.ifError(err);
          AModel.findById(instance.id, function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.equal(doc.arrData[0].subObj.subName,'modified subName');
            done();
          });
        });
      });
    });
  })

  it('saving an embedded document twice should not push that doc onto the parent doc twice (gh-267)', function(done){
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , post = new BlogPost();

    post.comments.push({title: 'woot'});
    post.save( function (err) {
      assert.ifError(err);
      assert.equal(1, post.comments.length);
      BlogPost.findById(post.id, function (err, found) {
        assert.ifError(err);
        assert.equal(1, found.comments.length);
        post.save( function (err) {
          assert.ifError(err);
          assert.equal(1, post.comments.length);
          BlogPost.findById(post.id, function (err, found) {
            db.close();
            assert.ifError(err);
            assert.equal(1, found.comments.length);
            done();
          });
        });
      });
    });
  })

  describe('embedded array filtering', function(){
    it('by the id shortcut function', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost();

      post.comments.push({ title: 'woot' });
      post.comments.push({ title: 'aaaa' });

      var subdoc1 = post.comments[0];
      var subdoc2 = post.comments[1];

      post.save(function (err) {
        assert.ifError(err);

        BlogPost.findById(post.get('_id'), function (err, doc) {
          db.close();
          assert.ifError(err);

          // test with an objectid
          assert.equal(doc.comments.id(subdoc1.get('_id')).title,'woot');

          // test with a string
          var id = DocumentObjectId.toString(subdoc2._id);
          assert.equal(doc.comments.id(id).title,'aaaa');
          done();
        });
      });
    });

    it('by the id with cast error', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost();

      post.save(function (err) {
        assert.ifError(err);

        BlogPost.findById(post.get('_id'), function (err, doc) {
          db.close();
          assert.ifError(err);
          assert.strictEqual(doc.comments.id(null), null);
          done();
        });
      });
    })

    it('by the id shortcut with no match', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost();

      post.save(function (err) {
        assert.ifError(err);

        BlogPost.findById(post.get('_id'), function (err, doc) {
          db.close();
          assert.ifError(err);
          assert.strictEqual(doc.comments.id(new DocumentObjectId), null);
          done();
        });
      });
    });
  });

  it('removing a subdocument atomically', function(done){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.title = 'hahaha';
    post.comments.push({ title: 'woot' });
    post.comments.push({ title: 'aaaa' });

    post.save(function (err) {
      assert.ifError(err);

      BlogPost.findById(post.get('_id'), function (err, doc) {
        assert.ifError(err);

        doc.comments[0].remove();
        doc.save(function (err) {
          assert.ifError(err);

          BlogPost.findById(post.get('_id'), function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.equal(1, doc.comments.length);
            assert.equal(doc.comments[0].title,'aaaa');
            done();
          });
        });
      });
    });
  })

  it('single pull embedded doc', function(done){
    var db = start()
    , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.title = 'hahaha';
    post.comments.push({ title: 'woot' });
    post.comments.push({ title: 'aaaa' });

    post.save(function (err) {
      assert.ifError(err);

      BlogPost.findById(post.get('_id'), function (err, doc) {
        assert.ifError(err);

        doc.comments.pull(doc.comments[0]);
        doc.comments.pull(doc.comments[0]);
        doc.save(function (err) {
          assert.ifError(err);

          BlogPost.findById(post.get('_id'), function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.equal(0, doc.comments.length);
            done();
          });
        });
      });
    });
  });

  it('saving mixed data', function(done){
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , count = 3;

    // string
    var post = new BlogPost();
    post.mixed = 'woot';
    post.save(function (err) {
      assert.ifError(err);

      BlogPost.findById(post._id, function (err) {
        assert.ifError(err);
        if (--count) return;
        db.close();
        done();
      });
    });

    // array
    var post2 = new BlogPost();
    post2.mixed = { name: "mr bungle", arr: [] };
    post2.save(function (err) {
      assert.ifError(err);

      BlogPost.findById(post2._id, function (err, doc){
        assert.ifError(err);

        assert.equal(true, Array.isArray(doc.mixed.arr));

        doc.mixed = [{foo: 'bar'}];
        doc.save(function (err) {
          assert.ifError(err);

          BlogPost.findById(doc._id, function (err, doc){
            assert.ifError(err);

            assert.equal(true, Array.isArray(doc.mixed));
            doc.mixed.push({ hello: 'world' });
            doc.mixed.push([ 'foo', 'bar' ]);
            doc.markModified('mixed');

            doc.save(function (err, doc) {
              assert.ifError(err);

              BlogPost.findById(post2._id, function (err, doc) {
                assert.ifError(err);

                assert.deepEqual(doc.mixed[0],{ foo: 'bar' });
                assert.deepEqual(doc.mixed[1],{ hello: 'world' });
                assert.deepEqual(doc.mixed[2],['foo','bar']);
                if (--count) return;
                db.close();
                done();
              });
            });
          });

          // date
          var post3 = new BlogPost();
          post3.mixed = new Date;
          post3.save(function (err) {
            assert.ifError(err);

            BlogPost.findById(post3._id, function (err, doc) {
              assert.ifError(err);
              assert.ok(doc.mixed instanceof Date);
              if (--count) return;
              db.close();
              done();
            });
          });
        });
      });
    });
  });

  it('populating mixed data from the constructor (gh-200)', function(){
    var db = start()
      , BlogPost = db.model('BlogPost');

    var post = new BlogPost({
      mixed: {
          type: 'test'
        , github: 'rules'
        , nested: {
              number: 3
          }
      }
    });

    db.close();
    assert.equal('test', post.mixed.type);
    assert.equal('rules', post.mixed.github);
    assert.equal(3, post.mixed.nested.number);
  })

  it('"type" is allowed as a key', function(done){
    mongoose.model('TestTypeDefaults', new Schema({
        type: { type: String, default: 'YES!' }
    }));

    var db = start()
      , TestDefaults = db.model('TestTypeDefaults');

    var post = new TestDefaults();
    assert.equal(typeof post.get('type'),'string');
    assert.equal(post.get('type'),'YES!');

    // GH-402
    var TestDefaults2 = db.model('TestTypeDefaults2', new Schema({
        x: { y: { type: { type: String }, owner: String } }
    }));

    var post = new TestDefaults2;
    post.x.y.type = "#402";
    post.x.y.owner= "me";
    post.save(function (err) {
      db.close();
      assert.ifError(err);
      done();
    });
  })

  it('unaltered model does not clear the doc (gh-195)', function(done){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.title = 'woot';
    post.save(function (err) {
      assert.ifError(err);

      BlogPost.findById(post._id, function (err, doc) {
        assert.ifError(err);

        // we deliberately make no alterations
        doc.save(function (err) {
          assert.ifError(err);

          BlogPost.findById(doc._id, function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.equal(doc.title,'woot');
            done();
          });
        });
      });
    });
  });

  describe('safe mode', function(){
    it('works', function(done){
      var Human = new Schema({
          name  : String
        , email : { type: String, index: { unique: true, background: false }}
      });

      mongoose.model('SafeHuman', Human, true);

      var db = start()
        , Human = db.model('SafeHuman', 'safehuman' + random());

      Human.on('index', function (err) {
        assert.ifError(err);
        var me = new Human({
            name  : 'Guillermo Rauch'
          , email : 'rauchg@gmail.com'
        });

        me.save(function (err) {
          assert.ifError(err);

          Human.findById(me._id, function (err, doc){
            assert.ifError(err);
            assert.equal(doc.email,'rauchg@gmail.com');

            var copycat = new Human({
                name  : 'Lionel Messi'
              , email : 'rauchg@gmail.com'
            });

            copycat.save(function (err) {
              db.close();
              assert.ok(/duplicate/.test(err.message));
              assert.ok(err instanceof Error);
              done();
            });
          });
        });
      });

    });

    it('can be disabled', function(done){
      var Human = new Schema({
          name  : String
        , email : { type: String, index: { unique: true, background: false }}
      });

      // turn it off
      Human.set('safe', false);

      mongoose.model('UnsafeHuman', Human, true);

      var db = start()
        , Human = db.model('UnsafeHuman', 'unsafehuman' + random());

      Human.on('index', function (err) {
        assert.ifError(err);
      });

      var me = new Human({
          name  : 'Guillermo Rauch'
        , email : 'rauchg@gmail.com'
      });

      me.save(function (err) {
        assert.ifError(err);

        Human.findById(me._id, function (err, doc){
          assert.ifError(err);
          assert.equal(doc.email,'rauchg@gmail.com');

          var copycat = new Human({
              name  : 'Lionel Messi'
            , email : 'rauchg@gmail.com'
          });

          copycat.save(function (err) {
            db.close();
            assert.ifError(err);
            done();
          });
        });
      });
    });
  });

  describe('hooks', function(){
    describe('pre', function(){
      it('with undefined and null', function(done){
        var db = start();
        var schema = new Schema({ name: String });
        var called = 0;

        schema.pre('save', function (next) {
          called++;
          next(undefined);
        });

        schema.pre('save', function (next) {
          called++;
          next(null);
        });

        var S = db.model('S', schema, collection);
        var s = new S({name: 'zupa'});

        s.save(function (err) {
          db.close();
          assert.ifError(err);
          assert.equal(2, called);
          done();
        });
      });

      it('called on all sub levels', function(done){
        var db = start();

        var grandSchema = new Schema({ name : String });
        grandSchema.pre('save', function (next) {
          this.name = 'grand';
          next();
        });

        var childSchema = new Schema({ name : String, grand : [grandSchema]});
        childSchema.pre('save', function (next) {
          this.name = 'child';
          next();
        });

        var schema = new Schema({ name: String, child : [childSchema] });

        schema.pre('save', function (next) {
          this.name = 'parent';
          next();
        });

        var S = db.model('presave_hook', schema, 'presave_hook');
        var s = new S({ name : 'a' , child : [ { name : 'b', grand : [{ name : 'c'}] } ]});

        s.save(function (err, doc) {
          db.close();
          assert.ifError(err);
          assert.equal(doc.name,'parent');
          assert.equal(doc.child[0].name,'child');
          assert.equal(doc.child[0].grand[0].name,'grand');
          done();
        });
      });

      it('error on any sub level', function(done){
        var db = start();

        var grandSchema = new Schema({ name : String });
        grandSchema.pre('save', function (next) {
          next(new Error('Error 101'));
        });

        var childSchema = new Schema({ name : String, grand : [grandSchema]});
        childSchema.pre('save', function (next) {
          this.name = 'child';
          next();
        });

        var schema = new Schema({ name: String, child : [childSchema] });
        schema.pre('save', function (next) {
          this.name = 'parent';
          next();
        });

        var S = db.model('presave_hook_error', schema, 'presave_hook_error');
        var s = new S({ name : 'a' , child : [ { name : 'b', grand : [{ name : 'c'}] } ]});

        s.save(function (err, doc) {
          db.close();
          assert.ok(err instanceof Error);
          assert.equal(err.message,'Error 101');
          done();
        });
      })

      describe('init', function(){
        it('has access to the true ObjectId when used with querying (gh-289)', function(done){
          var db = start()
            , PreInitSchema = new Schema({})
            , preId = null

          PreInitSchema.pre('init', function (next) {
            preId = this._id;
            next();
          });

          var PreInit = db.model('PreInit', PreInitSchema, 'pre_inits' + random());

          var doc = new PreInit();
          doc.save(function (err) {
            assert.ifError(err);
            PreInit.findById(doc._id, function (err, found) {
              db.close();
              assert.ifError(err);
              assert.strictEqual(undefined, preId);
              done();
            });
          });
        })
      })

      it('should not work when calling next() after a thrown error', function(){
        var db = start();

        var s = new Schema({});
        s.methods.funky = function () {
          assert.strictEqual(false, true, 'reached unreachable code');
        }

        s.pre('funky', function (next) {
          db.close();
          try {
            next(new Error);
          } catch (error) {
            // throws b/c nothing is listening to the db error event
            assert.ok(error instanceof Error);
            next();
          }
        });
        var Kaboom = db.model('wowNext2xAndThrow', s, 'next2xAndThrow' + random());
        new Kaboom().funky();
      });

    });

    describe('post', function(){
      it('works', function(done){
        var schema = new Schema({
                title: String
            })
          , save = false
          , remove = false
          , init = false
          , post = undefined;

        schema.post('save', function (arg) {
          assert.equal(arg.id,post.id)
          save = true;
        });

        schema.post('init', function () {
          init = true;
        });

        schema.post('remove', function (arg) {
          assert.equal(arg.id,post.id)
          remove = true;
        });

        mongoose.model('PostHookTest', schema);

        var db = start()
          , BlogPost = db.model('PostHookTest');

        post = new BlogPost();

        post.save(function (err) {
          process.nextTick(function () {
            assert.ifError(err);
            assert.ok(save);
            BlogPost.findById(post._id, function (err, doc) {
              process.nextTick(function () {
                assert.ifError(err);
                assert.ok(init);

                doc.remove(function (err) {
                  process.nextTick(function () {
                    db.close();
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

      it('on embedded docs', function(done){
        var save = false,
            init = false,
            remove = false;

        var EmbeddedSchema = new Schema({
          title : String
        });

        var ParentSchema = new Schema({
          embeds : [EmbeddedSchema]
        });

        EmbeddedSchema.post('save', function(next){
          save = true;
        });

        // Don't know how to test those on a embedded document.
        //EmbeddedSchema.post('init', function () {
          //init = true;
        //});

        //EmbeddedSchema.post('remove', function () {
          //remove = true;
        //});

        mongoose.model('Parent', ParentSchema);

        var db = start(),
            Parent = db.model('Parent');

        var parent = new Parent();

        parent.embeds.push({title: 'Testing post hooks for embedded docs'});

        parent.save(function(err){
          db.close();
          assert.ifError(err);
          assert.ok(save);
          done();
        });
      });
    });

  });

  describe('#exec()', function(){
    it('count()', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      BlogPost.create({title: 'interoperable count as promise'}, function (err, created) {
        assert.ifError(err);
        var query = BlogPost.count({title: 'interoperable count as promise'});
        query.exec(function (err, count) {
          db.close();
          assert.ifError(err);
          assert.equal(1, count);
          done();
        });
      });
    });

    it('update()', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      BlogPost.create({title: 'interoperable update as promise'}, function (err, created) {
        assert.ifError(err);
        var query = BlogPost.update({title: 'interoperable update as promise'}, {title: 'interoperable update as promise delta'});
        query.exec(function (err) {
          assert.ifError(err);
          BlogPost.count({title: 'interoperable update as promise delta'}, function (err, count) {
            db.close();
            assert.ifError(err);
            assert.equal(1, count);
            done();
          });
        });
      });
    });

    it('findOne()', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      BlogPost.create({title: 'interoperable findOne as promise'}, function (err, created) {
        assert.ifError(err);
        var query = BlogPost.findOne({title: 'interoperable findOne as promise'});
        query.exec(function (err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(found.id,created.id);
          done();
        });
      });
    });

    it('find()', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      BlogPost.create(
          {title: 'interoperable find as promise'}
        , {title: 'interoperable find as promise'}
        , function (err, createdOne, createdTwo) {
        assert.ifError(err);
        var query = BlogPost.find({title: 'interoperable find as promise'});
        query.exec(function (err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(found.length,2);
          assert.equal(found[0]._id.id,createdOne._id.id);
          assert.equal(found[1]._id.id,createdTwo._id.id);
          done();
        });
      });
    });

    it('remove()', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      BlogPost.create(
          {title: 'interoperable remove as promise'}
        , function (err, createdOne, createdTwo) {
        assert.ifError(err);
        var query = BlogPost.remove({title: 'interoperable remove as promise'});
        query.exec(function (err) {
          assert.ifError(err);
          BlogPost.count({title: 'interoperable remove as promise'}, function (err, count) {
            db.close();
            assert.equal(count, 0);
            done();
          });
        });
      });
    });

    it('op can be changed', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection)
        , title = 'interop ad-hoc as promise';

      BlogPost.create({title: title }, function (err, created) {
        assert.ifError(err);
        var query = BlogPost.count({title: title });
        query.exec('findOne', function (err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(found.id,created.id);
          done();
        });
      });
    });

    describe('promises', function(){
      it('count()', function(done){
        var db = start()
          , BlogPost = db.model('BlogPost', collection);

        BlogPost.create({title: 'interoperable count as promise 2'}, function (err, created) {
          assert.ifError(err);
          var query = BlogPost.count({title: 'interoperable count as promise 2'});
          var promise = query.exec();
          promise.addBack(function (err, count) {
            db.close();
            assert.ifError(err);
            assert.equal(1, count);
            done();
          });
        });
      });

      it('update()', function(done){
        var db = start()
          , BlogPost = db.model('BlogPost', collection);

        BlogPost.create({title: 'interoperable update as promise 2'}, function (err, created) {
          assert.ifError(err);
          var query = BlogPost.update({title: 'interoperable update as promise 2'}, {title: 'interoperable update as promise delta 2'});
          var promise = query.exec();
          promise.addBack(function (err) {
            assert.ifError(err);
            BlogPost.count({title: 'interoperable update as promise delta 2'}, function (err, count) {
              db.close();
              assert.ifError(err);
              assert.equal(1, count);
              done();
            });
          });
        });
      });

      it('findOne()', function(done){
        var db = start()
          , BlogPost = db.model('BlogPost', collection);

        BlogPost.create({title: 'interoperable findOne as promise 2'}, function (err, created) {
          assert.ifError(err);
          var query = BlogPost.findOne({title: 'interoperable findOne as promise 2'});
          var promise = query.exec();
          promise.addBack(function (err, found) {
            db.close();
            assert.ifError(err);
            assert.equal(found.id,created.id);
            done();
          });
        });
      });

      it('find()', function(done){
        var db = start()
          , BlogPost = db.model('BlogPost', collection);

        BlogPost.create(
            {title: 'interoperable find as promise 2'}
          , {title: 'interoperable find as promise 2'}
          , function (err, createdOne, createdTwo) {
          assert.ifError(err);
          var query = BlogPost.find({title: 'interoperable find as promise 2'});
          var promise = query.exec();
          promise.addBack(function (err, found) {
            db.close();
            assert.ifError(err);
            assert.equal(found.length,2);
            assert.equal(found[0].id,createdOne.id);
            assert.equal(found[1].id,createdTwo.id);
            done();
          });
        });
      });

      it('remove()', function(done){
        var db = start()
          , BlogPost = db.model('BlogPost', collection);

        BlogPost.create(
            {title: 'interoperable remove as promise 2'}
          , function (err, createdOne, createdTwo) {
          assert.ifError(err);
          var query = BlogPost.remove({title: 'interoperable remove as promise 2'});
          var promise = query.exec();
          promise.addBack(function (err) {
            assert.ifError(err);
            BlogPost.count({title: 'interoperable remove as promise 2'}, function (err, count) {
              db.close();
              assert.equal(count,0);
              done();
            });
          });
        });
      });

      it('are compatible with op modification on the fly', function(done){
        var db = start()
          , BlogPost = db.model('BlogPost', collection);

        BlogPost.create({title: 'interoperable ad-hoc as promise 2'}, function (err, created) {
          assert.ifError(err);
          var query = BlogPost.count({title: 'interoperable ad-hoc as promise 2'});
          var promise = query.exec('findOne');
          promise.addBack(function (err, found) {
            db.close();
            assert.ifError(err);
            assert.equal(found._id.id,created._id.id);
            done();
          });
        });
      });
    });
  });

  describe('profiling', function(){
    it('system.profile is a default model', function(){
      var Profile = mongoose.model('system.profile');
      assert.equal('object', typeof Profile.schema.paths.ts);
      assert.equal('object', typeof Profile.schema.paths.info);
      assert.equal('object', typeof Profile.schema.paths.millis);
      assert.equal('object', typeof Profile.schema.paths.op);
      assert.equal('object', typeof Profile.schema.paths.ns);
      assert.equal('object', typeof Profile.schema.paths.query);
      assert.equal('object', typeof Profile.schema.paths.updateobj);
      assert.equal('object', typeof Profile.schema.paths.ntoreturn);
      assert.equal('object', typeof Profile.schema.paths.nreturned);
      assert.equal('object', typeof Profile.schema.paths.nscanned);
      assert.equal('object', typeof Profile.schema.paths.responseLength);
      assert.equal('object', typeof Profile.schema.paths.client);
      assert.equal('object', typeof Profile.schema.paths.user);
      assert.equal('object', typeof Profile.schema.paths.idhack);
      assert.equal('object', typeof Profile.schema.paths.scanAndOrder);
      assert.equal('object', typeof Profile.schema.paths.keyUpdates);
      assert.strictEqual(undefined, Profile.schema.paths._id);
      assert.strictEqual(undefined, Profile.schema.virtuals.id);

      var db = start();
      Profile = db.model('system.profile');
      db.close();
      assert.equal('object', typeof Profile.schema.paths.ts);
      assert.equal('object', typeof Profile.schema.paths.info);
      assert.equal('object', typeof Profile.schema.paths.millis);
      assert.equal('object', typeof Profile.schema.paths.op);
      assert.equal('object', typeof Profile.schema.paths.ns);
      assert.equal('object', typeof Profile.schema.paths.query);
      assert.equal('object', typeof Profile.schema.paths.updateobj);
      assert.equal('object', typeof Profile.schema.paths.ntoreturn);
      assert.equal('object', typeof Profile.schema.paths.nreturned);
      assert.equal('object', typeof Profile.schema.paths.nscanned);
      assert.equal('object', typeof Profile.schema.paths.responseLength);
      assert.equal('object', typeof Profile.schema.paths.client);
      assert.equal('object', typeof Profile.schema.paths.user);
      assert.equal('object', typeof Profile.schema.paths.idhack);
      assert.equal('object', typeof Profile.schema.paths.scanAndOrder);
      assert.equal('object', typeof Profile.schema.paths.keyUpdates);
      assert.strictEqual(undefined, Profile.schema.paths._id);
      assert.strictEqual(undefined, Profile.schema.virtuals.id);

      // can override the default
      db = start();
      // reset Mongoose state
      delete db.base.modelSchemas['system.profile']
      delete db.base.models['system.profile']
      delete db.models['system.profile'];
      db.close();
      // test
      var over = db.model('system.profile', new Schema({ name: String }));
      assert.equal('object', typeof over.schema.paths.name);
      assert.strictEqual(undefined, over.schema.paths.ts);
      // reset
      delete db.base.modelSchemas['system.profile']
      delete db.base.models['system.profile']
      delete db.models['system.profile'];
    });

    it('level can be set', function(done){
      var db = start();
      db.setProfiling(3, function (err) {
        assert.equal(err.message,'Invalid profiling level: 3');
        db.setProfiling('fail', function (err) {
          assert.equal(err.message,'Invalid profiling level: fail');
          db.setProfiling(2, function (err, doc) {
            assert.ifError(err);
            db.setProfiling(1, 50, function (err, doc) {
              assert.ifError(err);
              assert.equal(2, doc.was);
              db.setProfiling(0, function (err, doc) {
                db.close();
                assert.ifError(err);
                assert.equal(1, doc.was);
                assert.equal(50, doc.slowms);
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('console.log', function(){
    it('hides private props', function(){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      var date = new Date(1305730951086);
      var id0 = new DocumentObjectId('4dd3e169dbfb13b4570000b9');
      var id1 = new DocumentObjectId('4dd3e169dbfb13b4570000b6');
      var id2 = new DocumentObjectId('4dd3e169dbfb13b4570000b7');
      var id3 = new DocumentObjectId('4dd3e169dbfb13b4570000b8');

      var post = new BlogPost({
          title: 'Test'
        , _id: id0
        , date: date
        , numbers: [5,6,7]
        , owners: [id1]
        , meta: { visitors: 45 }
        , comments: [
            { _id: id2, title: 'my comment', date: date, body: 'this is a comment' },
            { _id: id3, title: 'the next thang', date: date, body: 'this is a comment too!' }]
      });

      db.close();

      var a = '{ meta: { visitors: 45 },\n  numbers: [ 5, 6, 7 ],\n  owners: [ 4dd3e169dbfb13b4570000b6 ],\n  comments: \n   [{ _id: 4dd3e169dbfb13b4570000b7,\n     comments: [],\n     body: \'this is a comment\',\n     date: Wed, 18 May 2011 15:02:31 GMT,\n     title: \'my comment\' }\n   { _id: 4dd3e169dbfb13b4570000b8,\n     comments: [],\n     body: \'this is a comment too!\',\n     date: Wed, 18 May 2011 15:02:31 GMT,\n     title: \'the next thang\' }],\n  _id: 4dd3e169dbfb13b4570000b9,\n  date: Wed, 18 May 2011 15:02:31 GMT,\n  title: \'Test\' }'

      var out = post.inspect();
      assert.ok(/meta: { visitors: 45 }/.test(out));
      assert.ok(/numbers: \[ 5, 6, 7 \]/.test(out));
      assert.ok(/Wed.+ 2011 \d\d:02:31 GMT/.test(out));
      assert.ok(!/activePaths:/.test(out));
      assert.ok(!/_atomics:/.test(out));
    });
  })

  describe('pathnames', function(){
    it('named path can be used', function(){
      var db = start()
        , P = db.model('pathnametest', new Schema({ path: String }))
      db.close();

      var threw = false;
      try {
        new P({ path: 'i should not throw' });
      } catch (err) {
        threw = true;
      }

      assert.ok(!threw);
    })
  })

  describe('auto_reconnect', function(){
    describe('if disabled', function(){
      describe('with mongo down', function(){
        it('should pass an error', function(done){
          var db = start({ server: { auto_reconnect: false }});
          var T = db.model('Thing', new Schema({ type: String }));
          db.on('open', function () {
            var t = new T({ type: "monster" });

            var worked = false;
            t.save(function (err) {
              assert.equal(err.message, 'no open connections');
              worked = true;
            });

            db.db.close();

            setTimeout(function () {
              assert.ok(worked);
              done();
            }, 500);
          });
        });
      });
    });
  });

  it('subdocuments with changed values should persist the values', function(done){
    var db = start()
    var Subdoc = new Schema({ name: String, mixed: Schema.Types.Mixed });
    var T = db.model('SubDocMixed', new Schema({ subs: [Subdoc] }));

    var t = new T({ subs: [{ name: "Hubot", mixed: { w: 1, x: 2 }}] });
    assert.equal(t.subs[0].name,"Hubot");
    assert.equal(t.subs[0].mixed.w,1);
    assert.equal(t.subs[0].mixed.x,2);

    t.save(function (err) {
      assert.ifError(err);

      T.findById(t._id, function (err, t) {
        assert.ifError(err);
        assert.equal(t.subs[0].name,"Hubot");
        assert.equal(t.subs[0].mixed.w,1);
        assert.equal(t.subs[0].mixed.x,2);

        var sub = t.subs[0];
        sub.name = "Hubot1";
        assert.equal(sub.name,"Hubot1");
        assert.ok(sub.isModified('name'));
        assert.ok(t.isModified());

        t.save(function (err) {
          assert.ifError(err);

          T.findById(t._id, function (err, t) {
            assert.ifError(err);
            assert.strictEqual(t.subs[0].name, "Hubot1");

            var sub = t.subs[0];
            sub.mixed.w = 5;
            assert.equal(sub.mixed.w,5);
            assert.ok(!sub.isModified('mixed'));
            sub.markModified('mixed');
            assert.ok(sub.isModified('mixed'));
            assert.ok(sub.isModified());
            assert.ok(t.isModified());

            t.save(function (err) {
              assert.ifError(err);

              T.findById(t._id, function (err, t) {
                db.close();
                assert.ifError(err);
                assert.strictEqual(t.subs[0].mixed.w, 5);
                done();
              })
            })
          });
        });
      })
    })
  })

  describe('RegExps', function(){
    it('can be saved', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      var post = new BlogPost({ mixed: { rgx: /^asdf$/ } });
      assert.ok(post.mixed.rgx instanceof RegExp);
      assert.equal(post.mixed.rgx.source,'^asdf$');
      post.save(function (err) {
        assert.ifError(err);
        BlogPost.findById(post._id, function (err, post) {
          db.close();
          assert.ifError(err);
          assert.ok(post.mixed.rgx instanceof RegExp);
          assert.equal(post.mixed.rgx.source,'^asdf$');
          done();
        });
      });
    });
  })

  // Demonstration showing why GH-261 is a misunderstanding
  it('a single instantiated document should be able to update its embedded documents more than once', function(done){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.comments.push({title: 'one'});
    post.save(function (err) {
      assert.ifError(err);
      assert.equal(post.comments[0].title,'one');
      post.comments[0].title = 'two';
      assert.equal(post.comments[0].title,'two');
      post.save(function (err) {
        assert.ifError(err);
        BlogPost.findById(post._id, function (err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(found.comments[0].title,'two');
          done();
        });
      });
    });
  })

  describe('save()', function(){
    describe('when no callback is passed', function(){
      it('should emit error on its db', function(done){
        var db = start();

        db.on('error', function (err) {
          db.close();
          assert.ok(err instanceof Error);
          done();
        });

        var DefaultErrSchema = new Schema({});
        DefaultErrSchema.pre('save', function (next) {
          next(new Error);
        });
        var DefaultErr = db.model('DefaultErr2', DefaultErrSchema, 'default_err_' + random());
        new DefaultErr().save();
      })

      it('should emit error on its Model when there are listeners', function(done){
        var db = start();

        var DefaultErrSchema = new Schema({});
        DefaultErrSchema.pre('save', function (next) {
          next(new Error);
        });

        var DefaultErr = db.model('DefaultErr3', DefaultErrSchema, 'default_err_' + random());

        DefaultErr.on('error', function (err) {
          db.close();
          assert.ok(err instanceof Error);
          done();
        });

        new DefaultErr().save();
      })

      it('should throw error when nothing is listening to db or Model errors', function(done){
        var db = start({ noErrorListener: 1 });

        var DefaultErrSchema = new Schema({});
        DefaultErrSchema.pre('save', function (next) {
          try {
            next(new Error);
          } catch (error) {
            // throws b/c nothing is listening to the Model or db error event
            db.close();
            assert.ok(error instanceof Error);
            done();
          }
        });
        var DefaultErr = db.model('DefaultErr1', DefaultErrSchema, 'default_err_' + random());
        new DefaultErr().save();
      });
    });
    it('returns number of affected docs', function(done){
      var db = start()
      var schema = new Schema({ name: String });
      var S = db.model('AffectedDocsAreReturned', schema);
      var s = new S({ name: 'aaron' });
      s.save(function (err, doc, affected) {
        assert.ifError(err);
        assert.equal(1, affected);
        s.name = 'heckmanananananana';
        s.save(function (err, doc, affected) {
          db.close();
          assert.ifError(err);
          assert.equal(1, affected);
          done();
        });
      });
    })
  });

  describe('backward compatibility', function(){
    it('with conflicted data in db', function(done){
      var db = start();
      var M = db.model('backwardDataConflict', new Schema({ namey: { first: String, last: String }}));
      var m = new M({ namey: "[object Object]" });
      m.namey = { first: 'GI', last: 'Joe' };// <-- should overwrite the string
      m.save(function (err) {
        db.close();
        assert.strictEqual(err, null);
        assert.strictEqual('GI', m.namey.first);
        assert.strictEqual('Joe', m.namey.last);
        done();
      });
    });

    it('with positional notation on path not existing in schema (gh-1048)', function(done){
      var db = start();

      var M = db.model('backwardCompat-gh-1048', Schema({ name: 'string' }));
      db.on('open', function () {
        var o = {
            name: 'gh-1048'
          , _id: new mongoose.Types.ObjectId
          , databases: {
                0: { keys: 100, expires: 0}
              , 15: {keys:1,expires:0}
            }
        };

        M.collection.insert(o, { safe: true }, function (err) {
          assert.ifError(err);
          M.findById(o._id, function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.ok(doc);
            assert.ok(doc._doc.databases);
            assert.ok(doc._doc.databases['0']);
            assert.ok(doc._doc.databases['15']);
            assert.equal(undefined, doc.databases);
            done();
          })
        })
      });
    })
  });

  describe('create()', function(){
    it('accepts an array', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      BlogPost.create([{ title: 'hi'}, { title: 'bye'}], function (err, post1, post2) {
        db.close();
        assert.strictEqual(err, null);
        assert.ok(post1.get('_id') instanceof DocumentObjectId);
        assert.ok(post2.get('_id') instanceof DocumentObjectId);

        assert.equal(post1.title,'hi');
        assert.equal(post2.title,'bye');
        done();
      });
    });

    it('fires callback when passed 0 docs', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      BlogPost.create(function (err, a) {
        db.close();
        assert.strictEqual(err, null);
        assert.ok(!a);
        done();
      });
    });

    it('fires callback when empty array passed', function(done){
      var db = start()
        , BlogPost = db.model('BlogPost', collection);

      BlogPost.create([], function (err, a) {
        db.close();
        assert.strictEqual(err, null);
        assert.ok(!a);
        done();
      });
    });
  });

  describe('non-schema adhoc property assignments', function(){
    it('are not saved', function(done){
      var db = start()
        , B = db.model('BlogPost', collection)

      var b = new B;
      b.whateveriwant = 10;
      b.save(function (err) {
        assert.ifError(err);
        B.collection.findOne({ _id: b._id }, function (err, doc) {
          db.close();
          assert.ifError(err);
          assert.ok(!('whateveriwant' in doc));
          done();
        });
      });
    });
  })

  it('should not throw range error when using Number _id and saving existing doc (gh-691)', function(done){
    var db =start();
    var T = new Schema({ _id: Number, a: String });
    var D = db.model('Testing691', T, 'asdf' + random());
    var d = new D({ _id: 1 });
    d.save(function (err) {
      assert.ifError(err);

      D.findById(d._id, function (err, d) {
        assert.ifError(err);

        d.a = 'yo';
        d.save(function (err) {
          db.close();
          assert.ifError(err);
          done();
        });
      });
    });
  });

  describe('setting an unset value', function(){
    it('is saved (gh-742)', function(done){
      var db = start();

      var DefaultTestObject = db.model("defaultTestObject",
        new Schema({
          score:{type:Number, "default":55}
        })
      );

      var myTest = new DefaultTestObject();

      myTest.save(function (err, doc){
        assert.ifError(err);
        assert.equal(doc.score, 55);

        DefaultTestObject.findById(doc._id, function (err, doc){
          assert.ifError(err);

          doc.score = undefined; // unset
          doc.save(function (err, doc, count){
            assert.ifError(err);

            DefaultTestObject.findById(doc._id, function (err, doc){
              assert.ifError(err);

              doc.score = 55;
              doc.save(function (err, doc, count){
                db.close();
                assert.ifError(err);
                assert.equal(doc.score, 55);
                assert.equal(count, 1);
                done();
              });
            });
          });
        });
      });
    });
  })

  it('path is cast to correct value when retreived from db', function(done){
    var db = start();
    var schema = new Schema({ title: { type: 'string', index: true }});
    var T = db.model('T', schema);
    T.collection.insert({ title: 234 }, {safe:true}, function (err) {
      assert.ifError(err);
      T.findOne(function (err, doc) {
        db.close();
        assert.ifError(err);
        assert.equal('234', doc.title);
        done();
      });
    });
  });

  it('setting a path to undefined should retain the value as undefined', function (done) {
    var db = start()
      , B = db.model('BlogPost', collection + random())

    var doc = new B;
    doc.title='css3';
    assert.equal(doc._delta()[1].$set.title,'css3');
    doc.title = undefined;
    assert.equal(doc._delta()[1].$unset.title,1);
    assert.strictEqual(undefined, doc._delta()[1].$set);

    doc.title='css3';
    doc.author = 'aaron';
    doc.numbers = [3,4,5];
    doc.meta.date = new Date;
    doc.meta.visitors = 89;
    doc.comments = [{ title: 'thanksgiving', body: 'yuuuumm' }];
    doc.comments.push({ title: 'turkey', body: 'cranberries' });

    doc.save(function (err) {
      assert.ifError(err);
      B.findById(doc._id, function (err, b) {
        assert.ifError(err);
        assert.equal(b.title,'css3');
        assert.equal(b.author,'aaron');
        assert.equal(b.meta.date.toString(), doc.meta.date.toString());
        assert.equal(b.meta.visitors.valueOf(), doc.meta.visitors.valueOf());
        assert.equal(2, b.comments.length);
        assert.equal(b.comments[0].title, 'thanksgiving');
        assert.equal(b.comments[0].body, 'yuuuumm');
        assert.equal(b.comments[1].title,'turkey');
        assert.equal(b.comments[1].body,'cranberries');
        b.title = undefined;
        b.author = null;
        b.meta.date = undefined;
        b.meta.visitors = null;
        b.comments[0].title = null;
        b.comments[0].body = undefined;
        b.save(function (err) {
          assert.ifError(err);
          B.findById(b._id, function (err, b) {
            assert.ifError(err);
            assert.strictEqual(undefined, b.title);
            assert.strictEqual(null, b.author);

            assert.strictEqual(undefined, b.meta.date);
            assert.strictEqual(null, b.meta.visitors);
            assert.strictEqual(null, b.comments[0].title);
            assert.strictEqual(undefined, b.comments[0].body);
            assert.equal(b.comments[1].title,'turkey');
            assert.equal(b.comments[1].body,'cranberries');

            b.meta = undefined;
            b.comments = undefined;
            b.save(function (err) {
              assert.ifError(err);
              B.collection.findOne({ _id: b._id}, function (err, b) {
                db.close();
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
  })

  describe('unsetting a default value', function(){
    it('should be ignored (gh-758)', function(done){
      var db = start();
      var M = db.model('758', new Schema({ s: String, n: Number, a: Array }));
      M.collection.insert({ }, { safe: true }, function (err) {
        assert.ifError(err);
        M.findOne(function (err, m) {
          assert.ifError(err);
          m.s = m.n = m.a = undefined;
          assert.equal(undefined, m._delta());
          done();
        });
      });
    })
  })
});
