# FAQ

<style>
hr {
  display: block;
  margin-top: 40px;
  margin-bottom: 40px;
  border: 0px;
  height: 1px;
  background-color: #232323;
  width: 100%;
}
</style>

<hr id="operation-buffering-timed-out" />

<a class="anchor" href="#operation-buffering-timed-out">**Q**</a>. Operation `...` timed out after 10000 ms. What gives?

**A**. At its core, this issue stems from not connecting to MongoDB.
You can use Mongoose before connecting to MongoDB, but you must connect at some point. For example:

```javascript
await mongoose.createConnection(mongodbUri).asPromise();

const Test = mongoose.model('Test', schema);

await Test.findOne(); // Will throw "Operation timed out" error because didn't call `mongoose.connect()`
```

```javascript
await mongoose.connect(mongodbUri);

const db = mongoose.createConnection();

const Test = db.model('Test', schema);

await Test.findOne(); // Will throw "Operation timed out" error because `db` isn't connected to MongoDB
```

<hr id="not-local" />

<a class="anchor" href="#not-local"> **Q**</a>. I am able to connect locally but when I try to connect to MongoDB Atlas I get this error. What gives?

You must ensure that you have whitelisted your ip on [mongodb](https://www.mongodb.com/docs/atlas/security/ip-access-list/) to allow Mongoose to connect.
You can allow access from all ips with `0.0.0.0/0`.

<hr id="not-a-function" />

<a class="anchor" href="#not-a-function">**Q**</a>. x.$__y is not a function. What gives?

**A**. This issue is a result of having multiple versions of mongoose installed that are incompatible with each other.
Run `npm list | grep "mongoose"` to find and remedy the problem.
If you're storing schemas or models in a separate npm package, please list Mongoose in `peerDependencies` rather than `dependencies` in your separate package.

<hr id="unique-doesnt-work" />

<a class="anchor" href="#unique-doesnt-work">**Q**</a>. I declared a schema property as `unique` but I can still save duplicates. What gives?

**A**. Mongoose doesn't handle `unique` on its own: `{ name: { type: String, unique: true } }`
is just a shorthand for creating a [MongoDB unique index on `name`](https://www.mongodb.com/docs/manual/core/index-unique/).
For example, if MongoDB doesn't already have a unique index on `name`, the below code will not error despite the fact that `unique` is true.

```javascript
const schema = new mongoose.Schema({
  name: { type: String, unique: true }
});
const Model = db.model('Test', schema);

Model.create([{ name: 'Val' }, { name: 'Val' }], function(err) {
  console.log(err); // No error, unless index was already built
});
```

However, if you wait for the index to build using the `Model.on('index')` event, attempts to save duplicates will correctly error.

```javascript
const schema = new mongoose.Schema({
  name: { type: String, unique: true }
});
const Model = db.model('Test', schema);

Model.on('index', function(err) { // <-- Wait for model's indexes to finish
  assert.ifError(err);
  Model.create([{ name: 'Val' }, { name: 'Val' }], function(err) {
    console.log(err);
  });
});

// Promise based alternative. `init()` returns a promise that resolves
// when the indexes have finished building successfully. The `init()`
// function is idempotent, so don't worry about triggering an index rebuild.
Model.init().then(function() {
  Model.create([{ name: 'Val' }, { name: 'Val' }], function(err) {
    console.log(err);
  });
});
```

MongoDB persists indexes, so you only need to rebuild indexes if you're starting
with a fresh database or you ran `db.dropDatabase()`. In a production environment,
you should [create your indexes using the MongoDB shell](https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/)
rather than relying on mongoose to do it for you. The `unique` option for schemas is
convenient for development and documentation, but mongoose is *not* an index management solution.

<hr id="nested-properties" />

<a class="anchor" href="#nested-properties">**Q**</a>. When I have a nested property in a schema, mongoose adds empty objects by default. Why?

```javascript
const schema = new mongoose.Schema({
  nested: {
    prop: String
  }
});
const Model = db.model('Test', schema);

// The below prints `{ _id: /* ... */, nested: {} }`, mongoose assigns
// `nested` to an empty object `{}` by default.
console.log(new Model());
```

**A**. This is a performance optimization. These empty objects are not saved
to the database, nor are they in the result `toObject()`, nor do they show
up in `JSON.stringify()` output unless you turn off the [`minimize` option](guide.html#minimize).

The reason for this behavior is that Mongoose's change detection
and getters/setters are based on [`Object.defineProperty()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty).
In order to support change detection on nested properties without incurring
the overhead of running `Object.defineProperty()` every time a document is created,
mongoose defines properties on the `Model` prototype when the model is compiled.
Because mongoose needs to define getters and setters for `nested.prop`, `nested`
must always be defined as an object on a mongoose document, even if `nested`
is undefined on the underlying [POJO](guide.html#minimize).

<hr id="arrow-functions" />

<a class="anchor" href="#arrow-functions">**Q**</a>. I'm using an arrow function for a [virtual](guide.html#virtuals), [middleware](middleware.html), [getter](api/schematype.html#schematype_SchemaType-get)/[setter](api/schematype.html#schematype_SchemaType-set), or [method](guide.html#methods) and the value of `this` is wrong.

**A**. Arrow functions [handle the `this` keyword much differently than conventional functions](https://masteringjs.io/tutorials/fundamentals/arrow#why-not-arrow-functions).
Mongoose getters/setters depend on `this` to give you access to the document that you're writing to, but this functionality does not work with arrow functions. Do **not** use arrow functions for mongoose getters/setters unless do not intend to access the document in the getter/setter.

```javascript
// Do **NOT** use arrow functions as shown below unless you're certain
// that's what you want. If you're reading this FAQ, odds are you should
// just be using a conventional function.
const schema = new mongoose.Schema({
  propWithGetter: {
    type: String,
    get: v => {
      // Will **not** be the doc, do **not** use arrow functions for getters/setters
      console.log(this);
      return v;
    }
  }
});

// `this` will **not** be the doc, do **not** use arrow functions for methods
schema.method.arrowMethod = () => this;
schema.virtual('virtualWithArrow').get(() => {
  // `this` will **not** be the doc, do **not** use arrow functions for virtuals
  console.log(this);
});
```

<hr id="type-key">

<a class="anchor" href="#type-key">**Q**</a>. I have an embedded property named `type` like this:

```javascript
const holdingSchema = new Schema({
  // You might expect `asset` to be an object that has 2 properties,
  // but unfortunately `type` is special in mongoose so mongoose
  // interprets this schema to mean that `asset` is a string
  asset: {
    type: String,
    ticker: String
  }
});
```

But mongoose gives me a CastError telling me that it can't cast an object
to a string when I try to save a `Holding` with an `asset` object. Why
is this?

```javascript
Holding.create({ asset: { type: 'stock', ticker: 'MDB' } }).catch(error => {
  // Cast to String failed for value "{ type: 'stock', ticker: 'MDB' }" at path "asset"
  console.error(error);
});
```

**A**. The `type` property is special in mongoose, so when you say
`type: String`, mongoose interprets it as a type declaration. In the
above schema, mongoose thinks `asset` is a string, not an object. Do
this instead:

```javascript
const holdingSchema = new Schema({
  // This is how you tell mongoose you mean `asset` is an object with
  // a string property `type`, as opposed to telling mongoose that `asset`
  // is a string.
  asset: {
    type: { type: String },
    ticker: String
  }
});
```

<hr id="populate_sort_order" />

<a class="anchor" href="#populate_sort_order">**Q**</a>. I'm populating a nested property under an array like the below code:

```javascript
new Schema({
  arr: [{
    child: { ref: 'OtherModel', type: Schema.Types.ObjectId }
  }]
});
```

`.populate({ path: 'arr.child', options: { sort: 'name' } })` won't sort by `arr.child.name`?

**A**. See [this GitHub issue](https://github.com/Automattic/mongoose/issues/2202). It's a known issue but one that's exceptionally difficult to fix.

<hr id="model_functions_hanging" />

<a class="anchor" href="#model_functions_hanging">**Q**</a>. All function calls on my models hang, what am I doing wrong?

**A**. By default, mongoose will buffer your function calls until it can
connect to MongoDB. Read the [buffering section of the connection docs](connections.html#buffering)
for more information.

<hr id="enable_debugging" />

<a class="anchor" href="#enable_debugging">**Q**</a>. How can I enable debugging?

**A**. Set the `debug` option:

```javascript
// all executed methods log output to console
mongoose.set('debug', true);

// disable colors in debug mode
mongoose.set('debug', { color: false });

// get mongodb-shell friendly output (ISODate)
mongoose.set('debug', { shell: true });
```

For more debugging options (streams, callbacks), see the ['debug' option under `.set()`](api/mongoose.html#mongoose_Mongoose-set).

<hr id="callback_never_executes" />

<a class="anchor" href="#callback_never_executes">**Q**</a>. My `save()` callback never executes. What am I doing wrong?

**A**. All `collection` actions (insert, remove, queries, etc.) are queued
until Mongoose successfully connects to MongoDB. It is likely you haven't called Mongoose's
`connect()` or `createConnection()` function yet.

In Mongoose 5.11, there is a `bufferTimeoutMS` option (set to 10000 by default) that configures how long
Mongoose will allow an operation to stay buffered before throwing an error.

If you want to opt out of Mongoose's buffering mechanism across your entire
application, set the global `bufferCommands` option to false:

```javascript
mongoose.set('bufferCommands', false);
```

Instead of opting out of Mongoose's buffering mechanism, you may want to instead reduce `bufferTimeoutMS`
to make Mongoose only buffer for a short time.

```javascript
// If an operation is buffered for more than 500ms, throw an error.
mongoose.set('bufferTimeoutMS', 500);
```

<hr id="creating_connections" />

<a class="anchor" href="#creating_connections">**Q**</a>. Should I create/destroy a new connection for each database operation?

**A**. No. Open your connection when your application starts up and leave
it open until the application shuts down.

<hr id="overwrite-model-error" />

<a class="anchor" href="#overwrite-model-error">**Q**</a>. Why do I get "OverwriteModelError: Cannot overwrite .. model once
compiled" when I use nodemon / a testing framework?

**A**. `mongoose.model('ModelName', schema)` requires 'ModelName' to be
unique, so you can access the model by using `mongoose.model('ModelName')`.
If you put `mongoose.model('ModelName', schema);` in a
[mocha `beforeEach()` hook](https://mochajs.org/#hooks), this code will
attempt to create a new model named 'ModelName' before **every** test,
and so you will get an error. Make sure you only create a new model with
a given name **once**. If you need to create multiple models with the
same name, create a new connection and bind the model to the connection.

```javascript
const mongoose = require('mongoose');
const connection = mongoose.createConnection(/* ... */);

// use mongoose.Schema
const kittySchema = mongoose.Schema({ name: String });

// use connection.model
const Kitten = connection.model('Kitten', kittySchema);
```

<hr id="array-defaults" />

<a class="anchor" href="#array-defaults">**Q**</a>. How can I change mongoose's default behavior of initializing an array path to an empty array so that I can require real data on document creation?

**A**. You can set the default of the array to a function that returns `undefined`.

```javascript
const CollectionSchema = new Schema({
  field1: {
    type: [String],
    default: void 0
  }
});
```

<hr id="initialize-array-path-null" />
    
<a class="anchor" href="#initialize-array-path-null">**Q**</a>. How can I initialize an array path to `null`?

**A**. You can set the default of the array to a function that returns `null`.

```javascript
const CollectionSchema = new Schema({
  field1: {
    type: [String],
    default: () => { return null; }
  }
});
```

<hr id="aggregate-casting" />

<a class="anchor" href="#aggregate-casting">**Q**</a>. Why does my aggregate $match fail to return the document that my find query returns when working with dates?

**A**. Mongoose does not cast aggregation pipeline stages because with $project,
$group, etc. the type of a property may change during the aggregation. If you want
to query by date using the aggregation framework, you're responsible for ensuring
that you're passing in a valid date.

<hr id="date_changes" />

<a class="anchor" href="#date_changes">**Q**</a>. Why don't in-place modifications to date objects
(e.g. `date.setMonth(1);`) get saved?

```javascript
doc.createdAt.setDate(2011, 5, 1);
doc.save(); // createdAt changes won't get saved!
```

**A**. Mongoose currently doesn't watch for in-place updates to date
objects. If you have need for this feature, feel free to discuss on
[this GitHub issue](https://github.com/Automattic/mongoose/issues/3738).
There are several workarounds:

```javascript
doc.createdAt.setDate(2011, 5, 1);
doc.markModified('createdAt');
doc.save(); // Works

doc.createdAt = new Date(2011, 5, 1).setHours(4);
doc.save(); // Works
```

<hr id="parallel_saves" />

<a class="anchor" href="#parallel_saves">**Q**</a>. Why does calling `save()` multiple times on the same document in parallel only let
the first save call succeed and return ParallelSaveErrors for the rest?

**A**. Due to the asynchronous nature of validation and middleware in general, calling
`save()` multiple times in parallel on the same doc could result in conflicts. For example,
validating, and then subsequently invalidating the same path.

<hr id="objectid-validation" />

<a class="anchor" href="#objectid-validation">**Q**</a>. Why is **any** 12 character string successfully cast to an ObjectId?

**A**. Technically, any 12 character string is a valid [ObjectId](https://www.mongodb.com/docs/manual/reference/bson-types/#objectid).
Consider using a regex like `/^[a-f0-9]{24}$/` to test whether a string is exactly 24 hex characters.

<hr id="map-keys-strings" />

<a class="anchor" href="#map-keys-strings">**Q**</a>. Why do keys in Mongoose Maps have to be strings?

**A**. Because the Map eventually gets stored in MongoDB where the keys must be strings.

<hr id="limit-vs-perDocumentLimit" />

<a class="anchor" href="#limit-vs-perDocumentLimit">**Q**</a>. I am using `Model.find(...).populate(...)` with the `limit` option, but getting fewer results than the limit. What gives?

**A**. In order to avoid executing a separate query for each document returned from the `find` query, Mongoose
instead queries using (numDocuments * limit) as the limit. If you need the correct limit, you should use the
[perDocumentLimit](populate.html#limit-vs-perDocumentLimit) option (new in Mongoose 5.9.0). Just keep in
mind that populate() will execute a separate query for each document.

<hr id="duplicate-query" />

<a class="anchor" href="#duplicate-query">**Q**</a>. My query/update seems to execute twice. Why is this happening?

**A**. The most common cause of duplicate queries is **mixing callbacks and promises with queries**.
That's because passing a callback to a query function, like `find()` or `updateOne()`,
immediately executes the query, and calling [`then()`](https://masteringjs.io/tutorials/fundamentals/then)
executes the query again.

Mixing promises and callbacks can lead to duplicate entries in arrays.
For example, the below code inserts 2 entries into the `tags` array, **not* just 1.

```javascript
const BlogPost = mongoose.model('BlogPost', new Schema({
  title: String,
  tags: [String]
}));

// Because there's both `await` **and** a callback, this `updateOne()` executes twice
// and thus pushes the same string into `tags` twice.
const update = { $push: { tags: ['javascript'] } };
await BlogPost.updateOne({ title: 'Introduction to Promises' }, update, (err, res) => {
  console.log(res);
});
```

<hr id="add_something" />

**Something to add?**

If you'd like to contribute to this page, please [visit it](https://github.com/Automattic/mongoose/tree/master/docs/faq.md) on github and use the [Edit](https://github.com/blog/844-forking-with-the-edit-button) button to send a pull request.
