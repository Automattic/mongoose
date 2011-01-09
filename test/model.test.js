
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , random = require('mongoose/utils').random
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
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
  }

};
