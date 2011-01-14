
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , random = require('mongoose/utils').random
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , DocumentObjectId = mongoose.Types.ObjectId
  , DocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = mongoose.Types.Document
  , MongooseNumber = mongoose.Types.Number
  , MongooseArray = mongoose.Types.Array;

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
      , comments    : [ { title: 'Test', date: new Date, body: 'Test' } ]
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
    post.get('comments').should.be.an.instanceof(DocumentsArray);
    post.get('comments')[0].should.be.an.instanceof(EmbeddedArray);
    post.get('comments')[1].should.be.an.instanceof(EmbeddedArray);
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
    post.get('comments')[1].isNew.should.be.false;
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
    post.set('date') = Date.now()
    post.isModified('date').should.be.true;

    post.isModified('meta.date').should.be.false;
    db.close();
  }

};
