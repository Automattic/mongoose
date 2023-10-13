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
* [`Document.prototype.deleteOne()` now returns a query](#document-prototype-deleteone-now-returns-a-query)
* [Changed behavior for `findOneAndUpdate()` with `orFail()` and upsert](#changed-behavior-for-findoneandupdate-with-orfail-and-upsert)
* [MongoDB Node Driver 6.0](#mongodb-node-driver-6)
* [Removed `findOneAndRemove()`](#removed-findoneandremove)
* [Removed id Setter](#removed-id-setter)
* [Allow `null` For Optional Fields in TypeScript](#allow-null-for-optional-fields-in-typescript)

<h2 id="removed-rawresult-option-for-findoneandupdate"><a href="#removed-rawresult-option-for-findoneandupdate">Removed <code>rawResult</code> option for <code>findOneAndUpdate()</code></a></h2>

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

<h2 id="document-prototype-deleteone-now-returns-a-query"><a href="#document-prototype-deleteone-now-returns-a-query"><code>Document.prototype.deleteOne</code> now returns a query</a></h2>

In Mongoose 7, `doc.deleteOne()` returned a promise that resolved to `doc`.
In Mongoose 8, `doc.deleteOne()` returns a query for easier chaining, as well as consistency with `doc.updateOne()`.

```javascript
const numberOne = await Character.findOne({ name: 'Will Riker' });

// In Mongoose 7, q is a Promise that resolves to `numberOne`
// In Mongoose 8, q is a Query.
const q = numberOne.deleteOne();

// In Mongoose 7, `res === numberOne`
// In Mongoose 8, `res` is a `DeleteResult`.
const res = await q;
```

<h2 id="changed-behavior-for-findoneandupdate-with-orfail-and-upsert"><a href="#changed-behavior-for-findoneandupdate-with-orfail-and-upsert">Changed behavior for <code>findOneAndUpdate()</code> with <code>orFail()</code> and upsert</a></h2>

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

<h2 id="removed-id-setter"><a href="#removed-id-setter">Removed id Setter</a></h2>

In Mongoose 7.4, Mongoose introduced an `id` setter that made `doc.id = '0'.repeat(24)` equivalent to `doc._id = '0'.repeat(24)`.
In Mongoose 8, that setter is now removed.

<h2 id="allow-null-for-optional-fields-in-typescript"><a href="#allow-null-for-optional-fields-in-typescript">Allow <code>null</code> For Optional Fields in TypeScript</a></h2>

In Mongoose 8, automatically inferred schema types in TypeScript allow `null` for optional fields.
In Mongoose 7, optional fields only allowed `undefined`, not `null`.

```typescript
const schema = new Schema({ name: String });
const TestModel = model('Test', schema);

const doc = new TestModel();

// In Mongoose 8, this type is `string | null | undefined`.
// In Mongoose 7, this type is `string | undefined`
doc.name;
```
