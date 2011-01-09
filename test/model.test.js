
/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , random = require('mongoose/utils').random;

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
  }

};
