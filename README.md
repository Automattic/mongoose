Mongoose 1.0
============

## What's Mongoose?

Mongoose is a MongoDB object modeling tool designed to work in an asynchronous
environment.

Defining a model is as easy as:

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

## Installation

The recommended way is through the excellent NPM:

    $ npm install mongoose

Otherwise, you can check it in your repository and then expose it:

    $ git clone git@github.com:LearnBoost/mongoose.git support/mongoose/

    // in your code
    require.paths.unshift('support/mongoose/lib')

Then you can require it:

    require('mongoose')

## Connecting to MongoDB

First, we need to define a connection. If your app uses only one database, you
should use `mongose.connect`. If you need to create additional connections, use
`mongoose.createConnection`.

Both `connect` and `createConnection` take a `mongodb://` URI, or the parameters
`host, database, port`.

    var mongoose = require('mongoose');

    mongoose.connect('mongodb://localhost/my_database');

Once connected, the `open` event is fired on the `Connection` instance. If
you're using `mongoose.connect`, the `Connection` is `mongoose.connection`.
Otherwise, `mongoose.createConnection` return value is a `Connection`.

**Important!** Mongoose buffers all the commands until it's connected to the
database. This means that you don't have to wait until it connects to MongoDB
in order to define models, run queries, etc.

## Defining a Model

Models are defined through the `Schema` interface. 

    var Schema = mongoose.Schema
      , ObjectId = Schema.ObjectId;

    var BlogPost = new Schema({
        author    : ObjectId
      , title     : String
      , body      : String
      , date      : Date
    });

Aside from defining the structure of your documents and the types of data you're
storing, a Schema handles the definition of:

* Validators (async and sync)
* Defaults
* Getters
* Setters
* Indexes
* Middleware
* Methods definition
* Statics definition
* Plugins

The following example shows some of these features:

    var Comment = new Schema({
        name  :  { type: String, default: 'hahaha' }
      , age   :  { type: Number, min: 18, index: true }
      , bio   :  { type: String, match: /[a-z]/ }
      , date  :  { type: Date, default: Date.now }
    });

    // a setter
    Comment.path('name').set(function (v) {
      return v.capitalize();
    });

    // middleware
    Comment.pre('save', function (next) {
        notify(this.get('email'));
        next();
    });

Take a look at the example in `examples/schema.js` for an end-to-end example of
(almost) all the functionality available.

## Accessing a Model

Once we define a model through `mongoose.model('ModelName', mySchema)`, we can
access it through the same function

    var myModel = mongoose.model('ModelName');

We can then instantiate it, and save it:

    var instance = new myModel();
    instance.my.key = 'hello';
    instance.save(function (err) {
      //
    });

Or we can find documents from the same collection

    myModel.find({}, function (err, docs) {
      // docs.forEach
    });

You can also `findOne`, `findById`, `update`, etc. For more details check out
the API docs.

## Embedded Documents

In the first example snippet, we defined a key in the Schema that looks like:

    comments: [Comments]

Where `Comments` is a `Schema` we created. This means that creating embedded
documents is as simple as:

    // retrieve my model
    var BlogPost = mongoose.model('BlogPost');

    // create a blog post
    var post = new BlogPost();

    // create a comment
    post.comments.push({ title: 'My comment' });

    post.save(function (err) {
      if (!err) console.log('Success!');
    });

The same goes for removing them:

    BlogPost.findById(myId, function (err, post) {
      if (!err) {
        post.comments[0].remove();
        post.save(function (err) {
          // do something
        });
      }
    });

Embedded documents enjoy all the same features as your models. Defaults,
validators, middleware. Whenever an error occurs, it's bubbled to the `save()`
error callback, so error handling is a snap!

Mongoose interacts with your embedded documents in arrays _atomically_, out of
the box.

## Middleware

Middleware is one of the most exciting features about Mongoose 1.0. Middleware
takes away all the pain of nested callbacks.

Middleware are defined at the Schema level and are applied when the methods
`init` (when a document is initialized with data from MongoDB), `save` (when
a document or embedded document is saved).

There's two types of middleware:

- Serial
  Serial middleware are defined like:

        .pre(method, function (next, methodArg1, methodArg2, ...) {
          // ...
        })

  They're executed one after the other, when each middleware calls `next`.

  You can also intercept the `method`'s incoming arguments via your middleware -- 
  notice `methodArg1`, `methodArg2`, etc in the `pre` definition above. See
  section "Intercepting and mutating method arguments" below.
  

- Parallel
  Parallel middleware offer more fine-grained flow control, and are defined
  like

        .pre(method, function (next, done, methodArg1, methodArg2) {
          // ...
        }, true)

  Parallel middleware can `next()` immediately, but the final argument will be
  called when all the parallel middleware have called `done()`.

### Error handling

If any middleware calls `next` or `done` with an `Error` instance, the flow is
interrupted, and the error is passed to the function passed as an argument.

For example:

    schema.pre('save', function (next) {
        // something goes wrong
        next(new Error('something went wrong'));
    });

    // later...

    myModel.save(function (err) {
      // err can come from a middleware
    });

### Intercepting and mutating method arguments

You can intercept method arguments via middleware.

For example, this would allow you to broadcast changes about your Documents
every time someone `set`s a path in your Document to a new value:

```javascript
schema.pre('set', function (next, path, val, typel) {
  // `this` is the current Document
  this.emit('set', path, val);
      
  // Pass control to the next pre
  next();
});
```

Moreover, you can mutate the incoming `method` arguments so that subsequent
middleware see different values for those arguments. To do so, just pass the
new values to `next`:

```javascript
.pre(method, function firstPre (next, methodArg1, methodArg2) {
  // Mutate methodArg1
  next("altered-" + methodArg1.toString(), methodArg2);
}) // pre declaration is chainable
.pre(method, function secondPre (next, methodArg1, methodArg2) {
  console.log(methodArg1);
  // => 'altered-originalValOfMethodArg1' 
  
  console.log(methodArg2);
  // => 'originalValOfMethodArg2' 
  
  // Passing no arguments to `next` automatically passes along the current argument values
  // i.e., the following `next()` is equivalent to `next(methodArg1, methodArg2)`
  // and also equivalent to, with the example method arg 
  // values, `next('altered-originalValOfMethodArg1', 'originalValOfMethodArg2')`
  next();
})
```

## API docs

You can find the [Dox](http://github.com/visionmedia/dox) generated API docs at
[http://mongoosejs.com](http://mongoosejs.com).

## Getting support

Please subscribe to the Google Groups [mailing
list](http://groups.google.com/group/mongoose-orm/boxsubscribe).

## Mongoose Plugins

The following plugins are currently available for use with mongoose:

- [mongoose-types](https://github.com/bnoguchi/mongoose-types) - Adds
  several additional types (e.g., Email) that you can use in your
  Schema declarations
- [mongoose-auth](https://github.com/bnoguchi/mongoose-auth) - A drop in 
  solution for your auth needs. Currently supports Password, Facebook,
  Twitter, Github, and more.

## Contributing to Mongoose

### Cloning the repository

Make a fork of `mongoose`, then clone it in your computer. The `master` branch
contains the current stable release, and the `develop` branch the next upcoming
major release.

If `master` is at `1.0`, `develop` will contain the upcoming `1.1` (or `2.0` if
the `1` branch is nearing its completion).

### Guidelines

- Please write inline documentation for new methods or class members.
- Please write tests and make sure your tests pass.
- Before starting to write code, look for existing tickets or create one for
  your specifc issue (unless you're addressing something that's clearly broken).
  That way you avoid working on something that might not be of interest or that
  has been addressed already in a different branch.

## Credits

- Guillermo Rauch - guillermo@learnboost.com - [Guille](http://github.com/guille)
- Nathan White - [nw](http://github.com/nw/)
- Brian Noguchi - [bnoguchi](https://github.com/bnoguchi)
- Aaron Heckmann - [aheckmann](https://github.com/aheckmann)

## License

Copyright (c) 2010 LearnBoost &lt;dev@learnboost.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
