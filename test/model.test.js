
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , random = require('mongoose/utils').random
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , DocumentObjectId = mongoose.ObjectId
  , DocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = mongoose.Types.Document
  , MongooseNumber = mongoose.Types.Number
  , MongooseArray = mongoose.Types.Array;

/**
 * Setup.
 */

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

var Comments = new Schema({
    title     : String
  , date      : Date
  , body      : String
  , comments  : [Comments]
});

Mongoose.model('BlogPost', BlogPost, 'blogposts_' + random());

module.exports = {

  'test a model isNew flag when instantiating': function(){
    var db = start()
      , BlogPost = db.model('BlogPost');

    var post = new BlogPost();
    post.isNew.should.be.true;
    db.close();
  },

  'test presence of model schema': function(){
    var db = start()
      , BlogPost = db.model('BlogPost');

    BlogPost.schema.should.be.an.instanceof(Schema);
    BlogPost.prototype.schema.should.be.an.instanceof(Schema);
  },

  'test a model default structure when instantiated': function(){
    var db = start()
      , BlogPost = db.model('BlogPost');

    var post = new BlogPost();
    post.isNew.should.be.true;

    post._id.should.be.an.instanceof(DocumentObjectId);

    should.strictEqual(post.title, null);
    should.strictEqual(post.slug, null);
    should.strictEqual(post.date, null);

    post.meta.should.be.a('object');
    post.meta.should.eql({
        date: null
      , visitors: null
    });

    should.strictEqual(post.published, null);

    post.owners.should.be.an.instanceof(MongooseArray);
    post.comments.should.be.an.instanceof(DocumentArray);
  },

  'test a model structure when saved': function(){
    var db = start()
      , BlogPost = db.model('BlogPost');

    var post = new BlogPost();
    post.save(function(){
      post._id.should.be.an.instanceof(DocumentObjectId);

      should.strictEqual(post.title, null);
      should.strictEqual(post.slug, null);
      should.strictEqual(post.date, null);

      post.meta.should.be.a('object');
      post.meta.should.eql({
          date: null
        , visitors: null
      });

      should.strictEqual(post.published, null);

      post.owners.should.be.an.instanceof(MongooseArray);
      post.comments.should.be.an.instanceof(DocumentArray);
    });
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

    post.title.should.eql('Test');
    post.slug.should.eql('test');
    post.date.should.be.an.instanceof(Date);
    post.meta.should.be.a('object');
    post.meta.date.should.be.an.instanceof(Date);
    post.meta.visitors.should.be.an.instanceof(MongooseNumber);
    post.published.should.be.true;
    post.owners.should.be.an.instanceof(MongooseArray);
    post.owners[0].should.be.an.instanceof(DocumentObjectId);
    post.owners[1].should.be.an.instanceof(DocumentObjectId);
    post.comments.should.be.an.instanceof(DocumentsArray);
    post.comments[0].should.be.an.instanceof(EmbeddedArray);
    post.comments[1].should.be.an.instanceof(EmbeddedArray);
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

    post.title.should.eql('Test');
    post.slug.should.eql('test');
    post.date.should.be.an.instanceof(Date);
    post.meta.should.be.a('object');

    post.meta.should.eql({
        date: null
      , visitors: null
    });

    should.strictEqual(post.published, null);

    post.owners.should.be.an.instanceof(MongooseArray);
    post.comments.should.be.an.instanceof(DocumentArray);
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

    post.comments[0].isNew.should.be.false;
    post.comments[1].isNew.should.be.false;
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
    post.title = 'test';
    post.isModified('title').should.be.true;

    post.isModified('date').should.be.false;
    post.date = Date.now()
    post.isModified('date').should.be.true;

    post.isModified('meta.date').should.be.false;
  }

};
