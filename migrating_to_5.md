### Version Requirements

Mongoose now requires node.js >= 4.0.0 and MongoDB >= 3.0.0. [MongoDB 2.6](https://www.mongodb.com/blog/post/mongodb-2-6-end-of-life) and [Node.js < 4](https://github.com/nodejs/Release) where both EOL-ed in 2016.

### Query Middleware

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

### Promises and Callbacks for `mongoose.connect()`

`mongoose.connect()` and `mongoose.disconnect()` now return a promise if no callback specified, or `null` otherwise. It does **not** return the mongoose singleton.

```javascript
// Worked in mongoose 4. Does **not** work in mongoose 5, `mongoose.connect()`
// now returns a promise consistently. This is to avoid the horrible things
// we've done to allow mongoose to be a thenable that resolves to itself.
mongoose.connect('mongodb://localhost:27017/test').model('Test', new Schema({}));

// Do this instead
mongoose.connect('mongodb://localhost:27017/test');
mongoose.model('Test', new Schema({}));
```

### Connection Logic and `useMongoClient`

The [`useMongoClient` option](http://mongoosejs.com/docs/4.x/docs/connections.html#use-mongo-client) was
removed in Mongoose 5, it is now always `true`. As a consequence, Mongoose 5
no longer supports several function signatures for `mongoose.connect()` that
worked in Mongoose 4.x if the `useMongoClient` option was off. Below are some
examples of `mongoose.connect()` calls that do **not** work in Mongoose 5.x.

* `mongoose.connect('localhost', 27017);`
* `mongoose.connect('localhost', 'mydb', 27017);`
* `mongoose.connect('mongodb://host1:27017,mongodb://host2:27017');`

In Mongoose 5.x, the first parameter to `mongoose.connect()` and `mongoose.createConnection()`, if specified, **must** be a [MongoDB connection string](https://docs.mongodb.com/manual/reference/connection-string/). The
connection string and options are then passed down to [the MongoDB Node.js driver's `MongoClient.connect()` function](http://mongodb.github.io/node-mongodb-native/3.0/api/MongoClient.html#.connect). Mongoose does not modify the connection string, although `mongoose.connect()` and `mongoose.createConnection()` support a [few additional options in addition to the ones the MongoDB driver supports](http://mongoosejs.com/docs/connections.html#options).

### Setter Order

Setters run in reverse order in 4.x:

```javascript
const schema = new Schema({ name: String });
schema.path('name').
  get(() => console.log('This will print 2nd')).
  get(() => console.log('This will print first'));
```

In 5.x, setters run in the order they're declared.

```javascript
const schema = new Schema({ name: String });
schema.path('name').
  get(() => console.log('This will print first')).
  get(() => console.log('This will print 2nd'));
```

### Checking if a path is populated

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
console.log(blogPost.author._id); '5b207f84e8061d1d2711b421'
```

As a consequence, checking whether `blogPost.author._id` is [no longer viable as a way to check whether `author` is populated](https://github.com/Automattic/mongoose/issues/6415#issuecomment-388579185). Use `blogPost.populated('author') != null` or `blogPost.author instanceof mongoose.Types.ObjectId` to check whether `author` is populated instead.

### Return Values for `remove()` and `deleteX()`

`deleteOne()`, `deleteMany()`, and `remove()` now resolve to the result object
rather than the full [driver `WriteOpResult` object](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~writeOpCallback).

```javascript
// In 4.x, this is how you got the number of documents deleted
MyModel.deleteMany().then(res => console.log(res.result.n));
// In 5.x this is how you get the number of documents deleted
MyModel.deleteMany().then(res => res.n);
```

### Aggregation Cursors

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

### geoNear

`Model.geoNear()` has been removed because the [MongoDB driver no longer supports it](https://github.com/mongodb/node-mongodb-native/blob/master/CHANGES_3.0.0.md#geonear-command-helper)

### Required URI encoding of connection strings

Due to changes in the MongoDB driver, connection strings must be URI encoded.

If they are not, connections may fail with an illegeal character message.

#### Passwords which contain certain characters

See a [full list of affected characters](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding).

If your app is used by a lot of different connection strings, it's possible
that your test cases will pass, but production passwords will fail. Encode all your connection
strings to be safe.

If you want to continue to use unencoded connection strings, the easiest fix is to use
the `mongodb-uri` module to parse the connection strings, and then produce the properly encoded
versions. You can use a function like this:

```javascript
const uriFormat = require('mongodb-uri')
function encodeMongoURI (urlString) {
    if (urlString) {
      let parsed = uriFormat.parse(urlString)
      urlString = uriFormat.format(parsed);
    }
    return urlString;
  }
}

// Your un-encoded string.
const mongodbConnectString = "mongodb://...";
mongoose.connect(encodeMongoURI(mongodbConnectString)
```

The function above is safe to use whether the existing string is already encoded or not.

#### Domain sockets

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

### `toObject()` Options

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

### Aggregate Parameters

`aggregate()` no longer accepts a spread, you **must** pass your aggregation pipeline as an array. The below code worked in 4.x:

```javascript
MyModel.aggregate({ $match: { isDeleted: false } }, { $skip: 10 }).exec(cb);
```

The above code does **not** work in 5.x, you **must** wrap the `$match` and `$skip` stages in an array.

```javascript
MyModel.aggregate([{ $match: { isDeleted: false } }, { $skip: 10 }]).exec(cb);
```

### Boolean Casting

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
### Query Casting

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

### Post Save Hooks Get Flow Control

Post hooks now get flow control, which means async post save hooks and child document post save hooks execute **before** your `save()` callback.

```javsscript
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

### The `$pushAll` Operator

`$pushAll` is no longer supported and no longer used internally for `save()`, since it has been [deprecated since MongoDB 2.4](https://docs.mongodb.com/manual/reference/operator/update/pushAll/). Use `$push` with `$each` instead.

### Always Use Forward Key Order

The `retainKeyOrder` option was removed, mongoose will now always retain the same key position when cloning objects. If you have queries or indexes that rely on reverse key order, you will have to change them.

### Pre-compiled Browser Bundle

We no longer have a pre-compiled version of mongoose for the browser. If you want to use mongoose schemas in the browser, you need to build your own bundle with browserify/webpack.

### Save Errors

The `saveErrorIfNotFound` option was removed, mongoose will now always error out from `save()` if the underlying document was not found

### Init hook signatures

`init` hooks are now fully synchronous and do not receive `next()` as a parameter.

`Document.prototype.init()` no longer takes a callback as a parameter. It
was always synchronous, just had a callback for legacy reasons.

### `numAffected` and `save()`

`doc.save()` no longer passes `numAffected` as a 3rd param to its callback.

### `remove()` and debouncing

`doc.remove()` no longer debounces

### `getPromiseConstructor()`

`getPromiseConstructor()` is gone, just use `mongoose.Promise`.

### Passing Parameters from Pre Hooks

You cannot pass parameters to the next pre middleware in the chain using `next()` in mongoose 5.x. In mongoose 4, `next('Test')` in pre middleware would call the
next middleware with 'Test' as a parameter. Mongoose 5.x has removed support for this.

### `required` validator for arrays

In mongoose 5 the `required` validator only verifies if the value is an array. That is, it will **not** fail for _empty_ arrays as it would in mongoose 4.
