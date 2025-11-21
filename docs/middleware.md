# Middleware

Middleware (also called pre and post *hooks*) are functions which are passed
control during execution of asynchronous functions. Middleware is specified
on the schema level and is useful for writing [plugins](plugins.html).

<ul class="toc">
  <li><a href="#types-of-middleware">Types of Middleware</a></li>
  <li><a href="#pre">Pre</a></li>
  <li><a href="#error-handling">Errors in Pre Hooks</a></li>
  <li><a href="#post">Post</a></li>
  <li><a href="#post-async">Asynchronous Post Hooks</a></li>
  <li><a href="#defining">Define Middleware Before Compiling Models</a></li>
  <li><a href="#order">Save/Validate Hooks</a></li>
  <li><a href="#accessing-parameters-in-middleware">Accessing Parameters in Middleware</a></li>
  <li><a href="#naming">Naming Conflicts</a></li>
  <li><a href="#notes">Notes on findAndUpdate() and Query Middleware</a></li>
  <li><a href="#error-handling-middleware">Error Handling Middleware</a></li>
  <li><a href="#aggregate">Aggregation Hooks</a></li>
  <li><a href="#synchronous">Synchronous Hooks</a></li>
</ul>

## Types of Middleware

Mongoose has 4 types
of middleware: document middleware, model middleware, aggregate middleware, and query middleware.

Document middleware is supported for the following document functions.
In Mongoose, a document is an instance of a `Model` class.
In document middleware functions, `this` refers to the document. To access the model, use `this.constructor`.

* [validate](api/document.html#document_Document-validate)
* [save](api/model.html#model_Model-save)
* [updateOne](api/document.html#document_Document-updateOne)
* [deleteOne](api/model.html#model_Model-deleteOne)
* [init](api/document.html#document_Document-init) (note: init hooks are [synchronous](#synchronous))

Query middleware is supported for the following Query functions.
Query middleware executes when you call `exec()` or `then()` on a Query object, or `await` on a Query object.
In query middleware functions, `this` refers to the query.

* [count](api/query.html#query_Query-count)
* [countDocuments](api/query.html#query_Query-countDocuments)
* [deleteMany](api/query.html#query_Query-deleteMany)
* [deleteOne](api/query.html#query_Query-deleteOne)
* [estimatedDocumentCount](api/query.html#query_Query-estimatedDocumentCount)
* [find](api/query.html#query_Query-find)
* [findOne](api/query.html#query_Query-findOne)
* [findOneAndDelete](api/query.html#query_Query-findOneAndDelete)
* [findOneAndReplace](api/query.html#query_Query-findOneAndReplace)
* [findOneAndUpdate](api/query.html#query_Query-findOneAndUpdate)
* [replaceOne](api/query.html#query_Query-replaceOne)
* [updateOne](api/query.html#query_Query-updateOne)
* [updateMany](api/query.html#query_Query-updateMany)
* [validate](validation.html#update-validators)

Aggregate middleware is for `MyModel.aggregate()`.
Aggregate middleware executes when you call `exec()` on an aggregate object.
In aggregate middleware, `this` refers to the [aggregation object](api/model.html#model_Model-aggregate).

* [aggregate](api/model.html#model_Model-aggregate)

Model middleware is supported for the following model functions.
Don't confuse model middleware and document middleware: model middleware hooks into *static* functions on a `Model` class, document middleware hooks into *methods* on a `Model` class.
In model middleware functions, `this` refers to the model.

* [bulkWrite](api/model.html#model_Model-bulkWrite)
* [createCollection](api/model.html#model_Model-createCollection)
* [insertMany](api/model.html#model_Model-insertMany)

Here are the possible strings that can be passed to `pre()`

* aggregate
* bulkWrite
* count
* countDocuments
* createCollection
* deleteOne
* deleteMany
* estimatedDocumentCount
* find
* findOne
* findOneAndDelete
* findOneAndReplace
* findOneAndUpdate
* init
* insertMany
* replaceOne
* save
* update
* updateOne
* updateMany
* validate

All middleware types support pre and post hooks.
How pre and post hooks work is described in more detail below.

**Note:** Mongoose registers `updateOne` middleware on `Query.prototype.updateOne()` by default.
This means that both `doc.updateOne()` and `Model.updateOne()` trigger `updateOne` hooks, but `this` refers to a query, not a document.
To register `updateOne` middleware as document middleware, use `schema.pre('updateOne', { document: true, query: false })`.

**Note:** Like `updateOne`, Mongoose registers `deleteOne` middleware on `Query.prototype.deleteOne` by default.
That means that `Model.deleteOne()` will trigger `deleteOne` hooks, and `this` will refer to a query.
However, `doc.deleteOne()` does **not** fire `deleteOne` query middleware for legacy reasons.
To register `deleteOne` middleware as document middleware, use `schema.pre('deleteOne', { document: true, query: false })`.

**Note:** The [`create()`](./api/model.html#model_Model-create) function fires `save()` hooks.

**Note:** Query middlewares are not executed on subdocuments.

```javascript
const childSchema = new mongoose.Schema({
  name: String
});

const mainSchema = new mongoose.Schema({
  child: [childSchema]
});

mainSchema.pre('findOneAndUpdate', function() {
  console.log('Middleware on parent document'); // Will be executed
});

childSchema.pre('findOneAndUpdate', function() {
  console.log('Middleware on subdocument'); // Will not be executed
});
```

## Pre {#pre}

Pre middleware functions are executed one after another.

```javascript
const schema = new Schema({ /* ... */ });
schema.pre('save', function() {
  // do stuff
});
```

You can also use a function that returns a promise, including async functions.
Mongoose will wait until the promise resolves to move on to the next middleware.

```javascript
schema.pre('save', function() {
  return doStuff().
    then(() => doMoreStuff());
});

// Or, using async functions
schema.pre('save', async function() {
  await doStuff();
  await doMoreStuff();
});

schema.pre('save', function() {
  // Will execute **after** `await doMoreStuff()` is done
});
```

### Use Cases

Middleware is useful for atomizing model logic. Here are some other ideas:

* complex validation
* removing dependent documents (removing a user removes all their blogposts)
* asynchronous defaults
* asynchronous tasks that a certain action triggers
* updating denormalized data on other documents
* saving change records

### Errors in Pre Hooks {#error-handling}

If any pre hook errors out, mongoose will not execute subsequent middleware
or the hooked function. Mongoose will instead pass an error to the callback
and/or reject the returned promise. There are several ways to report an
error in middleware:

```javascript
schema.pre('save', function() {
  const err = new Error('something went wrong');
  throw err;
});

schema.pre('save', function() {
  // You can also return a promise that rejects
  return new Promise((resolve, reject) => {
    reject(new Error('something went wrong'));
  });
});

schema.pre('save', function() {
  // You can also throw a synchronous error
  throw new Error('something went wrong');
});

schema.pre('save', async function() {
  await Promise.resolve();
  // You can also throw an error in an `async` function
  throw new Error('something went wrong');
});

// later...

// Changes will not be persisted to MongoDB because a pre hook errored out
try {
  await myDoc.save();
} catch (err) {
  console.log(err.message); // something went wrong
}
```

## Post middleware {#post}

[post](api.html#schema_Schema-post) middleware are executed *after*
the hooked method and all of its `pre` middleware have completed.

```javascript
schema.post('init', function(doc) {
  console.log('%s has been initialized from the db', doc._id);
});
schema.post('validate', function(doc) {
  console.log('%s has been validated (but not saved yet)', doc._id);
});
schema.post('save', function(doc) {
  console.log('%s has been saved', doc._id);
});
schema.post('deleteOne', function(doc) {
  console.log('%s has been deleted', doc._id);
});
```

## Asynchronous Post Hooks {#post-async}

If your post hook function takes at least 2 parameters, mongoose will assume the second parameter is a `next()` function that you will call to trigger the next middleware in the sequence.

```javascript
// Takes 2 parameters: this is an asynchronous post hook
schema.post('save', function(doc, next) {
  setTimeout(function() {
    console.log('post1');
    // Kick off the second post hook
    next();
  }, 10);
});

// Will not execute until the first middleware calls `next()`
schema.post('save', function(doc, next) {
  console.log('post2');
  next();
});
```

You can also pass an async function to `post()`.
If you pass an async function that takes at least 2 parameters, you are still responsible for calling `next()`.
However, you can also pass in an async function that takes less than 2 parameters, and Mongoose will wait for the promise to resolve.

```javascript
schema.post('save', async function(doc) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('post1');
  // If less than 2 parameters, no need to call `next()`
});

schema.post('save', async function(doc, next) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('post1');
  // If there's a `next` parameter, you need to call `next()`.
  next();
});
```

## Define Middleware Before Compiling Models {#defining}

Calling `pre()` or `post()` after [compiling a model](models.html#compiling)
does **not** work in Mongoose in general. For example, the below `pre('save')`
middleware will not fire.

```javascript
const schema = new mongoose.Schema({ name: String });

// Compile a model from the schema
const User = mongoose.model('User', schema);

// Mongoose will **not** call the middleware function, because
// this middleware was defined after the model was compiled
schema.pre('save', () => console.log('Hello from pre save'));

const user = new User({ name: 'test' });
user.save();
```

This means that you must add all middleware and [plugins](plugins.html)
**before** calling [`mongoose.model()`](api/mongoose.html#mongoose_Mongoose-model).
The below script will print out "Hello from pre save":

```javascript
const schema = new mongoose.Schema({ name: String });
// Mongoose will call this middleware function, because this script adds
// the middleware to the schema before compiling the model.
schema.pre('save', () => console.log('Hello from pre save'));

// Compile a model from the schema
const User = mongoose.model('User', schema);

const user = new User({ name: 'test' });
user.save();
```

As a consequence, be careful about exporting Mongoose models from the same
file that you define your schema. If you choose to use this pattern, you
must define [global plugins](api/mongoose.html#mongoose_Mongoose-plugin)
**before** calling `require()` on your model file.

```javascript
const schema = new mongoose.Schema({ name: String });

// Once you `require()` this file, you can no longer add any middleware
// to this schema.
module.exports = mongoose.model('User', schema);
```

## Save/Validate Hooks {#order}

The `save()` function triggers `validate()` hooks, because mongoose
has a built-in `pre('save')` hook that calls `validate()`. This means
that all `pre('validate')` and `post('validate')` hooks get called
**before** any `pre('save')` hooks.

```javascript
schema.pre('validate', function() {
  console.log('this gets printed first');
});
schema.post('validate', function() {
  console.log('this gets printed second');
});
schema.pre('save', function() {
  console.log('this gets printed third');
});
schema.post('save', function() {
  console.log('this gets printed fourth');
});
```

## Accessing Parameters in Middleware {#accessing-parameters-in-middleware}

Mongoose provides 2 ways to get information about the function call that triggered the middleware.
For query middleware, we recommend using `this`, which will be a [Mongoose Query instance](api/query.html).

```javascript
const userSchema = new Schema({ name: String, age: Number });
userSchema.pre('findOneAndUpdate', function() {
  console.log(this.getFilter()); // { name: 'John' }
  console.log(this.getUpdate()); // { age: 30 }
});
const User = mongoose.model('User', userSchema);

await User.findOneAndUpdate({ name: 'John' }, { $set: { age: 30 } });
```

Mongoose also passes the 1st parameter to the hooked function, like `save()`, as the 1st argument to your `pre('save')` function.
You should use the argument to get access to the `save()` call's `options`, because Mongoose documents don't store all the options you can pass to `save()`.

```javascript
const userSchema = new Schema({ name: String, age: Number });
userSchema.pre('save', function(options) {
  options.validateModifiedOnly; // true
});
const User = mongoose.model('User', userSchema);

const doc = new User({ name: 'John', age: 30 });
await doc.save({ validateModifiedOnly: true });
```

## Naming Conflicts {#naming}

Mongoose has both query and document hooks for `deleteOne()`.

```javascript
schema.pre('deleteOne', function() { console.log('Removing!'); });

// Does **not** print "Removing!". Document middleware for `deleteOne` is not executed by default
await doc.deleteOne();

// Prints "Removing!"
await Model.deleteOne();
```

You can pass options to [`Schema.pre()`](api.html#schema_Schema-pre)
and [`Schema.post()`](api.html#schema_Schema-post) to switch whether
Mongoose calls your `deleteOne()` hook for [`Document.prototype.deleteOne()`](api/model.html#Model.prototype.deleteOne())
or [`Query.prototype.deleteOne()`](api/query.html#Query.prototype.deleteOne()). Note here that you need to set both `document` and `query` properties in the passed object:

```javascript
// Only document middleware
schema.pre('deleteOne', { document: true, query: false }, function() {
  console.log('Deleting doc!');
});

// Only query middleware. This will get called when you do `Model.deleteOne()`
// but not `doc.deleteOne()`.
schema.pre('deleteOne', { query: true, document: false }, function() {
  console.log('Deleting!');
});
```

Mongoose also has both query and document hooks for `validate()`.
Unlike `deleteOne` and `updateOne`, `validate` middleware applies to `Document.prototype.validate` by default.

```javascript
const schema = new mongoose.Schema({ name: String });
schema.pre('validate', function() {
  console.log('Document validate');
});
schema.pre('validate', { query: true, document: false }, function() {
  console.log('Query validate');
});
const Test = mongoose.model('Test', schema);

const doc = new Test({ name: 'foo' });

// Prints "Document validate"
await doc.validate();

// Prints "Query validate"
await Test.find().validate();
```

## Notes on `findAndUpdate()` and Query Middleware {#notes}

Pre and post `save()` hooks are **not** executed on `update()`,
`findOneAndUpdate()`, etc. You can see a more detailed discussion why in
[this GitHub issue](http://github.com/Automattic/mongoose/issues/964).
Mongoose 4.0 introduced distinct hooks for these functions.

```javascript
schema.pre('find', function() {
  console.log(this instanceof mongoose.Query); // true
  this.start = Date.now();
});

schema.post('find', function(result) {
  console.log(this instanceof mongoose.Query); // true
  // prints returned documents
  console.log('find() returned ' + JSON.stringify(result));
  // prints number of milliseconds the query took
  console.log('find() took ' + (Date.now() - this.start) + ' milliseconds');
});
```

Query middleware differs from document middleware in a subtle but
important way: in document middleware, `this` refers to the document
being updated. In query middleware, mongoose doesn't necessarily have
a reference to the document being updated, so `this` refers to the
**query** object rather than the document being updated.

For instance, if you wanted to add an `updatedAt` timestamp to every
`updateOne()` call, you would use the following pre hook.

```javascript
schema.pre('updateOne', function() {
  this.set({ updatedAt: new Date() });
});
```

You **cannot** access the document being updated in `pre('updateOne')` or
`pre('findOneAndUpdate')` query middleware. If you need to access the document
that will be updated, you need to execute an explicit query for the document.

```javascript
schema.pre('findOneAndUpdate', async function() {
  const docToUpdate = await this.model.findOne(this.getQuery());
  console.log(docToUpdate); // The document that `findOneAndUpdate()` will modify
});
```

However, if you define `pre('updateOne')` document middleware,
`this` will be the document being updated. That's because `pre('updateOne')`
document middleware hooks into [`Document#updateOne()`](api/document.html#document_Document-updateOne)
rather than `Query#updateOne()`.

```javascript
schema.pre('updateOne', { document: true, query: false }, function() {
  console.log('Updating');
});
const Model = mongoose.model('Test', schema);

const doc = new Model();
await doc.updateOne({ $set: { name: 'test' } }); // Prints "Updating"

// Doesn't print "Updating", because `Query#updateOne()` doesn't fire
// document middleware.
await Model.updateOne({}, { $set: { name: 'test' } });
```

## Error Handling Middleware {#error-handling-middleware}

Middleware execution normally stops the first time a piece of middleware throws an error, or returns a promise that rejects.
However, there is a special kind of post middleware called "error handling middleware" that executes specifically when an error occurs.
Error handling middleware is useful for reporting
errors and making error messages more readable.

Error handling middleware is defined as middleware that takes one extra
parameter: the 'error' that occurred as the first parameter to the function.
Error handling middleware can then transform the error however you want.

```javascript
const schema = new Schema({
  name: {
    type: String,
    // Will trigger a MongoServerError with code 11000 when
    // you save a duplicate
    unique: true
  }
});

// Handler **must** take 3 parameters: the error that occurred, the document
// in question, and the `next()` function
schema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('There was a duplicate key error'));
  } else {
    next();
  }
});

// Will trigger the `post('save')` error handler
Person.create([{ name: 'Axl Rose' }, { name: 'Axl Rose' }]);
```

Error handling middleware also works with query middleware. You can
also define a post `update()` hook that will catch MongoDB duplicate key
errors.

```javascript
// The same E11000 error can occur when you call `updateOne()`
// This function **must** take exactly 3 parameters.

schema.post('updateOne', function(error, res, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    throw new Error('There was a duplicate key error');
  } else {
    next();
  }
});

const people = [{ name: 'Axl Rose' }, { name: 'Slash' }];
await Person.create(people);

// Throws "There was a duplicate key error"
await Person.updateOne({ name: 'Slash' }, { $set: { name: 'Axl Rose' } });
```

Error handling middleware can transform an error, but it can't remove the error.
Even if the error handling middleware succeeds, the function call will still error out.

## Aggregation Hooks {#aggregate}

You can also define hooks for the [`Model.aggregate()` function](api/model.html#model_Model-aggregate).
In aggregation middleware functions, `this` refers to the [Mongoose `Aggregate` object](api/aggregate.html#Aggregate).
For example, suppose you're implementing soft deletes on a `Customer` model
by adding an `isDeleted` property. To make sure `aggregate()` calls only look
at customers that aren't soft deleted, you can use the below middleware to
add a [`$match` stage](api/aggregate.html#aggregate_Aggregate-match) to the beginning
of each [aggregation pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/).

```javascript
customerSchema.pre('aggregate', function() {
  // Add a $match state to the beginning of each pipeline.
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
});
```

The [`Aggregate#pipeline()` function](api/aggregate.html#aggregate_Aggregate-pipeline)
lets you access the MongoDB aggregation pipeline that Mongoose will send to
the MongoDB server. It is useful for adding stages to the beginning of the
pipeline from middleware.

## Synchronous Hooks {#synchronous}

Certain Mongoose hooks are synchronous, which means they do **not** support functions that return promises.
Currently, only `init` hooks are synchronous, because the [`init()` function](api/document.html#document_Document-init) is synchronous.
Below is an example of using pre and post init hooks.

```acquit
[require:post init hooks.*success]
```

To report an error in an init hook, you must throw a **synchronous** error.
Unlike all other middleware, init middleware does **not** handle promise
rejections.

```acquit
[require:post init hooks.*error]
```

## Next Up {#next}

Now that we've covered middleware, let's take a look at Mongoose's approach
to faking JOINs with its query [population](populate.html) helper.
