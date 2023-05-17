# Migrating from 6.x to 7.x

<style>
  ul > li {
    padding: 4px 0px;
  }
</style>

There are several backwards-breaking changes
you should be aware of when migrating from Mongoose 6.x to Mongoose 7.x.

If you're still on Mongoose 5.x, please read the [Mongoose 5.x to 6.x migration guide](migrating_to_6.html) and upgrade to Mongoose 6.x first.

* [`strictQuery`](#strictquery)
* [Removed `remove()`](#removed-remove)
* [Dropped callback support](#dropped-callback-support)
* [Removed `update()`](#removed-update)
* [Discriminator schemas use base schema options by default](#discriminator-schemas-use-base-schema-options-by-default)
* [Removed `castForQueryWrapper()`, updated `castForQuery()` signature](#removed-castforquerywrapper)
* [Copy schema options in `Schema.prototype.add()`](#copy-schema-options-in-schema-prototype-add)
* [ObjectId bsontype now has lowercase d](#objectid-bsontype-now-has-lowercase-d)
* [Removed support for custom promise libraries](#removed-support-for-custom-promise-libraries)
* [TypeScript-specific changes](#typescript-specific-changes)
  * [Removed `LeanDocument` and support for `extends Document`](#removed-leandocument-and-support-for-extends-document)
  * [New parameters for `HydratedDocument`](#new-parameters-for-hydrateddocument)

<h2 id="strictquery"><a href="#strictquery"><code>strictQuery</code></a></h2>

`strictQuery` is now false by default.

```javascript
const mySchema = new Schema({ field: Number });
const MyModel = mongoose.model('Test', mySchema);

// Mongoose will not strip out `notInSchema: 1` because `strictQuery` is false by default
const docs = await MyModel.find({ notInSchema: 1 });
// Empty array in Mongoose 7. In Mongoose 6, this would contain all documents in MyModel
docs;
```

<h2 id="removed-remove"><a href="#removed-remove">Removed <code>remove()</code></a></h2>

The `remove()` method on documents and models has been removed.
Use `deleteOne()` or `deleteMany()` instead.

```javascript
const mySchema = new Schema({ field: Number });
const MyModel = mongoose.model('Test', mySchema);

// Change this:
await MyModel.remove(filter);

// To this:
await MyModel.deleteOne(filter);
// Or this, if you want to delete multiple:
await MyModel.deleteMany(filter);

// For documents, change this:
await doc.remove();

// To this:
await doc.deleteOne();
```

Keep in mind that `deleteOne()` hooks are treated as query middleware by default.
So for middleware, please do the following:

```javascript
// Replace this:
schema.pre('remove', function() {
  /* ... */
});

// With this:
schema.pre('deleteOne', { document: true, query: false }, function() {
  /* ... */
});
```

<h2 id="dropped-callback-support"><a href="#dropped-callback-support">Dropped callback support</a></h2>

The following functions no longer accept callbacks.
They always return promises.

- `Aggregate.prototype.exec`
- `Aggregate.prototype.explain`
- `AggregationCursor.prototype.close`
- `Connection.prototype.startSession`
- `Connection.prototype.dropCollection`
- `Connection.prototype.createCollection`
- `Connection.prototype.dropDatabase`
- `Connection.prototype.openUri`
- `Connection.prototype.close`
- `Connection.prototype.destroy`
- `Document.prototype.populate`
- `Document.prototype.validate`
- `Mongoose.prototype.connect`
- `Mongoose.prototype.createConnection`
- `Model.prototype.save`
- `Model.aggregate`
- `Model.bulkWrite`
- `Model.cleanIndexes`
- `Model.create`
- `Model.createCollection`
- `Model.createIndexes`
- `Model.deleteOne`
- `Model.deleteMany`
- `Model.distinct`
- `Model.ensureIndexes`
- `Model.estimatedDocumentCount`
- `Model.exists`
- `Model.find`
- `Model.findById`
- `Model.findByIdAndUpdate`
- `Model.findByIdAndReplace`
- `Model.findOne`
- `Model.findOneAndDelete`
- `Model.findOneAndUpdate`
- `Model.findOneAndRemove`
- `Model.insertMany`
- `Model.listIndexes`
- `Model.replaceOne`
- `Model.syncIndexes`
- `Model.updateMany`
- `Model.updateOne`
- `Query.prototype.find`
- `Query.prototype.findOne`
- `Query.prototype.findOneAndDelete`
- `Query.prototype.findOneAndUpdate`
- `Query.prototype.findOneAndRemove`
- `Query.prototype.findOneAndReplace`
- `Query.prototype.validate`
- `Query.prototype.deleteOne`
- `Query.prototype.deleteMany`
- `Query.prototype.exec`
- `QueryCursor.prototype.close`
- `QueryCursor.prototype.next`

If you are using the above functions with callbacks, we recommend switching to async/await, or promises if async functions don't work for you.
If you need help refactoring a legacy codebase, [this tool from Mastering JS callbacks to async await](https://masteringjs.io/tutorials/tools/callback-to-async-await) using ChatGPT.

```javascript
// Before
conn.startSession(function(err, session) {
  // ...
});

// After
const session = await conn.startSession();
// Or:
conn.startSession().then(sesson => { /* ... */ });

// With error handling
try {
  await conn.startSession();
} catch (err) { /* ... */ }
// Or:
const [err, session] = await conn.startSession().then(
  session => ([null, session]),
  err => ([err, null])
);
```

<h2 id="removed-update"><a href="#removed-update">Removed <code>update()</code></a></h2>

`Model.update()`, `Query.prototype.update()`, and `Document.prototype.update()` have been removed.
Use `updateOne()` instead.

```javascript
// Before
await Model.update(filter, update);
await doc.update(update);

// After
await Model.updateOne(filter, update);
await doc.updateOne(update);
```

<h2 id="discriminator-schemas-use-base-schema-options-by-default"><a href="#discriminator-schemas-use-base-schema-options-by-default">Discriminator schemas use base schema options by default</a></h2>

When you use `Model.discriminator()`, Mongoose will now use the discriminator base schema's options by default.
This means you don't need to explicitly set child schema options to match the base schema's.

```javascript
const baseSchema = Schema({}, { typeKey: '$type' });
const Base = db.model('Base', baseSchema);

// In Mongoose 6.x, the `Base.discriminator()` call would throw because
// no `typeKey` option. In Mongoose 7, Mongoose uses the base schema's
// `typeKey` by default.
const childSchema = new Schema({}, {});
const Test = Base.discriminator('Child', childSchema);

Test.schema.options.typeKey; // '$type'
```

<h2 id="removed-castforquerywrapper"><a href="#removed-castforquerywrapper">Removed <code>castForQueryWrapper</code>, updated <code>castForQuery()</code> signature</a></h2>

Mongoose now always calls SchemaType `castForQuery()` method with 3 arguments: `$conditional`, `value`, and `context`.
If you've implemented a custom schema type that defines its own `castForQuery()` method, you need to update the method as follows.

```javascript
// Mongoose 6.x format:
MySchemaType.prototype.castForQuery = function($conditional, value) {
  if (arguments.length === 2) {
    // Handle casting value with `$conditional` - $eq, $in, $not, etc.
  } else {
    value = $conditional;
    // Handle casting `value` with no conditional
  }
};

// Mongoose 7.x format
MySchemaType.prototype.castForQuery = function($conditional, value, context) {
  if ($conditional != null) {
    // Handle casting value with `$conditional` - $eq, $in, $not, etc.
  } else {
    // Handle casting `value` with no conditional
  }
};
```

<h2 id="copy-schema-options-in-schema-prototype-add"><a href="#copy-schema-options-in-schema-prototype-add">Copy Schema options in <code>Schema.prototype.add()</code></a></h2>

Mongoose now copies user defined schema options when adding one schema to another.
For example, `childSchema` below will get `baseSchema`'s `id` and `toJSON` options.

```javascript
const baseSchema = new Schema({ created: Date }, { id: true, toJSON: { virtuals: true } });
const childSchema = new Schema([baseSchema, { name: String }]);

childSchema.options.toJSON; // { virtuals: true } in Mongoose 7. undefined in Mongoose 6.
```

This applies both when creating a new schema using an array of schemas, as well as when calling `add()` as follows.

```javascript
childSchema.add(new Schema({}, { toObject: { virtuals: true } }));

childSchema.options.toObject; // { virtuals: true } in Mongoose 7. undefined in Mongoose 6.
```

<h2 id="objectid-bsontype-now-has-lowercase-d"><a href="#objectid-bsontype-now-has-lowercase-d">ObjectId bsontype now has lowercase d</a></h2>

The internal `_bsontype` property on ObjectIds is equal to `'ObjectId'` in Mongoose 7, as opposed to `'ObjectID'` in Mongoose 6.

```javascript
const oid = new mongoose.Types.ObjectId();

oid._bsontype; // 'ObjectId' in Mongoose 7, 'ObjectID' in older versions of Mongoose
```

Please update any places where you use `_bsontype` to check if an object is an ObjectId.
This may also affect libraries that use Mongoose.

<h2 id="removed-support-for-custom-promise-libraries"><a href="#removed-support-for-custom-promise-libraries">Removed Support for custom promise libraries</a></h2>

Mongoose 7 no longer supports plugging in custom promise libraries. So the following no longer makes Mongoose return Bluebird promises in Mongoose 7.

```javascript
const mongoose = require('mongoose');

// No-op on Mongoose 7
mongoose.Promise = require('bluebird');
```

If you want to use Bluebird for all promises globally, you can do the following:

```javascript
global.Promise = require('bluebird');
```

<h2 id="typescript-specific-changes"><a href="#typescript-specific-changes">TypeScript-specific Changes</a></h2>

<h3 id="removed-leandocument-and-support-for-extends-document"><a href="#removed-leandocument-and-support-for-extends-document">Removed <code>LeanDocument</code> and support for <code>extends Document</code></a></h3>

Mongoose 7 no longer exports a `LeanDocument` type, and no longer supports passing a document type that `extends Document` into `Model<>`.

```ts
// No longer supported
interface ITest extends Document {
  name?: string;
}
const Test = model<ITest>('Test', schema);

// Do this instead, no `extends Document`
interface ITest {
  name?: string;
}
const Test = model<ITest>('Test', schema);

// If you need to access the hydrated document type, use the following code
type TestDocument = ReturnType<(typeof Test)['hydrate']>;
```

<h3 id="new-parameters-for-hydrateddocument"><a href="#new-parameters-for-hydrateddocument">New Parameters for <code>HydratedDocument</code></a></h3>

Mongoose's `HydratedDocument` type transforms a raw document interface into the type of the hydrated Mongoose document, including virtuals, methods, etc.
In Mongoose 7, the generic parameters to `HydratedDocument` have changed.
In Mongoose 6, the generic parameters were:

```ts
type HydratedDocument<
  DocType,
  TMethodsAndOverrides = {},
  TVirtuals = {}
> = Document<unknown, any, DocType> &
Require_id<DocType> &
TMethodsAndOverrides &
TVirtuals;
```

In Mongoose 7, the new type is as follows.

```ts
type HydratedDocument<
  DocType,
  TOverrides = {},
  TQueryHelpers = {}
> = Document<unknown, TQueryHelpers, DocType> &
Require_id<DocType> &
TOverrides;
```

In Mongoose 7, the first parameter is the raw document interface, the 2nd parameter is any document-specific overrides (usually virtuals and methods), and the 3rd parameter is any query helpers associated with the document's model.

The key difference is that, in Mongoose 6, the 3rd generic param was the document's _virtuals_.
In Mongoose 7, the 3rd generic param is the document's _query helpers_.

```ts
// Mongoose 6 version:
type UserDocument = HydratedDocument<TUser, TUserMethods, TUserVirtuals>;

// Mongoose 7:
type UserDocument = HydratedDocument<TUser, TUserMethods & TUserVirtuals, TUserQueryHelpers>;
```
