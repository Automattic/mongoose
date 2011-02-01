
Embedded Documents
==================

Embedded documents are documents with schemas of their own that are part of
other documents (as items within an array).

Embedded documents enjoy all the same features as your models. Defaults,
validators, middleware. Whenever an error occurs, it's bubbled to the `save()`
error callback, so error handling is a snap!

Mongoose interacts with your embedded documents in arrays _atomically_, out of
the box.

## Definition and initialization

When you define a Schema like this:

    var Comments = new Schema({
        title     : String
      , body      : String
      , date      : Date
    });

    var BlogPost = new Schema({
        author    : ObjectId
      , title     : String
      , body      : String
      , date      : Date
      , comments  : [Comments]
      , meta      : {
            votes : Number
          , favs  : Number
        }
    });

    mongoose.model('BlogPost', BlogPost);

The `comments` key of your `BlogPost` documents will then be an instance of
`DocumentArray`. This is a special subclassed `Array` that can deal with
casting, and has special methods to work with embedded documents.

## Adding an embedded document to an array

    // retrieve my model
    var BlogPost = mongoose.model('BlogPost');

    // create a blog post
    var post = new BlogPost();

    // create a comment
    post.comments.push({ title: 'My comment' });

    post.save(function (err) {
      if (!err) console.log('Success!');
    });

## Removing an embedded document

    BlogPost.findById(myId, function (err, post) {
      if (!err) {
        post.comments[0].remove();
        post.save(function (err) {
          // do something
        });
      }
    });

## Finding an embedded document by id

`DocumentArray`s have an special method `id` that filters your embedded
documents by their `_id` property (each embedded document gets one):

Consider the following snippet:

    post.comments.id(my_id).remove();
    post.save(function (err) {
      // embedded comment with id `my_id` removed!
    });
