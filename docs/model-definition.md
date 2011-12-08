Defining a model
================

Models are defined by passing a `Schema` instance to `mongoose.model`.

    mongoose.model('MyModel', mySchema);
    // mySchema is <a Schema>

You can easily access the `Schema` constructor from the `mongoose` singleton:

    var mongoose = require('mongoose')
      , Schema = mongoose.Schema;

    var mySchema = new Schema({
        // my props
    });

Models are then accessed from `mongoose` if you want to use a single
connection:

    // connect the `mongoose` instance
    mongoose.connect('mongodb://host/db');

    var BlogPost = mongoose.model('BlogPost');

Or from a `Connection` instance if you want to use multiple
databases/connections:

    var db = mongoose.createConnection('mongodb://host/db')
      , BlogPost = db.model('BlogPost');

**Important**: the actual interaction with the data happens with the `Model`
that you obtain through `mongoose.model` or `db.model`. That's the object that
you can instantiate or that you can call `.find()`, `.findOne()`, etc upon.
Don't confuse schemas and actual models!

## Defining your keys

The `Schema` constructor receives an object representation of your schemas as
its first parameter. If you want to add more keys later, `Schema#add` provides
the same functionality.

Your schema is constructed by passing all the
JavaScript natives that you know (String, Number, Date, Buffer) as well
as others exclusive to MongoDb (for example `Schema.ObjectId`). For details on all
SchemaTypes see the [Schema Type chapter](/docs/schematypes.html).

    var ObjectId = Schema.ObjectId;

    var PostSchema = new Schema({
        owner   : ObjectId
      , title   : String
      , date    : Date
    });

### Defining documents within documents

To define an array of documents that follows a certain schema, make the value
an array with the schema constructor inside.

For example, let's assume we want to have a collection of comments within a
blogpost, and we want them to be subject to casting, validation, and other
functionality provided by models:

    var Comment = new Schema({
        body  : String
      , date  : Date
    });

    var Post = new Schema({
        title     : String
      , comments  : [Comment]
    });

This will allow you to interact very easily with subdocuments later on. For
more information, refer to the chapter on
[embedded documents](/docs/embedded-documents.html).

### Defining custom options for keys

Each key that you define is internally mapped to a `SchemaType`. Bear in mind, a
Schema is not something that you interact directly with, but it's a way to
describe to Mongoose what your want your data to look like, and how you want
it to behave.

`SchemaType`s take care of validation, casting, defaults, and other general
options. Some functionality is exclusive to certain types of `SchemaType`s, for
example only numbers support `min` and `max` values.

In order to customize some of these options directly from the definition of
your model, set your key to an object with the format `{ type: Type, ... }`.

      var Person = new Schema({
          title   : { type: String, required: true }
        , age     : { type: Number, min: 5, max: 20 }
        , meta    : {
              likes : [String]
            , birth : { type: Date, default: Date.now }
          }
      });

Those options are functions that are called on each SchemaType.
If you want to define options later on, you could access a certain key through
the `path` function:

    Person.path('age').max(400);

    Person.path('meta.birth').set(function (v) {
      // this is a setter
    });

    Person.path('title').validate(function (v) {
      return v.length > 50;
    });

Some of the options are versatile. `default` takes a `Function` or a value.
`validate` takes a `Function` or a `RegExp`. More information on these can be
found in the [Schema Type chapter](/docs/schematypes.html).

## Beyond keys: Middleware

Middleware are special user-defined functions that are called transparently
when certain native methods are called on `Document` instances (`init`, `save`
and `remove`).

Let's say that you want to email a certain user when his document changes.
You'd then define a hook on the User schema like this:

    User.pre('save', function (next) {
      email(this.email, 'Your record has changed');
      next();
    });

More information about the specifics of middleware can be found [here](/docs/middleware.html).

## Instance Methods and Static methods

For details about defining your own custom static and instance methods read [this](/docs/methods-statics.html).

## Plugins

Schemas also support plugins. Read more about it on the [Plugins](/docs/plugins.html) page.
