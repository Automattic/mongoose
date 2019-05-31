# How to Use `findOneAndUpdate()` in Mongoose

The [`findOneAndUpdate()` function in Mongoose](/docs/api.html#query_Query-findOneAndUpdate) has a wide variety of use cases. [You should use `save()` to update documents where possible](https://masteringjs.io/tutorials/mongoose/update), but there are some cases where you need to use `findOneAndUpdate()`. In this tutorial, you'll see how to use `findOneAndUpdate()`, and learn when you need to use it.

* [Getting Started](#getting-started)
* [Atomic Updates](#atomic-updates)
* [Upsert](#upsert)

<h2 id="getting-started">Getting Started</h2>

As the name implies, `findOneAndUpdate()` finds the first document that matches a given `filter`, applies an `update`, and returns the document. By default, `findOneAndUpdate()` returns the document as it was **before** `update` was applied.

```javascript
[require:Tutorial.*findOneAndUpdate.*basic case]
```

You should set the `new` option to `true` to return the document **after** `update` was applied.

```javascript
[require:Tutorial.*findOneAndUpdate.*new option]
```

Mongoose's `findOneAndUpdate()` is slightly different from [the MongoDB Node.js driver's `findOneAndUpdate()`](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#findOneAndUpdate) because it returns the document itself, not a [result object](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#~findAndModifyWriteOpResult).

<h2 id="atomic-updates">Atomic Updates</h2>

With the exception of an [unindexed upsert](https://docs.mongodb.com/manual/reference/method/db.collection.findAndModify/#upsert-and-unique-index), [`findOneAndUpdate()` is atomic](https://docs.mongodb.com/manual/core/write-operations-atomicity/#atomicity). That means you can assume the document doesn't change between when MongoDB finds the document and when it updates the document, _unless_ you're doing an [upsert](#upsert).

For example, if you're using `save()` to update a document, the document can change in MongoDB in between when you load the document using `findOne()` and when you save the document using `save()` as show below. For many use cases, the `save()` race condition is a non-issue. But you can work around it with `findOneAndUpdate()` (or [transactions](/docs/transactions.html)) if you need to.

```javascript
[require:Tutorial.*findOneAndUpdate.*save race condition]
```

<h2 id="upsert">Upsert</h2>

Using the `upsert` option, you can use `findOneAndUpdate()` as a find-and-[upsert](https://docs.mongodb.com/manual/reference/method/db.collection.update/#db.collection.update) operation. An upsert behaves like a normal `findOneAndUpdate()` if it finds a document that matches `filter`. But, if no document matches `filter`, MongoDB will insert one by combining `filter` and `update` as shown below.

```javascript
[require:Tutorial.*findOneAndUpdate.*upsert]
```