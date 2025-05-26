# Migrating from 6.x to 7.x

<style>
  ul > li {
    padding: 4px 0px;
  }
</style>

There are several backwards-breaking changes
you should be aware of when migrating from Mongoose 6.x to Mongoose 7.x.

If you're still on Mongoose 5.x, please read the [Mongoose 5.x to 6.x migration guide](migrating_to_6.html) and upgrade to Mongoose 6.x first.

* [Version Requirements](#version-requirements)
* [`strictQuery`](#strictquery)
* [Removed `remove()`](#removed-remove)
* [Dropped callback support](#dropped-callback-support)
* [Removed `update()`](#removed-update)
* [ObjectId requires `new`](#objectid-requires-new)
* [`id` setter](#id-setter)
* [Discriminator schemas use base schema options by default](#discriminator-schemas-use-base-schema-options-by-default)
* [Removed `castForQueryWrapper()`, updated `castForQuery()` signature](#removed-castforquerywrapper)
* [Copy schema options in `Schema.prototype.add()`](#copy-schema-options-in-schema-prototype-add)
* [ObjectId bsontype now has lowercase d](#objectid-bsontype-now-has-lowercase-d)
* [Removed support for custom promise libraries](#removed-support-for-custom-promise-libraries)
* [Removed mapReduce](#removed-mapreduce)
* [Deprecated `keepAlive`](#deprecated-keepalive)
* [TypeScript-specific changes](#typescript-specific-changes)
  * [Removed `LeanDocument` and support for `extends Document`](#removed-leandocument-and-support-for-extends-document)
  * [New parameters for `HydratedDocument`](#new-parameters-for-hydrateddocument)

## Version Requirements {#version-requirements}

Mongoose now requires Node.js >= 14.0.0 and MongoDB Node Driver >= 5.0.0.

See [the MongoDB Node Driver migration guide](https://github.com/mongodb/node-mongodb-native/blob/main/etc/notes/CHANGES_5.0.0.md) for detailed info.

## `strictQuery` {#strictquery}

`strictQuery` is now false by default.

```javascript
const mySchema = new Schema({ field: Number });
const MyModel = mongoose.model('Test', mySchema);

// Mongoose will not strip out `notInSchema: 1` because `strictQuery` is false by default
const docs = await MyModel.find({ notInSchema: 1 });
// Empty array in Mongoose 7. In Mongoose 6, this would contain all documents in MyModel
docs;
```

## Removed `remove()` {#removed-remove}

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

## Dropped callback support {#dropped-callback-support}

The following functions no longer accept callbacks.
They always return promises.

* `Aggregate.prototype.exec`
* `Aggregate.prototype.explain`
* `AggregationCursor.prototype.close`
* `AggregationCursor.prototype.next`
* `AggregationCursor.prototype.eachAsync`
* `Connection.prototype.startSession`
* `Connection.prototype.dropCollection`
* `Connection.prototype.createCollection`
* `Connection.prototype.dropDatabase`
* `Connection.prototype.openUri`
* `Connection.prototype.close`
* `Connection.prototype.destroy`
* `Document.prototype.populate`
* `Document.prototype.save`
* `Document.prototype.validate`
* `Mongoose.prototype.connect`
* `Mongoose.prototype.createConnection`
* `Model.prototype.save`
* `Model.aggregate`
* `Model.bulkWrite`
* `Model.cleanIndexes`
* `Model.count`
* `Model.countDocuments`
* `Model.create`
* `Model.createCollection`
* `Model.createIndexes`
* `Model.deleteOne`
* `Model.deleteMany`
* `Model.distinct`
* `Model.ensureIndexes`
* `Model.estimatedDocumentCount`
* `Model.exists`
* `Model.find`
* `Model.findById`
* `Model.findByIdAndUpdate`
* `Model.findByIdAndReplace`
* `Model.findOne`
* `Model.findOneAndDelete`
* `Model.findOneAndUpdate`
* `Model.findOneAndRemove`
* `Model.insertMany`
* `Model.listIndexes`
* `Model.replaceOne`
* `Model.syncIndexes`
* `Model.updateMany`
* `Model.updateOne`
* `Query.prototype.count`
* `Query.prototype.find`
* `Query.prototype.findOne`
* `Query.prototype.findOneAndDelete`
* `Query.prototype.findOneAndUpdate`
* `Query.prototype.findOneAndRemove`
* `Query.prototype.findOneAndReplace`
* `Query.prototype.validate`
* `Query.prototype.deleteOne`
* `Query.prototype.deleteMany`
* `Query.prototype.exec`
* `QueryCursor.prototype.close`
* `QueryCursor.prototype.next`
* `QueryCursor.prototype.eachAsync`

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
conn.startSession().then(session => { /* ... */ });

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

## Removed `update()` {#removed-update}

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

## ObjectId requires `new` {#objectid-requires-new}

In Mongoose 6 and older, you could define a new ObjectId without using the `new` keyword:

```javascript
// Works in Mongoose 6
// Throws "Class constructor ObjectId cannot be invoked without 'new'" in Mongoose 7
const oid = mongoose.Types.ObjectId('0'.repeat(24));
```

In Mongoose 7, `ObjectId` is now a [JavaScript class](https://masteringjs.io/tutorials/fundamentals/class), so you need to use the `new` keyword.

```javascript
// Works in Mongoose 6 and Mongoose 7
const oid = new mongoose.Types.ObjectId('0'.repeat(24));
```

## `id` Setter {#id-setter}

Starting in Mongoose 7.4, Mongoose's built-in `id` virtual (which stores the document's `_id` as a string) has a setter which allows modifying the document's `_id` property via `id`.

```javascript
const doc = await TestModel.findOne();

doc.id = '000000000000000000000000';
doc._id; // ObjectId('000000000000000000000000')
```

This can cause surprising behavior if you create a `new TestModel(obj)` where `obj` contains both an `id` and an `_id`, or if you use `doc.set()`

```javascript
// Because `id` is after `_id`, the `id` will overwrite the `_id`
const doc = new TestModel({
  _id: '000000000000000000000000',
  id: '111111111111111111111111'
});

doc._id; // ObjectId('111111111111111111111111')
```

[The `id` setter was later removed in Mongoose 8](/docs/migrating_to_8.html#removed-id-setter) due to compatibility issues.

## Discriminator schemas use base schema options by default {#discriminator-schemas-use-base-schema-options-by-default}

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

## Removed `castForQueryWrapper`, updated `castForQuery()` signature {#removed-castforquerywrapper}

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

## Copy Schema options in `Schema.prototype.add()` {#copy-schema-options-in-schema-prototype-add}

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

## ObjectId bsontype now has lowercase d {#objectid-bsontype-now-has-lowercase-d}

The internal `_bsontype` property on ObjectIds is equal to `'ObjectId'` in Mongoose 7, as opposed to `'ObjectID'` in Mongoose 6.

```javascript
const oid = new mongoose.Types.ObjectId();

oid._bsontype; // 'ObjectId' in Mongoose 7, 'ObjectID' in older versions of Mongoose
```

Please update any places where you use `_bsontype` to check if an object is an ObjectId.
This may also affect libraries that use Mongoose.

## Removed `mapReduce` {#removed-mapreduce}

MongoDB no longer supports `mapReduce`, so Mongoose 7 no longer has a `Model.mapReduce()` function.
Use the aggregation framework as a replacement for `mapReduce()`.

```javascript
// The following no longer works in Mongoose 7.
const o = {
  map: function() {
    emit(this.author, 1);
  },
  reduce: function(k, vals) {
    return vals.length;
  }
};

await MR.mapReduce(o);
```

## Removed Support for custom promise libraries {#removed-support-for-custom-promise-libraries}

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

## Deprecated `keepAlive` {#deprecated-keepalive}

Before Mongoose 5.2.0, you needed to enable the `keepAlive` option to initiate [TCP keepalive](https://tldp.org/HOWTO/TCP-Keepalive-HOWTO/overview.html) to prevent `"connection closed"` errors.
However, `keepAlive` has been `true` by default since Mongoose 5.2.0, and the `keepAlive` is deprecated as of Mongoose 7.2.0.
Please remove `keepAlive` and `keepAliveInitialDelay` options from your Mongoose connections.

## TypeScript-specific Changes {#typescript-specific-changes}

### Removed `LeanDocument` and support for `extends Document` {#removed-leandocument-and-support-for-extends-document}

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

### New Parameters for `HydratedDocument` {#new-parameters-for-hydrateddocument}

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

The key difference is that, in Mongoose 6, the 3rd generic param was the document's *virtuals*.
In Mongoose 7, the 3rd generic param is the document's *query helpers*.

```ts
// Mongoose 6 version:
type UserDocument = HydratedDocument<TUser, TUserMethods, TUserVirtuals>;

// Mongoose 7:
type UserDocument = HydratedDocument<TUser, TUserMethods & TUserVirtuals, TUserQueryHelpers>;
```
