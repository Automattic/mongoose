
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , random = require('mongoose/utils').random
  , Query = require('mongoose/query')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , CastError = SchemaType.CastError
  , ValidatorError = SchemaType.ValidatorError
  , ObjectId = Schema.ObjectId
  , DocumentObjectId = mongoose.Types.ObjectId
  , DocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = mongoose.Types.Document
  , MongooseNumber = mongoose.Types.Number
  , MongooseArray = mongoose.Types.Array
  , MongooseError = mongoose.Error;

/**
 * Setup.
 */

var Comments = new Schema();

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
});

BlogPost.virtual('titleWithAuthor')
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

module.exports = {

  'test a model isNew flag when instantiating': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.isNew.should.be.true;
    db.close();
  },

  'test presence of model schema': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    BlogPost.schema.should.be.an.instanceof(Schema);
    BlogPost.prototype.schema.should.be.an.instanceof(Schema);
    db.close();
  },

  'test a model default structure when instantiated': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.isNew.should.be.true;

    post.get('_id').should.be.an.instanceof(DocumentObjectId);

    should.equal(undefined, post.get('title'));
    should.equal(undefined, post.get('slug'));
    should.equal(undefined, post.get('date'));

    post.get('meta').should.be.a('object');
    post.get('meta').should.eql({});
    should.equal(undefined, post.get('meta.date'));
    should.equal(undefined, post.get('meta.visitors'));

    should.equal(undefined, post.get('published'));

    post.get('numbers').should.be.an.instanceof(MongooseArray);
    post.get('owners').should.be.an.instanceof(MongooseArray);
    post.get('comments').should.be.an.instanceof(DocumentArray);
    db.close();
  },

  'test a model default structure that has a nested Array when instantiated': function () {
    var db = start()
      , NestedSchema = new Schema({
          nested: {
            array: [Number]
          }
        });
    mongoose.model('NestedNumbers', NestedSchema);
    var NestedNumbers = db.model('NestedNumbers', collection);

    var nested = new NestedNumbers();
    nested.get('nested.array').should.be.an.instanceof(MongooseArray);
    db.close();
  },

  'test a model that defaults an Array attribute to a default non-empty array': function () {
    var db = start()
      , DefaultArraySchema = new Schema({
          arr: {type: Array, cast: String, default: ['a', 'b', 'c']}
        });
    mongoose.model('DefaultArray', DefaultArraySchema);
    var DefaultArray = db.model('DefaultArray', collection);
    var arr = new DefaultArray();
    arr.get('arr').should.have.length(3);
    arr.get('arr')[0].should.equal('a');
    arr.get('arr')[1].should.equal('b');
    arr.get('arr')[2].should.equal('c');
    db.close();
  },

  'test a model that defaults an Array attribute to a default single member array': function () {
    var db = start()
      , DefaultOneCardArraySchema = new Schema({
          arr: {type: Array, cast: String, default: ['a']}
        });
    mongoose.model('DefaultOneCardArray', DefaultOneCardArraySchema);
    var DefaultOneCardArray = db.model('DefaultOneCardArray', collection);
    var arr = new DefaultOneCardArray();
    arr.get('arr').should.have.length(1);
    arr.get('arr')[0].should.equal('a');
    db.close();
  },

  'test a model that defaults an Array attributes to an empty array': function () {
    var db = start()
      , DefaultZeroCardArraySchema = new Schema({
          arr: {type: Array, cast: String, default: []}
        });
    mongoose.model('DefaultZeroCardArray', DefaultZeroCardArraySchema);
    var DefaultZeroCardArray = db.model('DefaultZeroCardArray', collection);
    var arr = new DefaultZeroCardArray();
    arr.get('arr').should.have.length(0);
    arr.arr.should.have.length(0);
    db.close();
  },

  'test that arrays auto-default to the empty array': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.numbers.should.have.length(0);
    db.close();
  },

  'test instantiating a model with a hash that maps to at least 1 null value': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost({
      title: null
    });
    should.strictEqual(null, post.title);
    db.close();
  },

//  'test instantiating a model with a hash that maps to at least 1 undefined value': function () {
//    var db = start()
//      , BlogPost = db.model('BlogPost', collection);
//
//    var post = new BlogPost({
//      title: undefined
//    });
//    should.strictEqual(undefined, post.title);
//    db.close();
//  },

  'test a model structure when saved': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.save(function(err){
      should.strictEqual(err, null);
      post.get('_id').should.be.an.instanceof(DocumentObjectId);

      should.equal(undefined, post.get('title'));
      should.equal(undefined, post.get('slug'));
      should.equal(undefined, post.get('date'));
      should.equal(undefined, post.get('published'));

      post.get('meta').should.be.a('object');
      post.get('meta').should.eql({});
      should.equal(undefined, post.get('meta.date'));
      should.equal(undefined, post.get('meta.visitors'));

      post.get('owners').should.be.an.instanceof(MongooseArray);
      post.get('comments').should.be.an.instanceof(DocumentArray);
      db.close();
    });
  },

  'test a model structures when created': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    BlogPost.create({ title: 'hi there'}, function (err, post) {
      should.strictEqual(err, null);
      post.get('_id').should.be.an.instanceof(DocumentObjectId);

      should.strictEqual(post.get('title'), 'hi there');
      should.equal(undefined, post.get('slug'));
      should.equal(undefined, post.get('date'));

      post.get('meta').should.be.a('object');
      post.get('meta').should.eql({});
      should.equal(undefined, post.get('meta.date'));
      should.equal(undefined, post.get('meta.visitors'));

      should.strictEqual(undefined, post.get('published'));

      post.get('owners').should.be.an.instanceof(MongooseArray);
      post.get('comments').should.be.an.instanceof(DocumentArray);
      db.close();
    });
  },

  'test a model structure when initd': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost()
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

    post.get('title').should.eql('Test');
    post.get('slug').should.eql('test');
    post.get('date').should.be.an.instanceof(Date);
    post.get('meta').should.be.a('object');
    post.get('meta').date.should.be.an.instanceof(Date);
    post.get('meta').visitors.should.be.an.instanceof(MongooseNumber);
    post.get('published').should.be.true;

    post.title.should.eql('Test');
    post.slug.should.eql('test');
    post.date.should.be.an.instanceof(Date);
    post.meta.should.be.a('object');
    post.meta.date.should.be.an.instanceof(Date);
    post.meta.visitors.should.be.an.instanceof(MongooseNumber);
    post.published.should.be.true;

    post.get('owners').should.be.an.instanceof(MongooseArray);
    post.get('owners')[0].should.be.an.instanceof(DocumentObjectId);
    post.get('owners')[1].should.be.an.instanceof(DocumentObjectId);

    post.owners.should.be.an.instanceof(MongooseArray);
    post.owners[0].should.be.an.instanceof(DocumentObjectId);
    post.owners[1].should.be.an.instanceof(DocumentObjectId);

    post.get('comments').should.be.an.instanceof(DocumentArray);
    post.get('comments')[0].should.be.an.instanceof(EmbeddedDocument);
    post.get('comments')[1].should.be.an.instanceof(EmbeddedDocument);

    post.comments.should.be.an.instanceof(DocumentArray);
    post.comments[0].should.be.an.instanceof(EmbeddedDocument);
    post.comments[1].should.be.an.instanceof(EmbeddedDocument);

    db.close();
  },

  'test a model structure when partially initd': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost()
    post.init({
        title       : 'Test'
      , slug        : 'test'
      , date        : new Date
    });

    post.get('title').should.eql('Test');
    post.get('slug').should.eql('test');
    post.get('date').should.be.an.instanceof(Date);
    post.get('meta').should.be.a('object');

    post.get('meta').should.eql({});
    should.equal(undefined, post.get('meta.date'));
    should.equal(undefined, post.get('meta.visitors'));

    should.equal(undefined, post.get('published'));

    post.get('owners').should.be.an.instanceof(MongooseArray);
    post.get('comments').should.be.an.instanceof(DocumentArray);
    db.close();
  },

  'test initializing with a nested hash': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost({
      meta: {
          date      : new Date
        , visitors  : 5
      }
    });

    post.get('meta.visitors').valueOf().should.equal(5);
    db.close();
  },

  'test isNew on embedded documents after initing': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost()
    post.init({
        title       : 'Test'
      , slug        : 'test'
      , comments    : [ { title: 'Test', date: new Date, body: 'Test' } ]
    });

    post.get('comments')[0].isNew.should.be.false;
    db.close();
  },

  'test isModified when modifying keys': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost()
    post.init({
        title       : 'Test'
      , slug        : 'test'
      , date        : new Date
    });

    post.isModified('title').should.be.false;
    post.set('title', 'test');
    post.isModified('title').should.be.true;

    post.isModified('date').should.be.false;
    post.set('date', Date.now());
    post.isModified('date').should.be.true;

    post.isModified('meta.date').should.be.false;
    db.close();
  },

  'test isModified on a DocumentArray': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost()
    post.init({
        title       : 'Test'
      , slug        : 'test'
      , comments    : [ { title: 'Test', date: new Date, body: 'Test' } ]
    });

    post.isModified('comments').should.be.false;
    post.get('comments')[0].set('title', 'Woot');
    post.isModified('comments').should.be.true;

    db.close();
  },

  'test isModified on a DocumentArray with accessors': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost()
    post.init({
        title       : 'Test'
      , slug        : 'test'
      , comments    : [ { title: 'Test', date: new Date, body: 'Test' } ]
    });

    post.isModified('comments').should.be.false;
    post.get('comments')[0].body = 'Woot';
    post.isModified('comments').should.be.true;

    db.close();
  },

  'test isModified on a MongooseArray with atomics methods': function(){
    // COMPLETEME
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost()

    post.isModified('owners').should.be.false;
    post.get('owners').$push(new DocumentObjectId);
    post.isModified('owners').should.be.true;

    db.close();
  },

  'test isModified on a MongooseArray with native methods': function(){
    // COMPLETEME
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost()

    post.isModified('owners').should.be.false;
    post.get('owners').push(new DocumentObjectId);

    db.close();
  },

  'test defining a new method': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.cool().should.eql(post);
    db.close();
  },

  'test defining a static': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    BlogPost.woot().should.eql(BlogPost);
    db.close();
  },

  'test casting error': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , threw = false;

    var post = new BlogPost();
    
    try {
      post.init({
          date: 'Test'
      });
    } catch(e){
      threw = true;
    }

    threw.should.be.false;

    try {
      post.set('title', 'Test');
    } catch(e){
      threw = true;
    }

    threw.should.be.false;

    post.save(function(err){
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(CastError);
      db.close();
    });
  },
  
  'test nested casting error': function(){
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , threw = false;

    var post = new BlogPost();

    try {
      post.init({
          meta: {
              date: 'Test'
          }
      });
    } catch(e){
      threw = true;
    }

    threw.should.be.false;

    try {
      post.set('meta.date', 'Test');
    } catch(e){
      threw = true;
    }

    threw.should.be.false;
    
    post.save(function(err){
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(CastError);
      db.close();
    });
  },

  'test casting error in subdocuments': function(){
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
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(CastError);
      db.close();
    });
  },

  'test casting error when adding a subdocument': function(){
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

    threw.should.be.false;

    post.save(function(err){
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(CastError);
      db.close();
    });
  },

  'test validation': function(){
    mongoose.model('TestValidation', new Schema({
        simple: { type: String, required: true }
    }));

    var db = start()
      , TestValidation = db.model('TestValidation');

    var post = new TestValidation();
    post.set('simple', '');

    post.save(function(err){
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(ValidatorError);

      post.set('simple', 'here');
      post.save(function(err){
        should.strictEqual(err, null);
        db.close();
      });
    });
  },

  'test required validation for undefined values': function () {
    mongoose.model('TestUndefinedValidation', new Schema({
        simple: { type: String, required: true }
    }));

    var db = start()
      , TestUndefinedValidation = db.model('TestUndefinedValidation');

    var post = new TestUndefinedValidation();

    post.save(function(err){
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(ValidatorError);

      post.set('simple', 'here');
      post.save(function(err){
        should.strictEqual(err, null);
        db.close();
      });
    });
  },
  
  'test nested validation': function(){
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
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(ValidatorError);

      post.set('nested.required', 'here');
      post.save(function(err){
        should.strictEqual(err, null);
        db.close();
      });
    });
  },

  'test validation in subdocuments': function(){
    var Subdocs = new Schema({
        required: { type: String, required: true }
    });

    mongoose.model('TestSubdocumentsValidation', new Schema({
        items: [Subdocs]
    }));

    var db = start()
      , TestSubdocumentsValidation = db.model('TestSubdocumentsValidation');

    var post = new TestSubdocumentsValidation();

    post.get('items').push({ required: '' });

    post.save(function(err){
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(ValidatorError);

      post.get('items')[0].set('required', true);
      post.save(function(err){
        should.strictEqual(err, null);
        db.close();
      });
    });
  },

  'test async validation': function(){
    var executed = false;

    function validator(v, fn){
      setTimeout(function () {
        executed = true;
        fn(v !== 'test');
      }, 50);
    };
    mongoose.model('TestAsyncValidation', new Schema({
        async: { type: String, validate: [validator, 'async validator'] }
    }));

    var db = start()
      , TestAsyncValidation = db.model('TestAsyncValidation');

    var post = new TestAsyncValidation();
    post.set('async', 'test');

    post.save(function(err){
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(ValidatorError);
      executed.should.be.true;
      executed = false;

      post.set('async', 'woot');
      post.save(function(err){
        executed.should.be.true;
        should.strictEqual(err, null);
        db.close();
      });
    });
  },

  'test nested async validation': function(){
    var executed = false;

    function validator(v, fn){
      setTimeout(function () {
        executed = true;
        fn(v !== 'test');
      }, 50);
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
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(ValidatorError);
      executed.should.be.true;
      executed = false;

      post.set('nested.async', 'woot');
      post.save(function(err){
        executed.should.be.true;
        should.strictEqual(err, null);
        db.close();
      });
    });
  },

  'test async validation in subdocuments': function(){
    var executed = false;

    function validator (v, fn) {
      setTimeout(function(){
        executed = true;
        fn(v !== '');
      }, 50);
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
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(ValidatorError);
      executed.should.be.true;
      executed = false;

      post.get('items')[0].set({ required: 'here' });
      post.save(function(err){
        executed.should.be.true;
        should.strictEqual(err, null);
        db.close();
      });
    });
  },

  'test defaults application': function(){
    var now = Date.now();

    mongoose.model('TestDefaults', new Schema({
        date: { type: Date, default: now }
    }));

    var db = start()
      , TestDefaults = db.model('TestDefaults');

    var post = new TestDefaults();
    post.get('date').should.be.an.instanceof(Date);
    (+post.get('date')).should.eql(now);
    db.close();
  },

  'test nested defaults application': function(){
    var now = Date.now();

    mongoose.model('TestNestedDefaults', new Schema({
        nested: {
            date: { type: Date, default: now }
        }
    }));

    var db = start()
      , TestDefaults = db.model('TestNestedDefaults');

    var post = new TestDefaults();
    post.get('nested.date').should.be.an.instanceof(Date);
    (+post.get('nested.date')).should.eql(now);
    db.close();
  },
  
  'test defaults application in subdocuments': function(){
    var now = Date.now();

    var Items = new Schema({
        date: { type: Date, default: now }
    });

    mongoose.model('TestSubdocumentsDefaults', new Schema({
        items: [Items]
    }));

    var db = start()
      , TestSubdocumentsDefaults = db.model('TestSubdocumentsDefaults');

    var post = new TestSubdocumentsDefaults();
    post.get('items').push({});
    post.get('items')[0].get('date').should.be.an.instanceof(Date);
    (+post.get('items')[0].get('date')).should.eql(now);
    db.close();
  },
  
  // TODO: adapt this text to handle a getIndexes callback that's not unique to
  // the mongodb-native driver.
  'test that indexes are ensured when the model is compiled': function(){
    var Indexed = new Schema({
        name  : { type: String, index: true }
      , last  : String
      , email : String
    });

    Indexed.index({ last: 1, email: 1 }, { unique: true });

    mongoose.model('IndexedModel', Indexed);

    var db = start()
      , IndexedModel = db.model('IndexedModel', 'indexedmodel' + random())
      , assertions = 0;

    IndexedModel.on('index', function(){
      IndexedModel.collection.getIndexes(function(err, indexes){
        should.strictEqual(err, null);

        for (var i in indexes)
          indexes[i].forEach(function(index){
            if (index[0] == 'name')
              assertions++;
            if (index[0] == 'last')
              assertions++;
            if (index[0] == 'email')
              assertions++;
          });

        assertions.should.eql(3);
        db.close();
      });
    });
  },

  'test indexes on embedded documents': function () {
    var BlogPosts = new Schema({
        _id     : { type: ObjectId, index: true }
      , title   : { type: String, index: true }
      , desc    : String
    });

    var User = new Schema({
        name        : { type: String, index: true }
      , blogposts   : [BlogPosts]
    });

    mongoose.model('DeepIndexedModel', User);

    var db = start()
      , UserModel = db.model('DeepIndexedModel', 'deepindexedmodel' + random())
      , assertions = 0;

    UserModel.on('index', function () {
      UserModel.collection.getIndexes(function (err, indexes) {
        should.strictEqual(err, null);
        
        for (var i in indexes)
          indexes[i].forEach(function(index){
            if (index[0] == 'name')
              assertions++;
            if (index[0] == 'blogposts._id')
              assertions++;
            if (index[0] == 'blogposts.title')
              assertions++;
          });

        assertions.should.eql(3);
        db.close();
      });
    });
  },

  'test getters with same name on embedded documents not clashing': function() {
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

    post.author.name.should.eql('A');
    post.subject.name.should.eql('B');
    post.author.name.should.eql('A');

    db.close();
  },

  'test middleware': function () {
    var schema = new Schema({
        title: String
    });

    var called = 0;

    schema.pre('init', function (next) {
      called++;
      next();
    });

    schema.pre('save', function (next) {
      called++;
      next(new Error('Error 101'));
    });

    schema.pre('remove', function (next) {
      called++;
      next();
    });

    mongoose.model('TestMiddleware', schema);

    var db = start()
      , TestMiddleware = db.model('TestMiddleware');

    var test = new TestMiddleware();

    test.init({
        title: 'Test'
    });
   
    called.should.eql(1);

    test.save(function(err){
      err.should.be.an.instanceof(Error);
      err.message.should.eql('Error 101');
      called.should.eql(2);

      test.remove(function(err){
        should.strictEqual(err, null);
        called.should.eql(3);
        db.close();
      });
    });
  },

  'test updating documents': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , title = 'Tobi ' + random()
      , newTitle = 'Woot ' + random();

    var post = new BlogPost();
    post.set('title', title);

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.update({ title: title }, { title: newTitle }, function (err) {
        should.strictEqual(err, null);

        BlogPost.count({ title: newTitle }, function (err, count) {
          should.strictEqual(err, null);
          
          count.should.eql(1);
          db.close();
        });
      });
    });
  },

  'test update doc casting': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.set('title', '1');

    var id = post.get('_id');

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.update({ title: 1, _id: id }, { title: 2 }, function (err) {
        should.strictEqual(err, null);

        BlogPost.findOne({ _id: post.get('_id') }, function (err, doc) {
          should.strictEqual(err, null);

          doc.get('title').should.eql('2');
          db.close();
        });
      });
    });
  },

  'test $push casting': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , post = new BlogPost();

    post.get('numbers').push('3');
    post.get('numbers')[0].should.equal(3);
    db.close();
  },

  'test $pull casting': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , post = new BlogPost();

    post.get('numbers').push(1, 2, 3, 4);
    post.save( function (err) {
      BlogPost.findById( post.get('_id'), function (err, found) {
        found.get('numbers').length.should.equal(4);
        found.get('numbers').$pull('3');
        found.save( function (err) {
          BlogPost.findById( found.get('_id'), function (err, found2) {
            found2.get('numbers').length.should.equal(3);
            db.close();
          });
        });
      });
    });
  },

  'test updating numbers atomically': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , totalDocs = 4
      , saveQueue = [];

    var post = new BlogPost();
    post.set('meta.visitors', 5);

    post.save(function(err){
      if (err) throw err;

      BlogPost.findOne({ _id: post.get('_id') }, function(err, doc){
        if (err) throw err;
        doc.get('meta.visitors').increment();
        doc.get('meta.visitors').valueOf().should.be.equal(6);
        save(doc);
      });

      BlogPost.findOne({ _id: post.get('_id') }, function(err, doc){
        if (err) throw err;
        doc.get('meta.visitors').increment();
        doc.get('meta.visitors').valueOf().should.be.equal(6);
        save(doc);
      });

      BlogPost.findOne({ _id: post.get('_id') }, function(err, doc){
        if (err) throw err;
        doc.get('meta.visitors').increment();
        doc.get('meta.visitors').valueOf().should.be.equal(6);
        save(doc);
      });

      BlogPost.findOne({ _id: post.get('_id') }, function(err, doc){
        if (err) throw err;
        doc.get('meta.visitors').increment();
        doc.get('meta.visitors').valueOf().should.be.equal(6);
        save(doc);
      });

      function save(doc) {
        saveQueue.push(doc);
        if (saveQueue.length == 4)
          saveQueue.forEach(function (doc) {
            doc.save(function (err) {
              if (err) throw err;
              --totalDocs || complete();
            });
          });
      };

      function complete () {
        BlogPost.findOne({ _id: post.get('_id') }, function (err, doc) {
          if (err) throw err;
          doc.get('meta.visitors').valueOf().should.be.equal(9);
          db.close();
        });
      };
    });
  },

  'test incrementing a number atomically with an arbitrary value': function () {
    var db = start()
      , BlogPost = db.model('BlogPost');

    var post = new BlogPost();

    post.meta.visitors = 0;

    post.save(function (err) {
      should.strictEqual(err, null);

      post.meta.visitors.increment(50);

      post.save(function (err) {
        should.strictEqual(err, null);

        BlogPost.findById(post._id, function (err, doc) {
          should.strictEqual(err, null);

          (+doc.meta.visitors).should.eql(50);
          db.close();
        });
      });
    });
  },

  // GH-203
  'test changing a number non-atomically': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();

    post.meta.visitors = 5;

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.findById(post._id, function (err, doc) {
        should.strictEqual(err, null);

        doc.meta.visitors -= 2;
        
        doc.save(function (err) {
          should.strictEqual(err, null);

          BlogPost.findById(post._id, function (err, doc) {
            should.strictEqual(err, null);
  
            (+doc.meta.visitors).should.eql(3);
            db.close();
          });
        });
      });
    });
  },

  'test saving subdocuments atomically': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , totalDocs = 4
      , saveQueue = [];
    
    var post = new BlogPost();

    post.save(function(err){
      if (err) throw err;

      BlogPost.findOne({ _id: post.get('_id') }, function(err, doc){
        if (err) throw err;
        doc.get('comments').push({ title: '1' });
        save(doc);
      });

      BlogPost.findOne({ _id: post.get('_id') }, function(err, doc){
        if (err) throw err;
        doc.get('comments').push({ title: '2' });
        save(doc);
      });

      BlogPost.findOne({ _id: post.get('_id') }, function(err, doc){
        if (err) throw err;
        doc.get('comments').push({ title: '3' });
        save(doc);
      });

      BlogPost.findOne({ _id: post.get('_id') }, function(err, doc){
        if (err) throw err;
        doc.get('comments').push({ title: '4' }, { title: '5' });
        save(doc);
      });

      function save(doc) {
        saveQueue.push(doc);
        if (saveQueue.length == 4)
          saveQueue.forEach(function (doc) {
            doc.save(function (err) {
              if (err) throw err;
              --totalDocs || complete();
            });
          });
      };

      function complete () {
        BlogPost.findOne({ _id: post.get('_id') }, function (err, doc) {
          if (err) throw err;

          doc.get('comments').length.should.eql(5);

          doc.get('comments').some(function(comment){
            return comment.get('title') == '1';
          }).should.be.true;

          doc.get('comments').some(function(comment){
            return comment.get('title') == '2';
          }).should.be.true;

          doc.get('comments').some(function(comment){
            return comment.get('title') == '3';
          }).should.be.true;

          doc.get('comments').some(function(comment){
            return comment.get('title') == '4';
          }).should.be.true;

          doc.get('comments').some(function(comment){
            return comment.get('title') == '5';
          }).should.be.true;

          db.close();
        });
      };
    });
  },

  'test doubly nested array saving and loading': function(){
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
      should.strictEqual(err, null);
      outer.get('_id').should.be.an.instanceof(DocumentObjectId);

      Outer.findById(outer.get('_id'), function(err, found) {
        should.strictEqual(err, null);
        should.equal(1, found.inner.length);
        found.inner[0].arr.push(5);
        found.save(function(err) {
          should.strictEqual(err, null);
          found.get('_id').should.be.an.instanceof(DocumentObjectId);
          Outer.findById(found.get('_id'), function(err, found2) {
            should.strictEqual(err, null);
            should.equal(1, found2.inner.length);
            should.equal(1, found2.inner[0].arr.length);
            should.equal(5, found2.inner[0].arr[0]);
            db.close();
          });
        });
      });
    });
  },

  'test updating multiple Number $pushes as a single $pushAll': function () {
    var db = start()
      , schema = new Schema({
          nested: {
            nums: [Number]
          }
        });

    mongoose.model('NestedPushes', schema);
    var Temp = db.model('NestedPushes', collection);

    Temp.create({}, function (err, t) {
      t.nested.nums.push(1);
      t.nested.nums.push(2);

      t.nested.nums.should.have.length(2);

      t.save( function (err) {
        should.strictEqual(null, err);
        t.nested.nums.should.have.length(2);
        Temp.findById(t._id, function (err, found) {
          found.nested.nums.should.have.length(2);
          db.close();
        });
      });
    });
  },

  'test updating at least a single $push and $pushAll as a single $pushAll': function () {
    var db = start()
      , schema = new Schema({
          nested: {
            nums: [Number]
          }
        });

    mongoose.model('NestedPushes', schema);
    var Temp = db.model('NestedPushes', collection);

    Temp.create({}, function (err, t) {
      t.nested.nums.push(1);
      t.nested.nums.$pushAll([2, 3]);

      t.nested.nums.should.have.length(3);

      t.save( function (err) {
        should.strictEqual(null, err);
        t.nested.nums.should.have.length(3);
        Temp.findById(t._id, function (err, found) {
          found.nested.nums.should.have.length(3);
          db.close();
        });
      });
    });
  },

  'test activePaths should be updated for nested modifieds': function () {
    var db = start()
      , schema = new Schema({
          nested: {
            nums: [Number]
          }
        });

    mongoose.model('NestedPushes', schema);
    var Temp = db.model('NestedPushes', collection);

    Temp.create({nested: {nums: [1, 2, 3, 4, 5]}}, function (err, t) {
      t.nested.nums.$pull(1);
      t.nested.nums.$pull(2);

      t.activePaths.stateOf('nested.nums').should.equal('modify');
      db.close();

    });
  },

  '$pull should affect what you see in an array before a save': function () {
    var db = start()
      , schema = new Schema({
          nested: {
            nums: [Number]
          }
        });

    mongoose.model('NestedPushes', schema);
    var Temp = db.model('NestedPushes', collection);

    Temp.create({nested: {nums: [1, 2, 3, 4, 5]}}, function (err, t) {
      t.nested.nums.$pull(1);

      t.nested.nums.should.have.length(4);

      db.close();
    });
  },

  '$pullAll should affect what you see in an array before a save': function () {
    var db = start()
      , schema = new Schema({
          nested: {
            nums: [Number]
          }
        });

    mongoose.model('NestedPushes', schema);
    var Temp = db.model('NestedPushes', collection);

    Temp.create({nested: {nums: [1, 2, 3, 4, 5]}}, function (err, t) {
      t.nested.nums.$pullAll([1, 2, 3]);

      t.nested.nums.should.have.length(2);

      db.close();
    });
  },

  'test updating multiple Number $pulls as a single $pullAll': function () {
    var db = start()
      , schema = new Schema({
          nested: {
            nums: [Number]
          }
        });

    mongoose.model('NestedPushes', schema);
    var Temp = db.model('NestedPushes', collection);

    Temp.create({nested: {nums: [1, 2, 3, 4, 5]}}, function (err, t) {
      t.nested.nums.$pull(1);
      t.nested.nums.$pull(2);

      t.nested.nums.should.have.length(3);

      t.save( function (err) {
        should.strictEqual(null, err);
        t.nested.nums.should.have.length(3);
        Temp.findById(t._id, function (err, found) {
          found.nested.nums.should.have.length(3);
          db.close();
        });
      });
    });
  },

  'having both a pull and pullAll should default to pullAll': function () {
    var db = start()
      , schema = new Schema({
          nested: {
            nums: [Number]
          }
        });

    mongoose.model('NestedPushes', schema);
    var Temp = db.model('NestedPushes', collection);

    Temp.create({nested: {nums: [1, 2, 3, 4, 5]}}, function (err, t) {
      t.nested.nums.$pull(1);
      t.nested.nums.$pullAll([2, 3]);

      t.nested.nums.should.have.length(2);

      t.save( function (err) {
        should.strictEqual(null, err);
        t.nested.nums.should.have.length(2);
        Temp.findById(t._id, function (err, found) {
          found.nested.nums.should.have.length(2);
          db.close();
        });
      });
    });
  },

  'test saving embedded arrays of Numbers atomically': function () {
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
      if (err) throw err;

      Temp.findOne({ _id: t.get('_id') }, function(err, doc){
        if (err) throw err;
        doc.get('nums').push(1);
        save(doc);
      });

      Temp.findOne({ _id: t.get('_id') }, function(err, doc){
        if (err) throw err;
        doc.get('nums').push(2, 3);
        save(doc);
      });


      function save(doc) {
        saveQueue.push(doc);
        if (saveQueue.length == totalDocs)
          saveQueue.forEach(function (doc) {
            doc.save(function (err) {
              if (err) throw err;
              --totalDocs || complete();
            });
          });
      };

      function complete () {
        Temp.findOne({ _id: t.get('_id') }, function (err, doc) {
          if (err) throw err;

          doc.get('nums').length.should.eql(3);

          doc.get('nums').some(function(num){
            return num.valueOf() == '1';
          }).should.be.true;

          doc.get('nums').some(function(num){
            return num.valueOf() == '2';
          }).should.be.true;

          doc.get('nums').some(function(num){
            return num.valueOf() == '3';
          }).should.be.true;


          db.close();
        });
      };
    });
  },

  'test saving embedded arrays of Strings atomically': function () {
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
      if (err) throw err;

      StrList.findOne({ _id: t.get('_id') }, function(err, doc){
        if (err) throw err;
        doc.get('strings').push('a');
        save(doc);
      });

      StrList.findOne({ _id: t.get('_id') }, function(err, doc){
        if (err) throw err;
        doc.get('strings').push('b', 'c');
        save(doc);
      });


      function save(doc) {
        saveQueue.push(doc);
        if (saveQueue.length == totalDocs)
          saveQueue.forEach(function (doc) {
            doc.save(function (err) {
              if (err) throw err;
              --totalDocs || complete();
            });
          });
      };

      function complete () {
        StrList.findOne({ _id: t.get('_id') }, function (err, doc) {
          if (err) throw err;

          doc.get('strings').length.should.eql(3);

          doc.get('strings').some(function(str){
            return str == 'a';
          }).should.be.true;

          doc.get('strings').some(function(str){
            return str == 'b';
          }).should.be.true;

          doc.get('strings').some(function(str){
            return str == 'c';
          }).should.be.true;

          db.close();
        });
      };
    });
  },

  // GH-255
  'test updating an embedded document in an embedded array': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    BlogPost.create({comments: [{title: 'woot'}]}, function (err, post) {
      should.strictEqual(err, null);
      BlogPost.findById(post._id, function (err, found) {
        should.strictEqual(err, null);
        found.comments[0].title.should.equal('woot');
        found.comments[0].title = 'notwoot';
        found.save( function (err) {
          should.strictEqual(err, null);
          BlogPost.findById(found._id, function (err, updated) {
            db.close();
            should.strictEqual(err, null);
            updated.comments[0].title.should.equal('notwoot');
          });
        });
      });
    });
  },
  'test filtering an embedded array by the id shortcut function': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();

    post.comments.push({ title: 'woot' });
    post.comments.push({ title: 'aaaa' });

    var subdoc1 = post.comments[0];
    var subdoc2 = post.comments[1];

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.findById(post.get('_id'), function (err, doc) {
        should.strictEqual(err, null);

        // test with an objectid
        doc.comments.id(subdoc1.get('_id')).title.should.eql('woot');

        // test with a string
        var id = DocumentObjectId.toString(subdoc2._id);
        doc.comments.id(id).title.should.eql('aaaa');

        db.close();
      });
    });
  },

  'test filtering an embedded array by the id with cast error': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.findById(post.get('_id'), function (err, doc) {
        should.strictEqual(err, null);
        should.strictEqual(doc.comments.id(null), null);

        db.close();
      });
    });
  },

  'test filtering an embedded array by the id shortcut with no match': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.findById(post.get('_id'), function (err, doc) {
        should.strictEqual(err, null);
        should.strictEqual(doc.comments.id(new DocumentObjectId), null);

        db.close();
      });
    });
  },

  'test for removing a subdocument atomically': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.title = 'hahaha';
    post.comments.push({ title: 'woot' });
    post.comments.push({ title: 'aaaa' });

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.findById(post.get('_id'), function (err, doc) {
        should.strictEqual(err, null);

        doc.comments[0].remove();
        doc.save(function (err) {
          should.strictEqual(err, null);

          BlogPost.findById(post.get('_id'), function (err, doc) {
            should.strictEqual(err, null);
            
            doc.comments.should.have.length(1);
            doc.comments[0].title.should.eql('aaaa');

            db.close();
          });
        });
      });
    });
  },

  'try saving mixed data': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , count = 3;

    // string
    var post = new BlogPost();
    post.mixed = 'woot';
    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.findById(post._id, function (err) {
        should.strictEqual(err, null);

        --count || db.close();
      });
    });
    
    // array
    var post2 = new BlogPost();
    post2.mixed = [{foo: 'bar'}];
    post2.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.findById(post2._id, function (err, doc){
        should.strictEqual(err, null);

        Array.isArray(doc.mixed).should.be.true;
        doc.mixed.push({ hello: 'world' });
        doc.commit('mixed');

        doc.save(function (err, doc) {
          should.strictEqual(err, null);

          BlogPost.findById(post2._id, function (err, doc) {
            should.strictEqual(err, null);

            doc.mixed[0].should.eql({ foo: 'bar' });
            doc.mixed[1].should.eql({ hello: 'world' });
            --count || db.close();
          });
        });
      });

      // date
      var post3 = new BlogPost();
      post3.mixed = new Date;
      post3.save(function (err) {
        should.strictEqual(err, null);

        BlogPost.findById(post3._id, function (err, doc) {
          should.strictEqual(err, null);

          doc.mixed.should.be.an.instanceof(Date);
          --count || db.close();
        });
      });
    });
  },

  // GH-200
  'try populating mixed data from the constructor': function () {
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

    post.mixed.type.should.eql('test');
    post.mixed.github.should.eql('rules');
    post.mixed.nested.number.should.eql(3);

    db.close();
  },

  'test that we don\'t instantiate MongooseNumber in arrays': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.numbers.push(1, '2', 3);

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.findById(post._id, function (err, doc) {
        should.strictEqual(err, null);

        (~doc.numbers.indexOf(1)).should.not.eql(0);
        (~doc.numbers.indexOf(2)).should.not.eql(0);
        (~doc.numbers.indexOf(3)).should.not.eql(0);

        db.close();
      });
    });
  },

  'test removing from an array atomically using MongooseArray#remove': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.numbers.push(1, 2, 3);

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.findById(post._id, function (err, doc) {
        should.strictEqual(err, null);

        doc.numbers.remove('1');
        doc.save(function (err) {
          should.strictEqual(err, null);
          
          BlogPost.findById(post.get('_id'), function (err, doc) {
            should.strictEqual(err, null);

            doc.numbers.should.have.length(2);
            doc.numbers.remove('2', '3');

            doc.save(function (err) {
              should.strictEqual(err, null);

              BlogPost.findById(post._id, function (err, doc) {
                should.strictEqual(err, null);

                doc.numbers.should.have.length(0);
                db.close();
              });
            });
          });
        });
      });
    });
  },

  'test getting a virtual property via get(...)': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , post = new BlogPost({
            title: 'Letters from Earth'
          , author: 'Mark Twain'
        });

    post.get('titleWithAuthor').should.equal('Letters from Earth by Mark Twain');

    db.close();
  },

  'test setting a virtual property': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , post = new BlogPost();

    post.set('titleWithAuthor', 'Huckleberry Finn by Mark Twain')
    post.get('title').should.equal('Huckleberry Finn');
    post.get('author').should.equal('Mark Twain');

    db.close();
  },

  'test getting a virtual property via shortcut getter': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , post = new BlogPost({
            title: 'Letters from Earth'
          , author: 'Mark Twain'
        });

    post.titleWithAuthor.should.equal('Letters from Earth by Mark Twain');

    db.close();
  },

  'saving a doc with a set virtual property should persist the real properties but not the virtual property': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , post = new BlogPost();

    post.set('titleWithAuthor', 'Huckleberry Finn by Mark Twain')
    post.get('title').should.equal('Huckleberry Finn');
    post.get('author').should.equal('Mark Twain');

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.findById(post.get('_id'), function (err, found) {
        should.strictEqual(err, null);

        found.get('title').should.equal('Huckleberry Finn');
        found.get('author').should.equal('Mark Twain');
        found.toObject().should.not.have.property('titleWithAuthor');
        db.close();
      });
    });
  },

  'test setting a pseudo-nested virtual property': function () {
    var db = start()
      , PersonSchema = new Schema({
          name: {
              first: String
            , last: String
          }
        });

    PersonSchema.virtual('name.full')
      .get( function () {
        return this.get('name.first') + ' ' + this.get('name.last');
      })
      .set( function (fullName) {
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

    person.get('name.full').should.equal('Michael Sorrentino');
    person.set('name.full', 'The Situation');
    person.get('name.first').should.equal('The');
    person.get('name.last').should.equal('Situation');

    db.close();
  },

  'test removing all documents from a collection via Model.remove': function () {
    var db = start()
      , collection = 'blogposts_' + random()
      , BlogPost = db.model('BlogPost', collection)
      , post = new BlogPost();

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.find({}, function (err, found) {
        should.strictEqual(err, null);
        
        found.should.have.length(1);
        
        BlogPost.remove({}, function (err) {
          should.strictEqual(err, null);

          BlogPost.find({}, function (err, found2) {
            should.strictEqual(err, null);

            found2.should.have.length(0);
            db.close();
          });
        });
      });
    });
  },

  // GH-190
  'test shorcut getter for a type defined with { type: Native }': function () {
    var schema = new Schema({
        date: { type: Date }
    });

    mongoose.model('ShortcutGetterObject', schema);

    var db = start()
      , ShortcutGetter = db.model('ShortcutGetterObject', 'shortcut' + random())
      , post = new ShortcutGetter();

    post.set('date', Date.now());
    post.date.should.be.an.instanceof(Date);

    db.close();
  },

  'test shortcut getter for a nested path': function () {
    var schema = new Schema({
      first: {
        second: [Number]
      }
    });
    mongoose.model('ShortcutGetterNested', schema);

    var db = start()
      , ShortcutGetterNested = db.model('ShortcutGetterNested', collection)
      , doc = new ShortcutGetterNested();

    doc.first.should.be.a('object');
    doc.first.second.should.be.an.instanceof(MongooseArray);

    db.close();
  },

  // GH-195
  'test that save on an unaltered model doesn\'t clear the document': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection);

    var post = new BlogPost();
    post.title = 'woot';
    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPost.findById(post._id, function (err, doc) {
        should.strictEqual(err, null);

        // we deliberately make no alterations
        doc.save(function (err) {
          should.strictEqual(err, null);

          BlogPost.findById(doc._id, function (err, doc) {
            should.strictEqual(err, null);

            doc.title.should.eql('woot');
            db.close();
          });
        });
      });
    });
  },

  'test that safe mode is the default and it works': function () {
    var Human = new Schema({
        name  : String
      , email : { type: String, unique: true }
    });

    mongoose.model('SafeHuman', Human);

    var db = start()
      , Human = db.model('SafeHuman', 'safehuman' + random());

    var me = new Human({
        name  : 'Guillermo Rauch'
      , email : 'rauchg@gmail.com'
    });

    me.save(function (err) {
      should.strictEqual(err, null);
      
      Human.findById(me._id, function (err, doc){
        should.strictEqual(err, null);
        doc.email.should.eql('rauchg@gmail.com');

        var copycat = new Human({
            name  : 'Lionel Messi'
          , email : 'rauchg@gmail.com'
        });

        copycat.save(function (err) {
          /duplicate/.test(err.message).should.be.true;
          err.should.be.an.instanceof(Error);
          db.close();
        });
      });
    });
  },

  'test that safe mode can be turned off': function () {
    var Human = new Schema({
        name  : String
      , email : { type: String, unique: true }
    });

    // turn it off
    Human.set('safe', false);

    mongoose.model('UnsafeHuman', Human);

    var db = start()
      , Human = db.model('UnsafeHuman', 'unsafehuman' + random());

    var me = new Human({
        name  : 'Guillermo Rauch'
      , email : 'rauchg@gmail.com'
    });

    me.save(function (err) {
      should.strictEqual(err, null);
      
      Human.findById(me._id, function (err, doc){
        should.strictEqual(err, null);
        doc.email.should.eql('rauchg@gmail.com');

        var copycat = new Human({
            name  : 'Lionel Messi'
          , email : 'rauchg@gmail.com'
        });

        copycat.save(function (err) {
          should.strictEqual(err, null);
          db.close();
        });
      });
    });
  },

  'test post hooks': function () {
    var schema = new Schema({
            title: String
        })
      , save = false
      , remove = false
      , init = false;

    schema.post('save', function () {
      save = true;
    });

    schema.post('init', function () {
      init = true;
    });

    schema.post('remove', function () {
      remove = true;
    });

    mongoose.model('PostHookTest', schema);

    var db = start()
      , BlogPost = db.model('PostHookTest');

    var post = new BlogPost();

    post.save(function (err) {
      process.nextTick(function () {
        should.strictEqual(err, null);
        save.should.be.true;

        BlogPost.findById(post._id, function (err, doc) {
          process.nextTick(function () {
            should.strictEqual(err, null);
            init.should.be.true;

            doc.remove(function (err) {
              process.nextTick(function () {
                should.strictEqual(err, null);
                remove.should.be.true;
                db.close();
              });
            });
          });
        });
      });
    });
  },

};
