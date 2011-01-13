
/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

/**
 * Schema definition
 */

var BlogPost = new Schema({
    title     : String
  , slug      : String
  , date      : Date
  , comments  : [Comments]
});

// recursive embedded-document schema

var Comments = new Schema({
    title     : String
  , date      : Date
  , body      : String
  , comments  : [Comments]
});

/**
 * Accessing a specific schema type by key
 */

BlogPost.key('date')
  .default(function(){
     return new Date()
   })
  .setter(function(v){
     return v == 'now' ? new Date() : v;
   });

/**
 * Pre hook.
 */

BlogPost.pre('save', function(next, done){
  emailAuthor(done); // some async function
  next();
});

/**
 * Plugins
 */

function slugGenerator (options){
  var key = options.key || 'title';
  
  return function slugGenerator(schema){
    schema.key(key).setter(function(){
      this.slug = v.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/-+/g, '');
      return v;
    });
  };
};

BlogPost.use(slugGenerator());

/**
 * Define model.
 */

Mongoose.model('BlogPost', BlogPost);
