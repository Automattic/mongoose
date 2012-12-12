## What's Mongoose?

Mongoose is a [MongoDB](http://www.mongodb.org/) object modeling tool designed to work in an asynchronous environment.

Defining a model is as easy as:

    var Comment = new Schema({
        title     : String
      , body      : String
      , date      : Date
    });

    var BlogPost = new Schema({
        author    : ObjectId
      , title     : String
      , body      : String
      , buf       : Buffer
      , date      : Date
      , comments  : [Comment]
      , meta      : {
          votes : Number
        , favs  : Number
      }
    });

    var Post = mongoose.model('BlogPost', BlogPost);

## Documentation

[mongoosejs.com](http://mongoosejs.com/)

## Try it live
<a href="https://runnable.com/#learnboost/mongoose/code.js/launch" target="_blank"><img src="https://runnable.com/external/styles/assets/runnablebtn.png" style="width:67px;height:25px;"></a>
## Installation

The recommended way is through the excellent [NPM](http://www.npmjs.org/):

    $ npm install mongoose

Otherwise, you can check it in your repository and then expose it:

    $ git clone git://github.com/LearnBoost/mongoose.git node_modules/mongoose/

And install dependency modules written on `package.json`.

Then you can `require` it:

    require('mongoose')

## Connecting to MongoDB

First, we need to define a connection. If your app uses only one database, you should use `mongose.connect`. If you need to create additional connections, use `mongoose.createConnection`.

Both `connect` and `createConnection` take a `mongodb://` URI, or the parameters `host, database, port, options`.

    var mongoose = require('mongoose');

    mongoose.connect('mongodb://localhost/my_database');

Once connected, the `open` event is fired on the `Connection` instance. If you're using `mongoose.connect`, the `Connection` is `mongoose.connection`. Otherwise, `mongoose.createConnection` return value is a `Connection`.

**Important!** Mongoose buffers all the commands until it's connected to the database. This means that you don't have to wait until it connects to MongoDB in order to define models, run queries, etc.

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

Aside from defining the structure of your documents and the types of data you're storing, a Schema handles the definition of:

* [Validators](http://mongoosejs.com/docs/validation.html) (async and sync)
* [Defaults](http://mongoosejs.com/docs/api.html#schematype_SchemaType-default)
* [Getters](http://mongoosejs.com/docs/api.html#schematype_SchemaType-get)
* [Setters](http://mongoosejs.com/docs/api.html#schematype_SchemaType-set)
* [Indexes](http://mongoosejs.com/docs/guide.html#indexes)
* [Middleware](http://mongoosejs.com/docs/middleware.html)
* [Methods](http://mongoosejs.com/docs/guide.html#methods) definition
* [Statics](http://mongoosejs.com/docs/guide.html#statics) definition
* [Plugins](http://mongoosejs.com/docs/plugins.html)
* [psuedo-JOINs](http://mongoosejs.com/docs/populate.html)

The following example shows some of these features:

    var Comment = new Schema({
        name  :  { type: String, default: 'hahaha' }
      , age   :  { type: Number, min: 18, index: true }
      , bio   :  { type: String, match: /[a-z]/ }
      , date  :  { type: Date, default: Date.now }
      , buff  :  Buffer
    });

    // a setter
    Comment.path('name').set(function (v) {
      return capitalize(v);
    });

    // middleware
    Comment.pre('save', function (next) {
      notify(this.get('email'));
      next();
    });

Take a look at the example in `examples/schema.js` for an end-to-end example of a typical setup.

## Accessing a Model

Once we define a model through `mongoose.model('ModelName', mySchema)`, we can access it through the same function

    var myModel = mongoose.model('ModelName');

Or just do it all at once

    var MyModel = mongoose.model('ModelName', mySchema);

We can then instantiate it, and save it:

    var instance = new MyModel();
    instance.my.key = 'hello';
    instance.save(function (err) {
      //
    });

Or we can find documents from the same collection

    MyModel.find({}, function (err, docs) {
      // docs.forEach
    });

You can also `findOne`, `findById`, `update`, etc. For more details check out [this link](http://mongoosejs.com/docs/queries.html).

**Important!** If you opened a separate connection using `mongoose.createConnection()` but attempt to access the model through `mongoose.model('ModelName')` it will not work as expected since it is not hooked up to an active db connection. In this case access your model through the connection you created:

    var conn = mongoose.createConnection('your connection string');
    var MyModel = conn.model('ModelName', schema);
    var m = new MyModel;
    m.save() // works

    vs

    var conn = mongoose.createConnection('your connection string');
    var MyModel = mongoose.model('ModelName', schema);
    var m = new MyModel;
    m.save() // does not work b/c the default connection object was never connected

## Embedded Documents

In the first example snippet, we defined a key in the Schema that looks like:

    comments: [Comments]

Where `Comments` is a `Schema` we created. This means that creating embedded documents is as simple as:

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

Embedded documents enjoy all the same features as your models. Defaults, validators, middleware. Whenever an error occurs, it's bubbled to the `save()` error callback, so error handling is a snap!

Mongoose interacts with your embedded documents in arrays _atomically_, out of the box.

## Middleware

Middleware is one of the most exciting features about Mongoose. Middleware takes away all the pain of nested callbacks.

Middleware are defined at the Schema level and are applied for the methods `init` (when a document is initialized with data from MongoDB), `save` (when a document or embedded document is saved).

There's two types of middleware:

- Serial
  Serial middleware are defined like:

        .pre(method, function (next, methodArg1, methodArg2, ...) {
          // ...
        })

  They're executed one after the other, when each middleware calls `next`.

  You can also intercept the `method`'s incoming arguments via your middleware -- notice `methodArg1`, `methodArg2`, etc in the `pre` definition above. See section "Intercepting and mutating method arguments" below.


- Parallel
  Parallel middleware offer more fine-grained flow control, and are defined like:

        .pre(method, true, function (next, done, methodArg1, methodArg2) {
          // ...
        })

  Parallel middleware can `next()` immediately, but the final argument will be called when all the parallel middleware have called `done()`.

### Error handling

If any middleware calls `next` or `done` with an `Error` instance, the flow is interrupted, and the error is passed to the function passed as an argument.

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

For example, this would allow you to broadcast changes about your Documents every time someone `set`s a path in your Document to a new value:

    schema.pre('set', function (next, path, val, typel) {
      // `this` is the current Document
      this.emit('set', path, val);

      // Pass control to the next pre
      next();
    });

Moreover, you can mutate the incoming `method` arguments so that subsequent middleware see different values for those arguments. To do so, just pass the new values to `next`:

    .pre(method, function firstPre (next, methodArg1, methodArg2) {
      // Mutate methodArg1
      next("altered-" + methodArg1.toString(), methodArg2);
    })

    // pre declaration is chainable
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

### Schema gotcha

`type`, when used in a schema has special meaning within Mongoose. If your schema requires using `type` as a nested property you must use object notation:

    new Schema({
        broken: { type: Boolean }
      , asset : {
            name: String
          , type: String // uh oh, it broke. asset will be interpreted as String
        }
    });

    new Schema({
        works: { type: Boolean }
      , asset : {
            name: String
          , type: { type: String } // works. asset is an object with a type property
        }
    });

## API docs

You can find the [Dox](http://github.com/visionmedia/dox) generated API docs [here](http://mongoosejs.com/docs/api.html).

## Getting support

- Google Groups [mailing list](http://groups.google.com/group/mongoose-orm)
- (irc) #mongoosejs on freenode
- reporting [issues](https://github.com/learnboost/mongoose/issues/)
- [10gen](http://www.mongodb.org/display/DOCS/Technical+Support)

## Driver access

The driver being used defaults to [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) and is directly accessible through `YourModel.collection`. **Note**: using the driver directly bypasses all Mongoose power-tools like validation, getters, setters, hooks, etc.

## Mongoose Plugins

Take a peek at the [plugins search site](http://plugins.mongoosejs.com/) to see related modules from the community.

## Contributing to Mongoose

### Cloning the repository

    git clone git://github.com/LearnBoost/mongoose.git

### Guidelines

See [contributing](http://mongoosejs.com/docs/contributing.html).

## Credits

[contributors](https://github.com/learnboost/mongoose/graphs/contributors)

## License

Copyright (c) 2010-2012 LearnBoost &lt;dev@learnboost.com&gt;

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
