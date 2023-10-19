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
* [MongoDB Node Driver 6.0](#mongodb-node-driver-6)
* [Removed `findOneAndRemove()`](#removed-findoneandremove)
* [Removed `count()`](#removed-count)
* [Removed id Setter](#removed-id-setter)
* [`null` is valid for non-required string enums](#null-is-valid-for-non-required-string-enums)
* [Apply minimize when `save()` updates an existing document](#apply-minimize-when-save-updates-an-existing-document)
* [Apply base schema paths before discriminator paths](#apply-base-schema-paths-before-discriminator-paths)
* [Changed behavior for `findOneAndUpdate()` with `orFail()` and upsert](#changed-behavior-for-findoneandupdate-with-orfail-and-upsert)
* [`create()` waits until all saves are done before throwing any error](#create-waits-until-all-saves-are-done-before-throwing-any-error)
* [`Model.validate()` returns copy of object](#model-validate-returns-copy-of-object)
* [Allow `null` For Optional Fields in TypeScript](#allow-null-for-optional-fields-in-typescript)
* [Infer `distinct()` return types from schema](#infer-distinct-return-types-from-schema)

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

<h2 id="mongodb-node-driver-6"><a href="#mongodb-node-driver-6">MongoDB Node Driver 6</a></h2>

Mongoose 8 uses [v6.x of the MongoDB Node driver](https://github.com/mongodb/node-mongodb-native/blob/main/HISTORY.md#600-2023-08-28).
There's a few noteable changes in MongoDB Node driver v6 that affect Mongoose:

1. The `ObjectId` constructor no longer accepts strings of length 12. In Mongoose 7, `new mongoose.Types.ObjectId('12charstring')` was perfectly valid. In Mongoose 8, `new mongoose.Types.ObjectId('12charstring')` throws an error.

<h2 id="removed-findoneandremove"><a href="#removed-findoneandremove">Removed <code>findOneAndRemove()</code></a></h2>

In Mongoose 7, `findOneAndRemove()` was an alias for `findOneAndDelete()` that Mongoose supported for backwards compatibility.
Mongoose 8 no longer supports `findOneAndRemove()`.
Use `findOneAndDelete()` instead.

<h2 id="removed-count"><a href="#removed-count">Removed <code>count()</code></a></h2>

`Model.count()` and `Query.prototype.count()` were removed in Mongoose 8. Use `Model.countDocuments()` and `Query.prototype.countDocuments()` instead.

<h2 id="removed-id-setter"><a href="#removed-id-setter">Removed id Setter</a></h2>

In Mongoose 7.4, Mongoose introduced an `id` setter that made `doc.id = '0'.repeat(24)` equivalent to `doc._id = '0'.repeat(24)`.
In Mongoose 8, that setter is now removed.

<h2 id="null-is-valid-for-non-required-string-enums"><a href="#null-is-valid-for-non-required-string-enums"><code>null</code> is valid for non-required string enums</a></h2>

Before Mongoose 8, setting a string path with an `enum` to `null` would lead to a validation error, even if that path wasn't `required`.
In Mongoose 8, it is valid to set a string path to `null` if `required` is not set, even with `enum`.

```javascript
const schema = new Schema({
  status: {
    type: String,
    enum: ['on', 'off']
  }
});
const Test = mongoose.model('Test', schema);

// Works fine in Mongoose 8
// Throws a `ValidationError` in Mongoose 7
await Test.create({ status: null });
```

<h2 id="apply-minimize-when-save-updates-an-existing-document"><a href="#apply-minimize-when-save-updates-an-existing-document">Apply minimize when <code>save()</code> updates an existing document</a></h2>

In Mongoose 7, Mongoose would only apply minimize when saving a new document, not when updating an existing document.

```javascript
const schema = new Schema({
  nested: {
    field1: Number
  }
});
const Test = mongoose.model('Test', schema);

// Both Mongoose 7 and Mongoose 8 strip out empty objects when saving
// a new document in MongoDB by default
const { _id } = await Test.create({ nested: {} });
let rawDoc = await Test.findById(_id).lean();
rawDoc.nested; // undefined

// Mongoose 8 will also strip out empty objects when saving an
// existing document in MongoDB
const doc = await Test.findById(_id);
doc.nested = {};
doc.markModified('nested');
await doc.save();

let rawDoc = await Test.findById(_id).lean();
rawDoc.nested; // undefined in Mongoose 8, {} in Mongoose 7
```

<h2 id="apply-base-schema-paths-before-discriminator-paths"><a href="#apply-base-schema-paths-before-discriminator-paths">Apply base schema paths before discriminator paths</a></h2>

This means that, in Mongoose 8, getters and setters on discriminator paths run _after_ getters and setters on base paths.
In Mongoose 7, getters and setters on discriminator paths ran _before_ getters and setters on base paths.

```javascript

const schema = new Schema({
  name: {
    type: String,
    get(v) {
      console.log('Base schema getter');
      return v;
    }
  }
});

const Test = mongoose.model('Test', schema);
const D = Test.discriminator('D', new Schema({
  otherProp: {
    type: String,
    get(v) {
      console.log('Discriminator schema getter');
      return v;
    }
  }
}));

const doc = new D({ name: 'test', otherProp: 'test' });
// In Mongoose 8, prints "Base schema getter" followed by "Discriminator schema getter"
// In Mongoose 7, prints "Discriminator schema getter" followed by "Base schema getter"
console.log(doc.toObject({ getters: true }));
```

<h2 id="changed-behavior-for-findoneandupdate-with-orfail-and-upsert"><a href="#changed-behavior-for-findoneandupdate-with-orfail-and-upsert">Changed behavior for <code>findOneAndUpdate()</code> with <code>orFail()</code> and upsert</a></h2>

In Mongoose 7, `findOneAndUpdate(filter, update, { upsert: true }).orFail()` would throw a `DocumentNotFoundError` if a new document was upserted.
In other words, `findOneAndUpdate().orFail()` always threw an error if no document was found, even if a new document was upserted.

In Mongoose 8, `findOneAndUpdate(filter, update, { upsert: true }).orFail()` always succeeds.
`findOneAndUpdate().orFail()` now throws a `DocumentNotFoundError` if there's no document returned, rather than if no document was found.

<h2 id="create-waits-until-all-saves-are-done-before-throwing-any-error"><a href="#create-waits-until-all-saves-are-done-before-throwing-any-error"><code>create()</code> waits until all saves are done before throwing any error</a></h2>

In Mongoose 7, `create()` would immediately throw if any `save()` threw an error by default.
Mongoose 8 instead waits for all `save()` calls to finish before throwing the first error that occurred.
So `create()` will throw the same error in both Mongoose 7 and Mongoose 8, Mongoose 8 just may take longer to throw the error.

```javascript
const schema = new Schema({
  name: {
    type: String,
    enum: ['Badger', 'Mushroom']
  }
});
schema.pre('save', async function() {
  await new Promise(resolve => setTimeout(resolve, 1000));
});
const Test = mongoose.model('Test', schema);

const err = await Test.create([
  { name: 'Badger' },
  { name: 'Mushroom' },
  { name: 'Cow' }
]).then(() => null, err => err);
err; // ValidationError

// In Mongoose 7, there would be 0 documents, because `Test.create()`
// would throw before 'Badger' and 'Mushroom' are inserted
// In Mongoose 8, there will be 2 documents. `Test.create()` waits until
// 'Badger' and 'Mushroom' are inserted before throwing.
await Test.countDocuments();
```

<h2 id="model-validate-returns-copy-of-object"><a href="#model-validate-returns-copy-of-object"><code>Model.validate()</code> returns copy of object</a></h2>

In Mongoose 7, `Model.validate()` would potentially modify the passed in object.
Mongoose 8 instead copies the passed in object first.

```javascript
const schema = new Schema({ answer: Number });
const Test = mongoose.model('Test', schema);

const obj = { answer: '42' };
const res = Test.validate(obj);

typeof obj.answer; // 'string' in Mongoose 8, 'number' in Mongoose 7 
typeof res.answer; // 'number' in both Mongoose 7 and Mongoose 8
```

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

<h2 id="infer-distinct-return-types-from-schema"><a href="#infer-distinct-return-types-from-schema">Infer <code>distinct()</code> return types from schema</a></h2>

```ts
interface User {
  name: string;
  email: string;
  avatar?: string;
}
const schema = new Schema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: String
});

// Works in Mongoose 8. Compile error in Mongoose 7.
const names: string[] = await MyModel.distinct('name');
```