
/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , random = require('mongoose/utils').random
  , Schema = mongoose.Schema;

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
  }

};
