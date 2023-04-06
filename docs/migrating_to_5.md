# Migrating from 4.x to 5.x

Please note: we plan to discontinue Mongoose 5 support on March 1, 2024.
Please see our [version support guide](./version-support.html).

There are several [backwards-breaking changes](https://github.com/Automattic/mongoose/blob/master/History.md)
you should be aware of when migrating from Mongoose 4.x to Mongoose 5.x.

If you're still on Mongoose 3.x, please read the [Mongoose 3.x to 4.x migration guide](migration.html).

* [Version Requirements](#version-requirements)
* [Query Middleware](#query-middleware)
* [Promises and Callbacks for `mongoose.connect()`](#promises-and-callbacks)
* [Connection Logic and `useMongoClient`](#connection-logic)
* [Setter Order](#setter-order)
* [Checking if a path is populated](#id-getter)
* [Return Values for `remove()` and `deleteX()`](#return-value-for-delete)
* [Aggregation Cursors](#aggregation-cursors)
* [geoNear](#geonear)
* [Required URI encoding of connection strings](#uri-encoding)
* [Passwords which contain certain characters](#password-characters)
* [Domain sockets](#domain-sockets)
* [`toObject()` Options](#toobject-options)
* [Aggregate Parameters](#aggregate-parameters)
* [Boolean Casting](#boolean-casting)
* [Query Casting](#query-casting)
* [Post Save Hooks Get Flow Control](#post-save-flow-control)
* [The `$pushAll` Operator](#pushall)
* [Always Use Forward Key Order](#retain-key-order)
* [Run setters on queries](#run-setters-on-queries)
* [Pre-compiled Browser Bundle](#browser-bundle)
* [Save Errors](#save-errors)
* [Init hook signatures](#init-hooks)
* [`numAffected` and `save()`](#save-num-affected)
* [`remove()` and debouncing](#remove-debounce)
* [`getPromiseConstructor()`](#get-promise-constructor)
* [Passing Parameters from Pre Hooks](#pre-hook-params)
* [`required` validator for arrays](#array-required)
* [debug output defaults to stdout instead of stderr](#debug-output)
* [Overwriting filter properties](#overwrite-filter)
* [`bulkWrite()` results](#bulkwrite-results)
* [Strict SSL validation](#strict-ssl-validation)

<h2 id="version-requirements"><a href="#version-requirements">Version Requirements</a></h2>

Mongoose now requires Node.js >= 4.0.0 and MongoDB >= 3.0.0.
[MongoDB 2.6](https://www.mongodb.com/blog/post/mongodb-2-6-end-of-life) and
[Node.js < 4](https://github.com/nodejs/Release) where both EOL-ed in 2016.

<h2 id="query-middleware"><a href="#query-middleware">Query Middleware</a></h2>

Query middleware is now compiled when you call `mongoose.model()` or `db.model()`. If you add query middleware after calling `mongoose.model()`, that middleware will **not** get called.

```javascript
const schema = new Schema({ name: String });
const MyModel = mongoose.model('Test', schema);
schema.pre('find', () => { console.log('find!'); });

MyModel.find().exec(function() {
  // In mongoose 4.x, the above `.find()` will print "find!"
  // In mongoose 5.x, "find!" will **not** be printed.
  // Call `pre('find')` **before** calling `mongoose.model()` to make the middleware apply.
});
```

<h2 id="promises-and-callbacks"><a href="#promises-and-callbacks">
  Promises and Callbacks for <code>mongoose.connect()</code>
</a></h2>

`mongoose.connect()` and `mongoose.disconnect()` now return a promise if no callback specified, or `null` otherwise. It does **not** return the mongoose singleton.

```javascript
// Worked in mongoose 4. Does **not** work in mongoose 5, `mongoose.connect()`
// now returns a promise consistently. This is to avoid the horrible things
// we've done to allow mongoose to be a thenable that resolves to itself.
mongoose.connect('mongodb://127.0.0.1:27017/test').model('Test', new Schema({}));

// Do this instead
mongoose.connect('mongodb://127.0.0.1:27017/test');
mongoose.model('Test', new Schema({}));
```

<h2 id="connection-logic"><a href="#connection-logic">
  Connection Logic and <code>useMongoClient</code>
</a></h2>

The [`useMongoClient` option](/docs/4.x/docs/connections.html#use-mongo-client) was
removed in Mongoose 5, it is now always `true`. As a consequence, Mongoose 5
no longer supports several function signatures for `mongoose.connect()` that
worked in Mongoose 4.x if the `useMongoClient` option was off. Below are some
examples of `mongoose.connect()` calls that do **not** work in Mongoose 5.x.

* `mongoose.connect('127.0.0.1', 27017);`
* `mongoose.connect('127.0.0.1', 'mydb', 27017);`
* `mongoose.connect('mongodb://host1:27017,mongodb://host2:27017');`

In Mongoose 5.x, the first parameter to `mongoose.connect()` and `mongoose.createConnection()`, if specified, **must** be a [MongoDB connection string](https://www.mongodb.com/docs/manual/reference/connection-string/). The
connection string and options are then passed down to [the MongoDB Node.js driver's `MongoClient.connect()` function](http://mongodb.github.io/node-mongodb-native/3.0/api/MongoClient.html#.connect). Mongoose does not modify the connection string, although `mongoose.connect()` and `mongoose.createConnection()` support a [few additional options in addition to the ones the MongoDB driver supports](http://mongoosejs.com/docs/connections.html#options).

<h2 id="setter-order"><a href="#setter-order">
  Setter Order
</a></h2>

Setters run in reverse order in 4.x:

```javascript
const schema = new Schema({ name: String });
schema.path('name').
  set(() => console.log('This will print 2nd')).
  set(() => console.log('This will print first'));
```

In 5.x, setters run in the order they're declared.

```javascript
const schema = new Schema({ name: String });
schema.path('name').
  set(() => console.log('This will print first')).
  set(() => console.log('This will print 2nd'));
```

<h2 id="id-getter"><a href="#id-getter">
  Checking if a path is populated
</a></h2>

Mongoose 5.1.0 introduced an `_id` getter to ObjectIds that lets you get an ObjectId regardless of whether a path
is populated.

```javascript
const blogPostSchema = new Schema({
  title: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Author'
  }
});
const BlogPost = mongoose.model('BlogPost', blogPostSchema);

await BlogPost.create({ title: 'test', author: author._id });
const blogPost = await BlogPost.findOne();

console.log(blogPost.author); // '5b207f84e8061d1d2711b421'
// New in Mongoose 5.1.0: this will print '5b207f84e8061d1d2711b421' as well
console.log(blogPost.author._id);

await blogPost.populate('author');
console.log(blogPost.author._id); // '5b207f84e8061d1d2711b421'
```

As a consequence, checking whether `blogPost.author._id` is [no longer viable as a way to check whether `author` is populated](https://github.com/Automattic/mongoose/issues/6415#issuecomment-388579185). Use `blogPost.populated('author') != null` or `blogPost.author instanceof mongoose.Types.ObjectId` to check whether `author` is populated instead.

Note that you can call `mongoose.set('objectIdGetter', false)` to change this behavior.

<h2 id="return-value-for-delete"><a href="#return-value-for-delete">
  Return Values for <code>remove()</code> and <code>deleteX()</code>
</a></h2>

`deleteOne()`, `deleteMany()`, and `remove()` now resolve to the result object
rather than the full [driver `WriteOpResult` object](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~writeOpCallback).

```javascript
// In 4.x, this is how you got the number of documents deleted
MyModel.deleteMany().then(res => console.log(res.result.n));
// In 5.x this is how you get the number of documents deleted
MyModel.deleteMany().then(res => res.n);
```

<h2 id="aggregation-cursors"><a href="#aggregation-cursors">
  Aggregation Cursors
</a></h2>

The `useMongooseAggCursor` option from 4.x is now always on. This is the new syntax for aggregation cursors in mongoose 5:

```javascript
// When you call `.cursor()`, `.exec()` will now return a mongoose aggregation
// cursor.
const cursor = MyModel.aggregate([{ $match: { name: 'Val' } }]).cursor().exec();
// No need to `await` on the cursor or wait for a promise to resolve
cursor.eachAsync(doc => console.log(doc));

// Can also pass options to `cursor()`
const cursorWithOptions = MyModel.
  aggregate([{ $match: { name: 'Val' } }]).
  cursor({ batchSize: 10 }).
  exec();
```

<h2 id="geonear"><a href="#geonear">
  geoNear
</a></h2>

`Model.geoNear()` has been removed because the [MongoDB driver no longer supports it](https://github.com/mongodb/node-mongodb-native/blob/4bac63ce7b9e9fff87c31c5a27d78bcdaca12669/etc/notes/CHANGES_3.0.0.md#geonear-command-helper)

<h2 id="uri-encoding"><a href="#uri-encoding">
  Required URI encoding of connection strings
</a></h2>

Due to changes in the MongoDB driver, connection strings must be URI encoded.

If they are not, connections may fail with an illegal character message.

<h2 id="password-characters"><a href="#password-characters">
  Passwords which contain certain characters
</a></h2>

See a [full list of affected characters](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding).

If your app is used by a lot of different connection strings, it's possible
that your test cases will pass, but production passwords will fail. Encode all your connection
strings to be safe.

If you want to continue to use unencoded connection strings, the easiest fix is to use
the `mongodb-uri` module to parse the connection strings, and then produce the properly encoded
versions. You can use a function like this:

```javascript
const uriFormat = require('mongodb-uri');
function encodeMongoURI(urlString) {
  if (urlString) {
    const parsed = uriFormat.parse(urlString);
    urlString = uriFormat.format(parsed);
  }
  return urlString;
}

// Your un-encoded string.
const mongodbConnectString = 'mongodb://...';
mongoose.connect(encodeMongoURI(mongodbConnectString));
```

The function above is safe to use whether the existing string is already encoded or not.

<h2 id="domain-sockets"><a href="#domain-sockets">
  Domain sockets
</a></h2>

Domain sockets must be URI encoded. For example:

```javascript
// Works in mongoose 4. Does **not** work in mongoose 5 because of more
// stringent URI parsing.
const host = '/tmp/mongodb-27017.sock';
mongoose.createConnection(`mongodb://aaron:psw@${host}/fake`);

// Do this instead
const host = encodeURIComponent('/tmp/mongodb-27017.sock');
mongoose.createConnection(`mongodb://aaron:psw@${host}/fake`);
```

<h2 id="toobject-options"><a href="#toobject-options">
  <code>toObject()</code> Options
</a></h2>

The `options` parameter to `toObject()` and `toJSON()` merge defaults rather than overwriting them.

```javascript
// Note the `toObject` option below
const schema = new Schema({ name: String }, { toObject: { virtuals: true } });
schema.virtual('answer').get(() => 42);
const MyModel = db.model('MyModel', schema);

const doc = new MyModel({ name: 'test' });
// In mongoose 4.x this prints "undefined", because `{ minimize: false }`
// overwrites the entire schema-defined options object.
// In mongoose 5.x this prints "42", because `{ minimize: false }` gets
// merged with the schema-defined options.
console.log(doc.toJSON({ minimize: false }).answer);
```

<h2 id="aggregate-parameters"><a href="#aggregate-parameters">
  Aggregate Parameters
</a></h2>

`aggregate()` no longer accepts a spread, you **must** pass your aggregation pipeline as an array. The below code worked in 4.x:

```javascript
MyModel.aggregate({ $match: { isDeleted: false } }, { $skip: 10 }).exec(cb);
```

The above code does **not** work in 5.x, you **must** wrap the `$match` and `$skip` stages in an array.

```javascript
MyModel.aggregate([{ $match: { isDeleted: false } }, { $skip: 10 }]).exec(cb);
```

<h2 id="boolean-casting"><a href="#boolean-casting">
  Boolean Casting
</a></h2>

By default, mongoose 4 would coerce any value to a boolean without error.

```javascript
// Fine in mongoose 4, would save a doc with `boolField = true`
const MyModel = mongoose.model('Test', new Schema({
  boolField: Boolean
}));

MyModel.create({ boolField: 'not a boolean' });
```

Mongoose 5 only casts the following values to `true`:

* `true`
* `'true'`
* `1`
* `'1'`
* `'yes'`

And the following values to `false`:

* `false`
* `'false'`
* `0`
* `'0'`
* `'no'`

All other values will cause a `CastError`

<h2 id="query-casting"><a href="#query-casting">
  Query Casting
</a></h2>

Casting for `update()`, `updateOne()`, `updateMany()`, `replaceOne()`,
`remove()`, `deleteOne()`, and `deleteMany()` doesn't happen until `exec()`.
This makes it easier for hooks and custom query helpers to modify data, because
mongoose won't restructure the data you passed in until after your hooks and
query helpers have ran. It also makes it possible to set the `overwrite` option
_after_ passing in an update.

```javascript
// In mongoose 4.x, this becomes `{ $set: { name: 'Baz' } }` despite the `overwrite`
// In mongoose 5.x, this overwrite is respected and the first document with
// `name = 'Bar'` will be replaced with `{ name: 'Baz' }`
User.where({ name: 'Bar' }).update({ name: 'Baz' }).setOptions({ overwrite: true });
```

<h2 id="post-save-flow-control"><a href="#post-save-flow-control">
  Post Save Hooks Get Flow Control
</a></h2>

Post hooks now get flow control, which means async post save hooks and child document post save hooks execute **before** your `save()` callback.

```javascript
const ChildModelSchema = new mongoose.Schema({
  text: {
    type: String
  }
});
ChildModelSchema.post('save', function(doc) {
  // In mongoose 5.x this will print **before** the `console.log()`
  // in the `save()` callback. In mongoose 4.x this was reversed.
  console.log('Child post save');
});
const ParentModelSchema = new mongoose.Schema({
  children: [ChildModelSchema]
});

const Model = mongoose.model('Parent', ParentModelSchema);
const m = new Model({ children: [{ text: 'test' }] });
m.save(function() {
  // In mongoose 5.xm this prints **after** the "Child post save" message.
  console.log('Save callback');
});
```

<h2 id="pushall"><a href="#pushall">
  The <code>$pushAll</code> Operator
</a></h2>

`$pushAll` is no longer supported and no longer used internally for `save()`, since it has been [deprecated since MongoDB 2.4](https://www.mongodb.com/docs/manual/reference/operator/update/pushAll/). Use `$push` with `$each` instead.

<h2 id="retain-key-order"><a href="#retain-key-order">
  Always Use Forward Key Order
</a></h2>

The `retainKeyOrder` option was removed, mongoose will now always retain the same key position when cloning objects. If you have queries or indexes that rely on reverse key order, you will have to change them.

<h2 id="run-setters-on-queries"><a href="#run-setters-on-queries">
  Run setters on queries
</a></h2>

Setters now run on queries by default, and the old `runSettersOnQuery` option
has been removed.

```javascript
const schema = new Schema({
  email: { type: String, lowercase: true }
});
const Model = mongoose.model('Test', schema);
Model.find({ email: 'FOO@BAR.BAZ' }); // Converted to `find({ email: 'foo@bar.baz' })`
```

<h2 id="browser-bundle"><a href="#browser-bundle">
  Pre-compiled Browser Bundle
</a></h2>

We no longer have a pre-compiled version of mongoose for the browser. If you want to use mongoose schemas in the browser, you need to build your own bundle with browserify/webpack.

<h2 id="save-errors"><a href="#save-errors">
  Save Errors
</a></h2>

The `saveErrorIfNotFound` option was removed, mongoose will now always error out from `save()` if the underlying document was not found

<h2 id="init-hooks"><a href="#init-hooks">
  Init hook signatures
</a></h2>

`init` hooks are now fully synchronous and do not receive `next()` as a parameter.

`Document.prototype.init()` no longer takes a callback as a parameter. It
was always synchronous, just had a callback for legacy reasons.

<h2 id="save-num-affected"><a href="#save-num-affected">
  <code>numAffected</code> and <code>save()</code>
</a></h2>

`doc.save()` no longer passes `numAffected` as a 3rd param to its callback.

<h2 id="remove-debounce"><a href="#remove-debounce">
  <code>remove()</code> and debouncing
</a></h2>

`doc.remove()` no longer debounces

<h2 id="get-promise-constructor"><a href="#get-promise-constructor">
  <code>getPromiseConstructor()</code>
</a></h2>

`getPromiseConstructor()` is gone, just use `mongoose.Promise`.

<h2 id="pre-hook-params"><a href="#pre-hook-params">
  Passing Parameters from Pre Hooks
</a></h2>

You cannot pass parameters to the next pre middleware in the chain using `next()` in mongoose 5.x. In mongoose 4, `next('Test')` in pre middleware would call the
next middleware with 'Test' as a parameter. Mongoose 5.x has removed support for this.

<h2 id="array-required"><a href="#array-required">
  <code>required</code> validator for arrays
</a></h2>

In mongoose 5 the `required` validator only verifies if the value is an
array. That is, it will **not** fail for _empty_ arrays as it would in
mongoose 4.

<h2 id="debug-output"><a href="#debug-output">
  debug output defaults to stdout instead of stderr
</a></h2>

In mongoose 5 the default debug function uses `console.info()` to display messages instead of `console.error()`.

<h2 id="overwrite-filter"><a href="#overwrite-filter">
  Overwriting filter properties
</a></h2>

In Mongoose 4.x, overwriting a filter property that's a primitive with one that is an object would silently fail. For example, the below code would ignore the `where()` and be equivalent to `Sport.find({ name: 'baseball' })`

```javascript
Sport.find({ name: 'baseball' }).where({ name: { $ne: 'softball' } });
```

In Mongoose 5.x, the above code will correctly overwrite `'baseball'` with `{ $ne: 'softball' }`

<h2 id="bulkwrite-results"><a href="#bulkwrite-results">
  <code>bulkWrite()</code> results
</a></h2>

Mongoose 5.x uses version 3.x of the [MongoDB Node.js driver](http://npmjs.com/package/mongodb). MongoDB driver 3.x changed the format of
the result of [`bulkWrite()` calls](api/model.html#model_Model-bulkWrite) so there is no longer a top-level `nInserted`, `nModified`, etc. property. The new result object structure is [described here](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#~BulkWriteOpResult).

```javascript
const Model = mongoose.model('Test', new Schema({ name: String }));

const res = await Model.bulkWrite([{ insertOne: { document: { name: 'test' } } }]);

console.log(res);
```

In Mongoose 4.x, the above will print:

```
BulkWriteResult {
  ok: [Getter],
  nInserted: [Getter],
  nUpserted: [Getter],
  nMatched: [Getter],
  nModified: [Getter],
  nRemoved: [Getter],
  getInsertedIds: [Function],
  getUpsertedIds: [Function],
  getUpsertedIdAt: [Function],
  getRawResponse: [Function],
  hasWriteErrors: [Function],
  getWriteErrorCount: [Function],
  getWriteErrorAt: [Function],
  getWriteErrors: [Function],
  getLastOp: [Function],
  getWriteConcernError: [Function],
  toJSON: [Function],
  toString: [Function],
  isOk: [Function],
  insertedCount: 1,
  matchedCount: 0,
  modifiedCount: 0,
  deletedCount: 0,
  upsertedCount: 0,
  upsertedIds: {},
  insertedIds: { '0': 5be9a3101638a066702a0d38 },
  n: 1 }
```

In Mongoose 5.x, the script will print:

```
BulkWriteResult {
  result: 
  { ok: 1,
    writeErrors: [],
    writeConcernErrors: [],
    insertedIds: [ [Object] ],
    nInserted: 1,
    nUpserted: 0,
    nMatched: 0,
    nModified: 0,
    nRemoved: 0,
    upserted: [],
    lastOp: { ts: [Object], t: 1 } },
  insertedCount: 1,
  matchedCount: 0,
  modifiedCount: 0,
  deletedCount: 0,
  upsertedCount: 0,
  upsertedIds: {},
  insertedIds: { '0': 5be9a1c87decfc6443dd9f18 },
  n: 1 }
```

<h2 id="strict-ssl-validation"><a href="#strict-ssl-validation">
  Strict SSL Validation
</a></h2>

The most recent versions of the [MongoDB Node.js driver use strict SSL validation by default](http://mongodb.github.io/node-mongodb-native/3.5/tutorials/connect/tls/),
which may lead to errors if you're using [self-signed certificates](https://github.com/Automattic/mongoose/issues/9147).

If this is blocking you from upgrading, you can set the `tlsInsecure` option to `true`.

```javascript
mongoose.connect(uri, { tlsInsecure: false }); // Opt out of additional SSL validation
```
