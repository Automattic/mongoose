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
* [remove](api/model.html#model_Model-remove)
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
* [findOneAndRemove](api/query.html#query_Query-findOneAndRemove)
* [findOneAndReplace](api/query.html#query_Query-findOneAndReplace)
* [findOneAndUpdate](api/query.html#query_Query-findOneAndUpdate)
* [remove](api/model.html#model_Model-remove)
* [replaceOne](api/query.html#query_Query-replaceOne)
* [update](api/query.html#query_Query-update)
* [updateOne](api/query.html#query_Query-updateOne)
* [updateMany](api/query.html#query_Query-updateMany)
* [validate](validation.html#update-validators)

Aggregate middleware is for `MyModel.aggregate()`.
Aggregate middleware executes when you call `exec()` on an aggregate object.
In aggregate middleware, `this` refers to the [aggregation object](api/model.html#model_Model-aggregate).

* [aggregate](api/model.html#model_Model-aggregate)

Model middleware is supported for the following model functions.
Don't confuse model middleware and document middleware: model middleware hooks into _static_ functions on a `Model` class, document middleware hooks into _methods_ on a `Model` class.
In model middleware functions, `this` refers to the model.

* [insertMany](api/model.html#model_Model-insertMany)

Here are the possible strings that can be passed to `pre()`

* aggregate
* count
* countDocuments
* deleteOne
* deleteMany
* estimatedDocumentCount
* find
* findOne
* findOneAndDelete
* findOneAndRemove
* findOneAndReplace
* findOneAndUpdate
* init
* insertMany
* remove
* replaceOne
* save
* update
* updateOne
* updateMany
* validate

All middleware types support pre and post hooks.
How pre and post hooks work is described in more detail below.

**Note:** If you specify `schema.pre('remove')`, Mongoose will register this
middleware for [`doc.remove()`](api/model.html#model_Model-remove) by default. If you
want your middleware to run on [`Query.remove()`](api/query.html#query_Query-remove)
use [`schema.pre('remove', { query: true, document: false }, fn)`](api/schema.html#schema_Schema-pre).

**Note:** Unlike `schema.pre('remove')`, Mongoose registers `updateOne` and
`deleteOne` middleware on `Query#updateOne()` and `Query#deleteOne()` by default.
This means that both `doc.updateOne()` and `Model.updateOne()` trigger
`updateOne` hooks, but `this` refers to a query, not a document. To register
`updateOne` or `deleteOne` middleware as document middleware, use
`schema.pre('updateOne', { document: true, query: false })`.

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

<h2 id="pre"><a href="#pre">Pre</a></h2>

Pre middleware functions are executed one after another, when each
middleware calls `next`.

```javascript
const schema = new Schema({ /* ... */ });
schema.pre('save', function(next) {
  // do stuff
  next();
});
```

In [mongoose 5.x](http://thecodebarbarian.com/introducing-mongoose-5.html#promises-and-async-await-with-middleware), instead of calling `next()` manually, you can use a
function that returns a promise. In particular, you can use [`async/await`](http://thecodebarbarian.com/common-async-await-design-patterns-in-node.js.html).

```javascript
schema.pre('save', function() {
  return doStuff().
    then(() => doMoreStuff());
});

// Or, in Node.js >= 7.6.0:
schema.pre('save', async function() {
  await doStuff();
  await doMoreStuff();
});
```

If you use `next()`, the `next()` call does **not** stop the rest of the code in your middleware function from executing. Use
[the early `return` pattern](https://www.bennadel.com/blog/2323-use-a-return-statement-when-invoking-callbacks-especially-in-a-guard-statement.htm)
to prevent the rest of your middleware function from running when you call `next()`.

```javascript
const schema = new Schema({ /* ... */ });
schema.pre('save', function(next) {
  if (foo()) {
    console.log('calling next!');
    // `return next();` will make sure the rest of this function doesn't run
    /* return */ next();
  }
  // Unless you comment out the `return` above, 'after next' will print
  console.log('after next');
});
```

<h3 id="use-cases"><a href="#use-cases">Use Cases</a></h3>

Middleware are useful for atomizing model logic. Here are some other ideas:

* complex validation
* removing dependent documents (removing a user removes all their blogposts)
* asynchronous defaults
* asynchronous tasks that a certain action triggers

<h3 id="error-handling"><a href="#error-handling">Errors in Pre Hooks</a></h3>

If any pre hook errors out, mongoose will not execute subsequent middleware
or the hooked function. Mongoose will instead pass an error to the callback
and/or reject the returned promise. There are several ways to report an
error in middleware:

```javascript
schema.pre('save', function(next) {
  const err = new Error('something went wrong');
  // If you call `next()` with an argument, that argument is assumed to be
  // an error.
  next(err);
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
myDoc.save(function(err) {
  console.log(err.message); // something went wrong
});
```

Calling `next()` multiple times is a no-op. If you call `next()` with an
error `err1` and then throw an error `err2`, mongoose will report `err1`.

<h2 id="post"><a href="#post">Post middleware</a></h2>

[post](api.html#schema_Schema-post) middleware are executed _after_
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
schema.post('remove', function(doc) {
  console.log('%s has been removed', doc._id);
});
```

<h2 id="post-async"><a href="#post-async">Asynchronous Post Hooks</a></h2>

If your post hook function takes at least 2 parameters, mongoose will
assume the second parameter is a `next()` function that you will call to
trigger the next middleware in the sequence.

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

<h2 id="defining"><a href="#defining">Define Middleware Before Compiling Models</a></h2>

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

<h2 id="order"><a href="#order">Save/Validate Hooks</a></h2>

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

<h2 id="naming"><a href="#naming">Naming Conflicts</a></h2>

Mongoose has both query and document hooks for `remove()`.

```javascript
schema.pre('remove', function() { console.log('Removing!'); });

// Prints "Removing!"
doc.remove();

// Does **not** print "Removing!". Query middleware for `remove` is not
// executed by default.
Model.remove();
```

You can pass options to [`Schema.pre()`](api.html#schema_Schema-pre)
and [`Schema.post()`](api.html#schema_Schema-post) to switch whether
Mongoose calls your `remove()` hook for [`Document.remove()`](api/model.html#model_Model-remove)
or [`Model.remove()`](api/model.html#model_Model-remove). Note here that you need to set both `document` and `query` properties in the passed object:

```javascript
// Only document middleware
schema.pre('remove', { document: true, query: false }, function() {
  console.log('Removing doc!');
});

// Only query middleware. This will get called when you do `Model.remove()`
// but not `doc.remove()`.
schema.pre('remove', { query: true, document: false }, function() {
  console.log('Removing!');
});
```

<h2 id="notes"><a href="#notes">Notes on findAndUpdate() and Query Middleware</a></h2>

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

<h2 id="error-handling-middleware"><a href="#error-handling-middleware">Error Handling Middleware</a></h2>

_New in 4.5.0_

Middleware execution normally stops the first time a piece of middleware
calls `next()` with an error. However, there is a special kind of post
middleware called "error handling middleware" that executes specifically
when an error occurs. Error handling middleware is useful for reporting
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
// The same E11000 error can occur when you call `update()`
// This function **must** take 3 parameters. If you use the
// `passRawResult` function, this function **must** take 4
// parameters
schema.post('update', function(error, res, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('There was a duplicate key error'));
  } else {
    next(); // The `update()` call will still error out.
  }
});

const people = [{ name: 'Axl Rose' }, { name: 'Slash' }];
Person.create(people, function(error) {
  Person.update({ name: 'Slash' }, { $set: { name: 'Axl Rose' } }, function(error) {
    // `error.message` will be "There was a duplicate key error"
  });
});
```

Error handling middleware can transform an error, but it can't remove the
error. Even if you call `next()` with no error as shown above, the
function call will still error out.

<h2 id="aggregate"><a href="#aggregate">Aggregation Hooks</a></h2>

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

<h2 id="synchronous"><a href="#synchronous">Synchronous Hooks</a></h2>

Certain Mongoose hooks are synchronous, which means they do **not** support
functions that return promises or receive a `next()` callback. Currently,
only `init` hooks are synchronous, because the [`init()` function](api/document.html#document_Document-init)
is synchronous. Below is an example of using pre and post init hooks.

```acquit
[require:post init hooks.*success]
```

To report an error in an init hook, you must throw a **synchronous** error.
Unlike all other middleware, init middleware does **not** handle promise
rejections.

```acquit
[require:post init hooks.*error]
```

<h2 id="next">Next Up</h2>

Now that we've covered middleware, let's take a look at Mongoose's approach
to faking JOINs with its query [population](populate.html) helper.
