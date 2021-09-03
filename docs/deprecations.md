# Deprecation Warnings

There are several deprecations in the [MongoDB Node.js driver](http://npmjs.com/package/mongodb)
that Mongoose users should be aware of. Mongoose provides options to work
around these deprecation warnings, but you need to test whether these options
cause any problems for your application. Please [report any issues on GitHub](https://github.com/Automattic/mongoose/issues/new).

<h2 id="summary"><a href="#summary">Summary</a></h2>

To fix all deprecation warnings, follow the below steps:

* `mongoose.set('useNewUrlParser', true);`
* `mongoose.set('useUnifiedTopology', true);`
* *Remove* `mongoose.set('useFindAndModify', false);`
* *Remove* `mongoose.set('useCreateIndex', true);`
* Replace `update()` with `updateOne()`, `updateMany()`, or `replaceOne()`
* Replace `remove()` with `deleteOne()` or `deleteMany()`.
* Replace `count()` with `countDocuments()`, unless you want to count how many documents are in the whole collection (no filter). In the latter case, use `estimatedDocumentCount()`.

Read below for more a more detailed description of each deprecation warning.

<h2 id="the-usenewurlparser-option"><a href="#the-usenewurlparser-option">The <code>useNewUrlParser</code> Option</a></h2>

By default, `mongoose.connect()` will print out the below warning:

```
DeprecationWarning: current URL string parser is deprecated, and will be
removed in a future version. To use the new parser, pass option
{ useNewUrlParser: true } to MongoClient.connect.
```

The MongoDB Node.js driver rewrote the tool it uses to parse [MongoDB connection strings](https://docs.mongodb.com/manual/reference/connection-string/).
Because this is such a big change, they put the new connection string parser
behind a flag. To turn on this option, pass the `useNewUrlParser` option to
[`mongoose.connect()`](/docs/api.html#mongoose_Mongoose-connect)
or [`mongoose.createConnection()`](/docs/api.html#mongoose_Mongoose-createConnection).

```javascript
mongoose.connect(uri, { useNewUrlParser: true });
mongoose.createConnection(uri, { useNewUrlParser: true });
```

You can also [set the global `useNewUrlParser` option](/docs/api.html#mongoose_Mongoose-set)
to turn on `useNewUrlParser` for every connection by default.

```javascript
// Optional. Use this if you create a lot of connections and don't want
// to copy/paste `{ useNewUrlParser: true }`.
mongoose.set('useNewUrlParser', true);
```

To test your app with `{ useNewUrlParser: true }`, you only need to check
whether your app successfully connects. Once Mongoose has successfully
connected, the URL parser is no longer important. If you can't connect
with `{ useNewUrlParser: true }`, please [open an issue on GitHub](https://github.com/Automattic/mongoose/issues/new).

<h2 id="findandmodify"><a href="#findandmodify"><code>findAndModify()</code></a></h2>

As of Mongoose 6.0, this functionality has been removed and will produce an error if used.

<h2 id="findoneandupdate"><a href="#findoneandupdate"><code>findOneAndUpdate()</code></a></h2>

As of Mongoose 6.0, this functionality has been removed and will produce an error if used.

<h2 id="ensureindex"><a href="#ensureindex"><code>ensureIndex()</code></a></h2>

As of Mongoose 6.0, this functionality has been removed and will produce an error if used.

<h2 id="usecreateindex"><a href="#usecreateindex"><code>useCreateIndex()</code></a></h2>

As of Mongoose 6.0, this functionality has been removed and will produce an error if used.

<h2 id="remove"><a href="#remove"><code>remove()</code></a></h2>

The MongoDB driver's [`remove()` function](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#remove) is deprecated in favor of `deleteOne()` and `deleteMany()`. This is to comply with
the [MongoDB CRUD specification](https://github.com/mongodb/specifications/blob/master/source/crud/crud.rst),
which aims to provide a consistent API for CRUD operations across all MongoDB
drivers.

```
DeprecationWarning: collection.remove is deprecated. Use deleteOne,
deleteMany, or bulkWrite instead.
```

To remove this deprecation warning, replace any usage of `remove()` with
`deleteMany()`, _unless_ you specify the [`single` option to `remove()`](/docs/api.html#model_Model.remove). The `single`
option limited `remove()` to deleting at most one document, so you should
replace `remove(filter, { single: true })` with `deleteOne(filter)`.

```javascript
// Replace this:
MyModel.remove({ foo: 'bar' });
// With this:
MyModel.deleteMany({ foo: 'bar' });

// Replace this:
MyModel.remove({ answer: 42 }, { single: true });
// With this:
MyModel.deleteOne({ answer: 42 });
```

<h2 id="useunifiedtopology"><a href="#useunifiedtopology"><code>useUnifiedTopology</code></a></h2>

By default, `mongoose.connect()` will print out the below warning:

```
DeprecationWarning: current Server Discovery and Monitoring engine is
deprecated, and will be removed in a future version. To use the new Server
Discover and Monitoring engine, pass option { useUnifiedTopology: true } to
the MongoClient constructor.
```

Mongoose 5.7 uses MongoDB driver 3.3.x, which introduced a significant
refactor of how it handles monitoring all the servers in a replica set
or sharded cluster. In MongoDB parlance, this is known as
[server discovery and monitoring](https://github.com/mongodb/specifications/blob/master/source/server-discovery-and-monitoring/server-discovery-and-monitoring.rst).

To opt in to using the new topology engine, use the below line:

```javascript
mongoose.set('useUnifiedTopology', true);
```

The `useUnifiedTopology` option removes support for several
[connection options](/docs/connections.html#options) that are
no longer relevant with the new topology engine:

- `autoReconnect`
- `reconnectTries`
- `reconnectInterval`

When you enable `useUnifiedTopology`, please remove those options
from your [`mongoose.connect()`](/docs/api/mongoose.html#mongoose_Mongoose-connect) or
[`createConnection()`](/docs/api/mongoose.html#mongoose_Mongoose-createConnection) calls.

If you find any unexpected behavior, please [open up an issue on GitHub](https://github.com/Automattic/mongoose/issues/new).

<h2 id="update"><a href="#update"><code>update()</code></a></h2>

Like `remove()`, the [`update()` function](/docs/api.html#model_Model.update) is deprecated in favor
of the more explicit [`updateOne()`](/docs/api.html#model_Model.updateOne), [`updateMany()`](/docs/api.html#model_Model.updateMany), and [`replaceOne()`](/docs/api.html#model_Model.replaceOne) functions. You should replace
`update()` with `updateOne()`, unless you use the [`multi` or `overwrite` options](/docs/api.html#model_Model.update).

```
collection.update is deprecated. Use updateOne, updateMany, or bulkWrite
instead.
```

```javascript
// Replace this:
MyModel.update({ foo: 'bar' }, { answer: 42 });
// With this:
MyModel.updateOne({ foo: 'bar' }, { answer: 42 });

// If you use `overwrite: true`, you should use `replaceOne()` instead:
MyModel.update(filter, update, { overwrite: true });
// Replace with this:
MyModel.replaceOne(filter, update);

// If you use `multi: true`, you should use `updateMany()` instead:
MyModel.update(filter, update, { multi: true });
// Replace with this:
MyModel.updateMany(filter, update);
```

<h2 id="count"><a href="#count"><code>count()</code></a></h2>

The MongoDB server has deprecated the `count()` function in favor of two
separate functions, [`countDocuments()`](#query_Query-countDocuments) and
[`estimatedDocumentCount()`](#query_Query-estimatedDocumentCount).

```
DeprecationWarning: collection.count is deprecated, and will be removed in a future version. Use collection.countDocuments or collection.estimatedDocumentCount instead
```

The difference between the two is `countDocuments()` can accept a filter
parameter like [`find()`](#query_Query-find). The `estimatedDocumentCount()`
function is faster, but can only tell you the total number of documents in
a collection. You cannot pass a `filter` to `estimatedDocumentCount()`.

To migrate, replace `count()` with `countDocuments()` _unless_ you do not
pass any arguments to `count()`. If you use `count()` to count all documents
in a collection as opposed to counting documents that match a query, use
`estimatedDocumentCount()` instead of `countDocuments()`.

```javascript
// Replace this:
MyModel.count({ answer: 42 });
// With this:
MyModel.countDocuments({ answer: 42 });

// If you're counting all documents in the collection, use
// `estimatedDocumentCount()` instead.
MyModel.count();
// Replace with:
MyModel.estimatedDocumentCount();

// Replace this:
MyModel.find({ answer: 42 }).count().exec();
// With this:
MyModel.find({ answer: 42 }).countDocuments().exec();

// Replace this:
MyModel.find().count().exec();
// With this, since there's no filter
MyModel.find().estimatedDocumentCount().exec();
```

<h2 id="gridstore"><a href="#gridstore"><code>GridStore</code></a></h2>

If you're using [gridfs-stream](https://www.npmjs.com/package/gridfs-stream),
you'll see the below deprecation warning:

```
DeprecationWarning: GridStore is deprecated, and will be removed in a
future version. Please use GridFSBucket instead.
```

That is because gridfs-stream relies on a [deprecated MongoDB driver class](http://mongodb.github.io/node-mongodb-native/3.1/api/GridStore.html).
You should instead use the [MongoDB driver's own streaming API](https://thecodebarbarian.com/mongodb-gridfs-stream).

```javascript
// Replace this:
const conn = mongoose.createConnection('mongodb://localhost:27017/gfstest');
const gfs = require('gridfs-store')(conn.db);
const writeStream = gfs.createWriteStream({ filename: 'test.dat' });

// With this:
const conn = mongoose.createConnection('mongodb://localhost:27017/gfstest');
const gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db);
const writeStream = gridFSBucket.openUploadStream('test.dat');
```
