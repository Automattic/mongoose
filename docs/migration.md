# Migrating from 3.x to 4.x

There are several [backwards-breaking changes](https://github.com/Automattic/mongoose/wiki/4.0-Release-Notes) to be aware of when migrating from Mongoose 3 to Mongoose 4.

<h2 id="findandmodify-new">`findOneAndUpdate()` new field is now `false` by default</h2>

Mongoose's `findOneAndUpdate()`, `findOneAndRemove()`,
`findByIdAndUpdate()`, and `findByIdAndRemove()` functions are just
wrappers around MongoDB's
[`findAndModify` command](http://www.mongodb.com/docs/manual/reference/method/db.collection.findAndModify/).
Both the MongoDB server and the MongoDB NodeJS driver set the `new` option
to false by default, but mongoose 3 overwrote this default. In order to be
more consistent with the MongoDB server's documentation, mongoose will
use false by default. That is,
`findOneAndUpdate({}, { $set: { test: 1 } }, callback);` will return the
document as it was *before* the `$set` operation was applied.

To return the document with modifications made on the update, use the `new: true` option.

```javascript
MyModel.findOneAndUpdate({}, { $set: { test: 1 } }, { new: true }, callback);
```

## CastError and ValidationError now use `kind` instead of `type` to report error types

In Mongoose 3, CastError and ValidationError had a `type` field. For instance, user defined validation errors would have a `type` property that contained the string 'user defined'. In Mongoose 4, this property has been renamed to `kind` due to [the V8 JavaScript engine using the Error.type property internally](https://code.google.com/p/v8/issues/detail?id=2397).

<h2 id="promises">Query now has a `.then()` function</h2>

In mongoose 3, you needed to call `.exec()` on a query chain to get a
promise back, like `MyModel.find().exec().then();`. Mongoose 4 queries are
promises, so you can do `MyModel.find().then()` instead. Be careful if
you're using functions like
[q's `Q.ninvoke()`](https://github.com/kriskowal/q#adapting-node) or
otherwise returning a mongoose query from a promise.

<h2 id="moreinfo">More Info</h2>

Related blog posts:

- [Introducing Version 4.0 of the Mongoose NodeJS ODM](http://www.mongodb.com/blog/post/introducing-version-40-mongoose-nodejs-odm)
