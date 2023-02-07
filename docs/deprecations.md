# Deprecation Warnings

There are several deprecations in the [MongoDB Node.js driver](http://npmjs.com/package/mongodb)
that Mongoose users should be aware of. Mongoose provides options to work
around these deprecation warnings, but you need to test whether these options
cause any problems for your application. Please [report any issues on GitHub](https://github.com/Automattic/mongoose/issues/new).

<h2 id="summary"><a href="#summary">Summary</a></h2>

To fix all deprecation warnings, follow the below steps:

* Replace `update()` with `updateOne()`, `updateMany()`, or `replaceOne()`
* Replace `remove()` with `deleteOne()` or `deleteMany()`.
* Replace `count()` with `countDocuments()`, unless you want to count how many documents are in the whole collection (no filter). In the latter case, use `estimatedDocumentCount()`.

Read below for more a more detailed description of each deprecation warning.

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
`deleteMany()`, _unless_ you specify the [`single` option to `remove()`](api/model.html#model_Model-remove). The `single`
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

<h2 id="update"><a href="#update"><code>update()</code></a></h2>

Like `remove()`, the [`update()` function](api/model.html#model_Model-update) is deprecated in favor
of the more explicit [`updateOne()`](api/model.html#model_Model-updateOne), [`updateMany()`](api/model.html#model_Model-updateMany), and [`replaceOne()`](api/model.html#model_Model-replaceOne) functions. You should replace
`update()` with `updateOne()`, unless you use the [`multi` or `overwrite` options](api/model.html#model_Model-update).

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
