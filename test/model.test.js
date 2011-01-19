
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , random = require('mongoose/utils').random
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , CastError = SchemaType.CastError
  , ValidationError = SchemaType.ValidationError
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
  , slug      : String
  , date      : Date
  , meta      : {
        date      : Date
      , visitors  : Number
    }
  , published : Boolean
  , owners    : [ObjectId]
  , comments  : [Comments]
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
      , BlogPost = db.model('BlogPost');

    BlogPost.schema.should.be.an.instanceof(Schema);
    BlogPost.prototype.schema.should.be.an.instanceof(Schema);
    db.close();
  },

  'test a model default structure when instantiated': function(){
    var db = start()
      , BlogPost = db.model('BlogPost');

    var post = new BlogPost();
    post.isNew.should.be.true;

    post.get('_id').should.be.an.instanceof(DocumentObjectId);

    should.strictEqual(post.get('title'), null);
    should.strictEqual(post.get('slug'), null);
    should.strictEqual(post.get('date'), null);

    post.get('meta').should.be.a('object');
    post.get('meta').should.eql({
        date: null
      , visitors: null
    });

    should.strictEqual(post.get('published'), null);

    post.get('owners').should.be.an.instanceof(MongooseArray);
    post.get('comments').should.be.an.instanceof(DocumentArray);
    db.close();
  },

  'test a model structure when saved': function(){
    var db = start()
      , BlogPost = db.model('BlogPost');

    var post = new BlogPost();
    post.save(function(){
      post.get('_id').should.be.an.instanceof(DocumentObjectId);

      should.strictEqual(post.get('title'), null);
      should.strictEqual(post.get('slug'), null);
      should.strictEqual(post.get('date'), null);

      post.get('meta').should.be.a('object');
      post.get('meta').should.eql({
          date: null
        , visitors: null
      });

      should.strictEqual(post.get('published'), null);

      post.get('owners').should.be.an.instanceof(MongooseArray);
      post.get('comments').should.be.an.instanceof(DocumentArray);
    });
    db.close();
  },

  'test a model structure when initd': function(){
    var db = start()
      , BlogPost = db.model('BlogPost');

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

    post.get('owners').should.be.an.instanceof(MongooseArray);
    post.get('owners')[0].should.be.an.instanceof(DocumentObjectId);
    post.get('owners')[1].should.be.an.instanceof(DocumentObjectId);

    post.get('comments').should.be.an.instanceof(DocumentArray);
    post.get('comments')[0].should.be.an.instanceof(EmbeddedDocument);
    post.get('comments')[1].should.be.an.instanceof(EmbeddedDocument);

    db.close();
  },

  'test a model structure when partially initd': function(){
    var db = start()
      , BlogPost = db.model('BlogPost');

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

    post.get('meta').should.eql({
        date: null
      , visitors: null
    });

    should.strictEqual(post.get('published'), null);

    post.get('owners').should.be.an.instanceof(MongooseArray);
    post.get('comments').should.be.an.instanceof(DocumentArray);
    db.close();
  },

  'test adding a subdocument with native methods': function(){

  },

  'test isNew on embedded documents after initing': function(){
    var db = start()
      , BlogPost = db.model('BlogPost');

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
      , BlogPost = db.model('BlogPost');

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
      , BlogPost = db.model('BlogPost');

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

  'test isModified on a MongooseArray with atomics methods': function(){
    // COMPLETEME
    var db = start()
      , BlogPost = db.model('BlogPost');

    var post = new BlogPost()

    post.isModified('owners').should.be.false;
    post.get('owners').$push(new DocumentObjectId);
    post.isModified('owners').should.be.true;

    db.close();
  },

  'test isModified on a MongooseArray with native methods': function(){
    // COMPLETEME
    var db = start()
      , BlogPost = db.model('BlogPost');

    var post = new BlogPost()

    post.isModified('owners').should.be.false;
    post.get('owners').push(new DocumentObjectId);

    db.close();
  },

  'test defining a new method': function(){
    var db = start()
      , BlogPost = db.model('BlogPost');

    var post = new BlogPost();
    post.cool().should.eql(post);
    db.close();
  },

  'test defining a static': function(){
    var db = start()
      , BlogPost = db.model('BlogPost');

    BlogPost.woot().should.eql(BlogPost);
    db.close();
  },

  'test casting error': function(){
    var db = start()
      , BlogPost = db.model('BlogPost')
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
      , BlogPost = db.model('BlogPost')
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
      , BlogPost = db.model('BlogPost')
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
      , BlogPost = db.model('BlogPost')
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
      err.should.be.an.instanceof(ValidationError);

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

    post.save(function(err){
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(ValidationError);

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
      err.should.be.an.instanceof(ValidationError);

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
        fn(v !== '');
      }, 50);
    };
    mongoose.model('TestAsyncValidation', new Schema({
        async: { type: Date, validate: [validator, 'async validator'] }
    }));

    var db = start()
      , TestAsyncValidation = db.model('TestAsyncValidation');

    var post = new TestAsyncValidation();

    post.save(function(err){
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(ValidationError);
      executed.should.be.true;
      executed = false;

      post.set('async', new Date);
      post.save(function(err){
        executed.should.be.true;
        should.strictEqual(err, null);
        db.close();
      });
    });
  },

  'test nested async validation': function(){
    var executed = false;

    function validator(fn){
      setTimeout(function (v, fn) {
        executed = true;
        fn(v !== '');
      }, 50);
    };
    
    mongoose.model('TestNestedAsyncValidation', new Schema({
        nested: {
            async: { type: Date, validate: [validator, 'async validator'] }
        }
    }));

    var db = start()
      , TestNestedAsyncValidation = db.model('TestNestedAsyncValidation');

    var post = new TestNestedAsyncValidation();

    post.save(function(err){
      err.should.be.an.instanceof(MongooseError);
      err.should.be.an.instanceof(ValidationError);
      executed.should.be.true;
      executed = false;

      post.set('nested.async', new Date);
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
      err.should.be.an.instanceof(ValidationError);
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

  'test middleware (serial)': function(){
    
  },

  'test middleware (parallel)': function(){

  },

  'test middleware (serial and parallel)': function(){

  },

  'test middleware errors (serial)': function(){

  },

  'test middleware errors (parallel)': function(){

  }

};
