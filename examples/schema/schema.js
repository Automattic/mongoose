
/**
 * Module dependencies.
 */

var mongoose = require('../../lib')
  , Schema = mongoose.Schema;

/**
 * Schema definition
 */

// recursive embedded-document schema

var Comment = new Schema();

Comment.add({
  title     : { type: String, index: true }
  , date      : Date
  , body      : String
  , comments  : [Comment]
});

var BlogPost = new Schema({
  title     : { type: String, index: true }
  , slug      : { type: String, lowercase: true, trim: true }
  , date      : Date
  , buf       : Buffer
  , comments  : [Comment]
  , creator   : Schema.ObjectId
});

var Person = new Schema({
  name: {
    first: String
      , last : String
  }
  , email: { type: String, required: true, index: { unique: true, sparse: true } }
  , alive: Boolean
});

/**
 * Accessing a specific schema type by key
 */

BlogPost.path('date')
.default(function() {
    return new Date();
  })
.set(function(v) {
    return v == 'now' ? new Date() : v;
  });

/**
 * Pre hook.
 */

BlogPost.pre('save', function(next, done) {
  /* global emailAuthor */
  emailAuthor(done); // some async function
  next();
});

/**
 * Methods
 */

BlogPost.methods.findCreator = function(callback) {
  return this.db.model('Person').findById(this.creator, callback);
};

BlogPost.statics.findByTitle = function(title, callback) {
  return this.find({ title: title }, callback);
};

BlogPost.methods.expressiveQuery = function(creator, date, callback) {
  return this.find('creator', creator).where('date').gte(date).run(callback);
};

/**
 * Plugins
 */

function slugGenerator(options) {
  options = options || {};
  var key = options.key || 'title';

  return function slugGenerator(schema) {
    schema.path(key).set(function(v) {
      this.slug = v.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/-+/g, '');
      return v;
    });
  };
}

BlogPost.plugin(slugGenerator());

/**
 * Define model.
 */

mongoose.model('BlogPost', BlogPost);
mongoose.model('Person', Person);
