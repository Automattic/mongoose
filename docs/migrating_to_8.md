# Migrating from 7.x to 8.x

<style>
  ul > li {
    padding: 4px 0px;
  }
</style>

There are several backwards-breaking changes
you should be aware of when migrating from Mongoose 7.x to Mongoose 8.x.

If you're still on Mongoose 6.x or earlier, please read the [Mongoose 6.x to 7.x migration guide](migrating_to_7.html) and upgrade to Mongoose 7.x first before upgrading to Mongoose 8.

* [Removed `rawResult` option for `findOneAndUpdate()`](#removed-rawresult-option-for-findoneandupdate)
* [Changed behavior for `findOneAndUpdate()` with `orFail()` and upsert](#changed-behavior-for-findoneandupdate-with-orfail-and-upsert)
* [MongoDB Node Driver 6.0](#mongodb-node-driver-6)
* [Removed `findOneAndRemove()`](#removed-findoneandremove)

<h2 id="removed-rawresult-option-for-findoneandupdate"><a href="#removed-rawresult-option-for-findoneandupdate">Removed `rawResult` option for <code>findOneAndUpdate()</code></a></h2>

The `rawResult` option for `findOneAndUpdate()`, `findOneAndReplace()`, and `findOneAndDelete()` has been replaced by the `includeResultMetadata` option.

```javascript
const filter = { name: 'Will Riker' };
const update = { age: 29 };

const res = await Character.findOneAndUpdate(filter, update, {
  new: true,
  upsert: true,
  // Replace `rawResult: true` with `includeResultMetadata: true`
  includeResultMetadata: true
});
```

`includeResultMetadata` in Mongoose 8 behaves identically to `rawResult`.

<h2 id="mongodb-node-driver-6"><a href="#mongodb-node-driver-6">Changed behavior for <code>findOneAndUpdate()</code> with <code>orFail()</code> and upsert</a></h2>

In Mongoose 7, `findOneAndUpdate(filter, update, { upsert: true }).orFail()` would throw a `DocumentNotFoundError` if a new document was upserted.
In other words, `findOneAndUpdate().orFail()` always threw an error if no document was found, even if a new document was upserted.

In Mongoose 8, `findOneAndUpdate(filter, update, { upsert: true }).orFail()` always succeeds.
`findOneAndUpdate().orFail()` now throws a `DocumentNotFoundError` if there's no document returned, rather than if no document was found.

<h2 id="mongodb-node-driver-6"><a href="#mongodb-node-driver-6">MongoDB Node Driver 6</a></h2>

Mongoose 8 uses [v6.x of the MongoDB Node driver](https://github.com/mongodb/node-mongodb-native/blob/main/HISTORY.md#600-2023-08-28).
There's a few noteable changes in MongoDB Node driver v6 that affect Mongoose:

1. The `ObjectId` constructor no longer accepts strings of length 12. In Mongoose 7, `new mongoose.Types.ObjectId('12charstring')` was perfectly valid. In Mongoose 8, `new mongoose.Types.ObjectId('12charstring')` throws an error.

<h2 id="removed-findoneandremove"><a href="#removed-findoneandremove">Removed <code>findOneAndRemove()</code></a></h2>

In Mongoose 7, `findOneAndRemove()` was an alias for `findOneAndDelete()` that Mongoose supported for backwards compatibility.
Mongoose 8 no longer supports `findOneAndRemove()`.
Use `findOneAndDelete()` instead.