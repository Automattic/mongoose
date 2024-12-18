# Migrating from 5.x to 6.x

<style>
  ul > li {
    padding: 4px 0px;
  }
</style>

Please note: we plan to discontinue Mongoose 5 support on March 1, 2024.
Please see our [version support guide](./version-support.html).

There are several [backwards-breaking changes](https://github.com/Automattic/mongoose/blob/master/CHANGELOG.md)
you should be aware of when migrating from Mongoose 5.x to Mongoose 6.x.

If you're still on Mongoose 4.x, please read the [Mongoose 4.x to 5.x migration guide](migrating_to_5.html) and upgrade to Mongoose 5.x first.

* [Version Requirements](#version-requirements)
* [MongoDB Driver 4.0](#mongodb-driver-40)
* [No More Deprecation Warning Options](#no-more-deprecation-warning-options)
* [The `asPromise()` Method for Connections](#the-aspromise-method-for-connections)
* [`mongoose.connect()` Returns a Promise](#mongoose-connect-returns-a-promise)
* [Duplicate Query Execution](#duplicate-query-execution)
* [`Model.exists()` Returns a lean document instead of Boolean](#model-exists-returns-a-lean-document-instead-of-boolean)
* [`strictQuery` is now equal to `strict` by default](#strictquery-is-removed-and-replaced-by-strict)
* [MongoError is now MongoServerError](#mongoerror-is-now-mongoservererror)
* [Simplified `isValidObjectId()` and separate `isObjectIdOrHexString()`](#simplified-isvalidobjectid-and-separate-isobjectidorhexstring)
* [Clone Discriminator Schemas By Default](#clone-discriminator-schemas-by-default)
* [Schema Defined Document Key Order](#schema-defined-document-key-order)
* [`sanitizeFilter` and `trusted()`](#sanitizefilter-and-trusted)
* [Removed `omitUndefined`: Mongoose now removes `undefined` keys in updates instead of setting them to `null`](#removed-omitundefined)
* [Document Parameter to Default Functions](#document-parameter-to-default-functions)
* [Arrays are Proxies](#arrays-are-proxies)
* [`typePojoToMixed`](#typepojotomixed)
* [`strictPopulate()`](#strictpopulate)
* [Subdocument `ref` Function Context](#subdocument-ref-function-context)
* [Schema Reserved Names Warning](#schema-reserved-names-warning)
* [Subdocument Paths](#subdocument-paths)
* [Creating Aggregation Cursors](#creating-aggregation-cursors)
* [`autoCreate` Defaults to `true`](#autocreate-defaults-to-true)
* [No More `context: 'query'`](#no-more-context-query)
* [Custom Validators with Populated Paths](#custom-validators-with-populated-paths)
* [Disconnected Event with Replica Sets](#disconnected-event-with-replica-sets)
* [Removed `execPopulate()`](#removed-execpopulate)
* [`create()` with Empty Array](#create-with-empty-array)
* [Removed Nested Path Merging](#removed-nested-path-merging)
* [ObjectId `valueOf()`](#objectid-valueof)
* [Immutable `createdAt`](#immutable-createdat)
* [Removed Validator `isAsync`](#removed-validator-isasync)
* [Removed `safe`](#removed-safe)
* [SchemaType `set` parameters now use `priorValue` as the second parameter instead of `self`](#schematype-set-parameters)
* [No default model for `Query.prototype.populate()`](#no-default-model-for-query-prototype-populate)
* [`toObject()` and `toJSON()` Use Nested Schema `minimize`](#toobject-and-tojson-use-nested-schema-minimize)
* [Removed `reconnectTries` and `reconnectInterval` options](#removed-reconnecttries-and-reconnectinterval-options)
* [MongoDB Driver's New URL Parser Incompatible with Some npm Packages](#mongodb-drivers-new-url-parser-incompatible-with-some-npm-packages)
* [Lodash `.isEmpty()` returns false for ObjectIds](#lodash-object-id)
* [mongoose.modelSchemas removed](#model-schemas)
* [TypeScript changes](#typescript-changes)

## Version Requirements {#version-requirements}

Mongoose now requires Node.js >= 12.0.0. Mongoose still supports MongoDB server versions back to 3.0.0.

## MongoDB Driver 4.0 {#mongodb-driver-40}

Mongoose now uses v4.x of the [MongoDB Node driver](https://www.npmjs.com/package/mongodb).
See [the MongoDB Node drivers' migration guide](https://github.com/mongodb/node-mongodb-native/blob/4.0/docs/CHANGES_4.0.0.md) for detailed info.
Below are some of the most noteworthy changes:

* MongoDB Driver 4.x is written in TypeScript and has its own TypeScript type definitions. These may conflict with `@types/mongodb`, so if you have TypeScript compiler errors please make sure you upgrade to the [latest version of `@types/mongodb`](https://www.npmjs.com/package/@types/mongodb), which is an empty stub.
* The `poolSize` option for connections has been [replaced with `minPoolSize` and `maxPoolSize`](https://github.com/mongodb/node-mongodb-native/blob/4.1/docs/CHANGES_4.0.0.md#connection-pool-options). The Mongoose 5.x `poolSize` option is equivalent to the Mongoose 6 `maxPoolSize` option. The default value of `maxPoolSize` has been increased to 100.
* The result of `updateOne()` and `updateMany()` is now different.
* The result of `deleteOne()` and `deleteMany()` no longer has an `n` property.

```javascript
const res = await TestModel.updateMany({}, { someProperty: 'someValue' });

res.matchedCount; // Number of documents that were found that match the filter. Replaces `res.n`
res.modifiedCount; // Number of documents modified. Replaces `res.nModified`
res.upsertedCount; // Number of documents upserted. Replaces `res.upserted`
```

```javascript
const res = await TestModel.deleteMany({});

// In Mongoose 6: `{ acknowledged: true, deletedCount: 2 }`
// In Mongoose 5: `{ n: 2, ok: 1, deletedCount: 2 }`
res;

res.deletedCount; // Number of documents that were deleted. Replaces `res.n`
```

## No More Deprecation Warning Options {#no-more-deprecation-warning-options}

`useNewUrlParser`, `useUnifiedTopology`, `useFindAndModify`, and `useCreateIndex` are no longer supported options. Mongoose 6 always behaves as if `useNewUrlParser`, `useUnifiedTopology`, and `useCreateIndex` are `true`, and `useFindAndModify` is `false`. Please remove these options from your code.

```javascript
// No longer necessary:
mongoose.set('useFindAndModify', false);

await mongoose.connect('mongodb://127.0.0.1:27017/test', {
  useNewUrlParser: true, // <-- no longer necessary
  useUnifiedTopology: true // <-- no longer necessary
});
```

## The `asPromise()` Method for Connections {#the-aspromise-method-for-connections}

Mongoose connections are no longer [thenable](https://masteringjs.io/tutorials/fundamentals/thenable). This means that `await mongoose.createConnection(uri)` **no longer waits for Mongoose to connect**. Use `mongoose.createConnection(uri).asPromise()` instead. See [#8810](https://github.com/Automattic/mongoose/issues/8810).

```javascript
// The below no longer works in Mongoose 6
await mongoose.createConnection(uri);

// Do this instead
await mongoose.createConnection(uri).asPromise();
```

## `mongoose.connect()` Returns a Promise {#mongoose-connect-returns-a-promise}

The `mongoose.connect()` function now always returns a promise, **not** a Mongoose instance.

## Duplicate Query Execution {#duplicate-query-execution}

Mongoose no longer allows executing the same query object twice. If you do, you'll get a `Query was already executed` error. Executing the same query instance twice is typically indicative of mixing callbacks and promises, but if you need to execute the same query twice, you can call `Query#clone()` to clone the query and re-execute it. See [gh-7398](https://github.com/Automattic/mongoose/issues/7398)

```javascript
// Results in 'Query was already executed' error, because technically this `find()` query executes twice.
await Model.find({}, function(err, result) {});

const q = Model.find();
await q;
await q.clone(); // Can `clone()` the query to allow executing the query again
```

## `Model.exists(...)` now returns a lean document instead of boolean {#model-exists-returns-a-lean-document-instead-of-boolean}

```js
// in Mongoose 5.x, `existingUser` used to be a boolean
// now `existingUser` will be either `{ _id: ObjectId(...) }` or `null`.
const existingUser = await User.exists({ name: 'John' });
if (existingUser) {
  console.log(existingUser._id);
}
```

## `strictQuery` is now equal to `strict` by default {#strictquery-is-removed-and-replaced-by-strict}

~Mongoose no longer supports a `strictQuery` option. You must now use `strict`.~
As of Mongoose 6.0.10, we brought back the `strictQuery` option. In Mongoose 6, `strictQuery` is set to `strict` by default. This means that, by default, Mongoose will filter out query filter properties that are not in the schema.

However, this behavior was a source of confusion in some cases, so in Mongoose 7, this default changes back to `false`. So if you want to retain the default behavior of Mongoose 5 as well as Mongoose 7 and later, you can also disable `strictQuery` globally to override:

```javascript
mongoose.set('strictQuery', false);
```

In a test suite, it may be useful to set `strictQuery` to `throw`, which will throw exceptions any time a query references schema that doesn't exist, which could help identify a bug in your tests or code.

Here's an example of the effect of `strictQuery`:

```javascript
const userSchema = new Schema({ name: String });
const User = mongoose.model('User', userSchema);

// By default, this is equivalent to `User.find()` because Mongoose filters out `notInSchema`
await User.find({ notInSchema: 1 });

// Set `strictQuery: false` to opt in to filtering by properties that aren't in the schema
await User.find({ notInSchema: 1 }, null, { strictQuery: false });
// equivalent:
await User.find({ notInSchema: 1 }).setOptions({ strictQuery: false });
```

You can also disable `strictQuery` globally to override:

```javascript
mongoose.set('strictQuery', false);
```

## MongoError is now MongoServerError {#mongoerror-is-now-mongoservererror}

In MongoDB Node.js Driver v4.x, 'MongoError' is now 'MongoServerError'. Please change any code that depends on the hardcoded string 'MongoError'.

## Clone Discriminator Schemas By Default {#clone-discriminator-schemas-by-default}

Mongoose now clones discriminator schemas by default. This means you need to pass `{ clone: false }` to `discriminator()` if you're using recursive embedded discriminators.

```javascript
// In Mongoose 6, these two are equivalent:
User.discriminator('author', authorSchema);
User.discriminator('author', authorSchema.clone());

// To opt out if `clone()` is causing issues, pass `clone: false`
User.discriminator('author', authorSchema, { clone: false });
```

## Simplified `isValidObjectId()` and separate `isObjectIdOrHexString()` {#simplified-isvalidobjectid-and-separate-isobjectidorhexstring}

In Mongoose 5, `mongoose.isValidObjectId()` returned `false` for values like numbers, which was inconsistent with the MongoDB driver's `ObjectId.isValid()` function.
Technically, any JavaScript number can be converted to a MongoDB ObjectId.

In Mongoose 6, `mongoose.isValidObjectId()` is just a wrapper for `mongoose.Types.ObjectId.isValid()` for consistency.

Mongoose 6.2.5 now includes a `mongoose.isObjectIdOrHexString()` function, which does a better job of capturing the more common use case for `isValidObjectId()`: is the given value an `ObjectId` instance or a 24 character hex string representing an `ObjectId`?

```javascript
// `isValidObjectId()` returns `true` for some surprising values, because these
// values are _technically_ ObjectId representations
mongoose.isValidObjectId(new mongoose.Types.ObjectId()); // true
mongoose.isValidObjectId('0123456789ab'); // true
mongoose.isValidObjectId(6); // true
mongoose.isValidObjectId(new User({ name: 'test' })); // true

// `isObjectIdOrHexString()` instead only returns `true` for ObjectIds and 24
// character hex strings.
mongoose.isObjectIdOrHexString(new mongoose.Types.ObjectId()); // true
mongoose.isObjectIdOrHexString('62261a65d66c6be0a63c051f'); // true
mongoose.isObjectIdOrHexString('0123456789ab'); // false
mongoose.isObjectIdOrHexString(6); // false
```

## Schema Defined Document Key Order {#schema-defined-document-key-order}

Mongoose now saves objects with keys in the order the keys are specified in the schema, not in the user-defined object. So whether `Object.keys(new User({ name: String, email: String }).toObject()` is `['name', 'email']` or `['email', 'name']` depends on the order `name` and `email` are defined in your schema.

```javascript
const schema = new Schema({
  profile: {
    name: {
      first: String,
      last: String
    }
  }
});
const Test = db.model('Test', schema);

const doc = new Test({
  profile: { name: { last: 'Musashi', first: 'Miyamoto' } }
});

// Note that 'first' comes before 'last', even though the argument to `new Test()` flips the key order.
// Mongoose uses the schema's key order, not the provided objects' key order.
assert.deepEqual(Object.keys(doc.toObject().profile.name), ['first', 'last']);
```

## `sanitizeFilter` and `trusted()` {#sanitizefilter-and-trusted}

Mongoose 6 introduces a new `sanitizeFilter` option to globals and queries that defends against [query selector injection attacks](https://thecodebarbarian.com/2014/09/04/defending-against-query-selector-injection-attacks.html). If you enable `sanitizeFilter`, Mongoose will wrap any object in the query filter in a `$eq`:

```javascript
// Mongoose will convert this filter into `{ username: 'val', pwd: { $eq: { $ne: null } } }`, preventing
// a query selector injection.
await Test.find({ username: 'val', pwd: { $ne: null } }).setOptions({ sanitizeFilter: true });
```

To explicitly allow a query selector, use `mongoose.trusted()`:

```javascript
// `mongoose.trusted()` allows query selectors through
await Test.find({ username: 'val', pwd: mongoose.trusted({ $ne: null }) }).setOptions({ sanitizeFilter: true });
```

## Removed `omitUndefined`: Mongoose now removes `undefined` keys in updates instead of setting them to `null` {#removed-omitundefined}

In Mongoose 5.x, setting a key to `undefined` in an update operation was equivalent to setting it to `null`.

```javascript
let res = await Test.findOneAndUpdate({}, { $set: { name: undefined } }, { new: true });

res.name; // `null` in Mongoose 5.x

// Equivalent to `findOneAndUpdate({}, {}, { new: true })` because `omitUndefined` will
// remove `name: undefined`
res = await Test.findOneAndUpdate({}, { $set: { name: undefined } }, { new: true, omitUndefined: true });
```

Mongoose 5.x supported an `omitUndefined` option to strip out `undefined` keys.
In Mongoose 6.x, the `omitUndefined` option has been removed, and Mongoose will always strip out undefined keys.

```javascript
// In Mongoose 6, equivalent to `findOneAndUpdate({}, {}, { new: true })` because Mongoose will
// remove `name: undefined`
const res = await Test.findOneAndUpdate({}, { $set: { name: undefined } }, { new: true });
```

The only workaround is to explicitly set properties to `null` in your updates:

```javascript
const res = await Test.findOneAndUpdate({}, { $set: { name: null } }, { new: true });
```

## Document Parameter to Default Functions {#document-parameter-to-default-functions}

Mongoose now passes the document as the first parameter to `default` functions, which is helpful for using [arrow functions](https://masteringjs.io/tutorials/fundamentals/arrow) with defaults.

This may affect you if you pass a function that expects different parameters to `default`, like `default: mongoose.Types.ObjectId`. See [gh-9633](https://github.com/Automattic/mongoose/issues/9633). If you're passing a default function that does **not** utilize the document, change `default: myFunction` to `default: () => myFunction()` to avoid accidentally passing parameters that potentially change the behavior.

```javascript
const schema = new Schema({
  name: String,
  age: Number,
  canVote: {
    type: Boolean,
    // Default functions now receive a `doc` parameter, helpful for arrow functions
    default: doc => doc.age >= 18
  }
});
```

## Arrays are Proxies {#arrays-are-proxies}

Mongoose arrays are now ES6 proxies. You no longer need to `markModified()` after setting an array index directly.

```javascript
const post = await BlogPost.findOne();

post.tags[0] = 'javascript';
await post.save(); // Works, no need for `markModified()`!
```

## `typePojoToMixed` {#typepojotomixed}

Schema paths declared with `type: { name: String }` become single nested subdocs in Mongoose 6, as opposed to Mixed in Mongoose 5. This removes the need for the `typePojoToMixed` option. See [gh-7181](https://github.com/Automattic/mongoose/issues/7181).

```javascript
// In Mongoose 6, the below makes `foo` into a subdocument with a `name` property.
// In Mongoose 5, the below would make `foo` a `Mixed` type, _unless_ you set `typePojoToMixed: false`.
const schema = new Schema({
  foo: { type: { name: String } }
});
```

## `strictPopulate()` {#strictpopulate}

Mongoose now throws an error if you `populate()` a path that isn't defined in your schema. This is only for cases when we can infer the local schema, like when you use `Query#populate()`, **not** when you call `Model.populate()` on a POJO. See [gh-5124](https://github.com/Automattic/mongoose/issues/5124).

## Subdocument `ref` Function Context {#subdocument-ref-function-context}

When populating a subdocument with a function `ref` or `refPath`, `this` is now the subdocument being populated, not the top-level document. See [#8469](https://github.com/Automattic/mongoose/issues/8469).

```javascript
const schema = new Schema({
  works: [{
    modelId: String,
    data: {
      type: mongoose.ObjectId,
      ref: function(doc) {
        // In Mongoose 6, `doc` is the array element, so you can access `modelId`.
        // In Mongoose 5, `doc` was the top-level document.
        return doc.modelId;
      }
    }
  }]
});
```

## Schema Reserved Names Warning {#schema-reserved-names-warning}

Using `save`, `isNew`, and other Mongoose reserved names as schema path names now triggers a warning, not an error. You can suppress the warning by setting the `suppressReservedKeysWarning` in your schema options: `new Schema({ save: String }, { suppressReservedKeysWarning: true })`. Keep in mind that this may break plugins that rely on these reserved names.

## Subdocument Paths {#subdocument-paths}

Single nested subdocs have been renamed to "subdocument paths". So `SchemaSingleNestedOptions` is now `SchemaSubdocumentOptions` and `mongoose.Schema.Types.Embedded` is now `mongoose.Schema.Types.Subdocument`. See [gh-10419](https://github.com/Automattic/mongoose/issues/10419)

## Creating Aggregation Cursors {#creating-aggregation-cursors}

`Aggregate#cursor()` now returns an AggregationCursor instance to be consistent with `Query#cursor()`. You no longer need to do `Model.aggregate(pipeline).cursor().exec()` to get an aggregation cursor, just `Model.aggregate(pipeline).cursor()`.

## `autoCreate` Defaults to `true` {#autocreate-defaults-to-true}

`autoCreate` is `true` by default **unless** readPreference is secondary or secondaryPreferred, which means Mongoose will attempt to create every model's underlying collection before creating indexes. If readPreference is secondary or secondaryPreferred, Mongoose will default to `false` for both `autoCreate` and `autoIndex` because both `createCollection()` and `createIndex()` will fail when connected to a secondary.

## No More `context: 'query'` {#no-more-context-query}

The `context` option for queries has been removed. Now Mongoose always uses `context = 'query'`.

## Custom Validators with Populated Paths {#custom-validators-with-populated-paths}

Mongoose 6 always calls validators with depopulated paths (that is, with the id rather than the document itself). In Mongoose 5, Mongoose would call validators with the populated doc if the path was populated. See [#8042](https://github.com/Automattic/mongoose/issues/8042)

## Disconnected Event with Replica Sets {#disconnected-event-with-replica-sets}

When connected to a replica set, connections now emit 'disconnected' when connection to the primary is lost. In Mongoose 5, connections only emitted 'disconnected' when losing connection to all members of the replica set.

However, Mongoose 6 does **not** buffer commands while a connection is disconnected. So you can still successfully execute commands like queries with `readPreference = 'secondary'`, even if the Mongoose connection is in the disconnected state.

## Removed `execPopulate()` {#removed-execpopulate}

`Document#populate()` now returns a promise and is now no longer chainable.

* Replace `await doc.populate('path1').populate('path2').execPopulate();` with `await doc.populate(['path1', 'path2']);`
* Replace `await doc.populate('path1', 'select1').populate('path2', 'select2').execPopulate();` with

  ```js
  await doc.populate([{path: 'path1', select: 'select1'}, {path: 'path2', select: 'select2'}]);
  ```

## `create()` with Empty Array {#create-with-empty-array}

`await Model.create([])` in v6.0 returns an empty array when provided an empty array, in v5.0 it used to return `undefined`. If any of your code is checking whether the output is `undefined` or not, you need to modify it with the assumption that `await Model.create(...)` will always return an array if provided an array.

## Removed Nested Path Merging {#removed-nested-path-merging}

`doc.set({ child: { age: 21 } })` now works the same whether `child` is a nested path or a subdocument: Mongoose will overwrite the value of `child`. In Mongoose 5, this operation would merge `child` if `child` was a nested path.

## ObjectId `valueOf()` {#objectid-valueof}

Mongoose now adds a `valueOf()` function to ObjectIds. This means you can now use `==` to compare an ObjectId against a string.

```javascript
const a = ObjectId('6143b55ac9a762738b15d4f0');

a == '6143b55ac9a762738b15d4f0'; // true
```

## Immutable `createdAt` {#immutable-createdat}

If you set `timestamps: true`, Mongoose will now make the `createdAt` property `immutable`. See [gh-10139](https://github.com/Automattic/mongoose/issues/10139)

## Removed Validator `isAsync` {#removed-validator-isasync}

`isAsync` is no longer an option for `validate`. Use an `async function` instead.

## Removed `safe` {#removed-safe}

`safe` is no longer an option for schemas, queries, or `save()`. Use `writeConcern` instead.

## SchemaType `set` parameters {#schematype-set-parameters}

Mongoose now calls setter functions with `priorValue` as the 2nd parameter, rather than `schemaType` in Mongoose 5.

```js
const userSchema = new Schema({
  name: {
    type: String,
    trimStart: true,
    set: trimStartSetter
  }
});

// in v5.x the parameters were (value, schemaType), in v6.x the parameters are (value, priorValue, schemaType).
function trimStartSetter(val, priorValue, schemaType) {
  if (schemaType.options.trimStart && typeof val === 'string') {
    return val.trimStart();
  }
  return val;
}

const User = mongoose.model('User', userSchema);

const user = new User({ name: 'Robert Martin' });
console.log(user.name); // 'robert martin'
```

## `toObject()` and `toJSON()` Use Nested Schema `minimize` {#toobject-and-tojson-use-nested-schema-minimize}

This change was technically released with 5.10.5, but [caused issues for users migrating from 5.9.x to 6.x](https://github.com/Automattic/mongoose/issues/10827).
In Mongoose `< 5.10.5`, `toObject()` and `toJSON()` would use the top-level schema's `minimize` option by default.

```javascript
const child = new Schema({ thing: Schema.Types.Mixed });
const parent = new Schema({ child }, { minimize: false });
const Parent = model('Parent', parent);
const p = new Parent({ child: { thing: {} } });

// In v5.10.4, would contain `child.thing` because `toObject()` uses `parent` schema's `minimize` option
// In `>= 5.10.5`, `child.thing` is omitted because `child` schema has `minimize: true`
console.log(p.toObject());
```

As a workaround, you can either explicitly pass `minimize` to `toObject()` or `toJSON()`:

```javascript
console.log(p.toObject({ minimize: false }));
```

Or define the `child` schema inline (Mongoose 6 only) to inherit the parent's `minimize` option.

```javascript
const parent = new Schema({
  // Implicitly creates a new schema with the top-level schema's `minimize` option.
  child: { type: { thing: Schema.Types.Mixed } }
}, { minimize: false });
```

## No default model for `Query.prototype.populate()` {#no-default-model-for-query-prototype-populate}

In Mongoose 5, calling `populate()` on a mixed type or other path with no `ref` would fall back to using the query's model.

```javascript
const testSchema = new mongoose.Schema({
  data: String,
  parents: Array // Array of mixed
});

const Test = mongoose.model('Test', testSchema);

// The below `populate()`...
await Test.findOne().populate('parents');
// Is a shorthand for the following populate in Mongoose 5
await Test.findOne().populate({ path: 'parents', model: Test });
```

In Mongoose 6, populating a path with no `ref`, `refPath`, or `model` is a no-op.

```javascript
// The below `populate()` does nothing.
await Test.findOne().populate('parents');
```

## MongoDB Driver's New URL Parser Incompatible with Some npm Packages {#mongodb-drivers-new-url-parser-incompatible-with-some-npm-packages}

The MongoDB Node driver version that Mongoose 6 uses relies on a [URL parser module](https://npmjs.com/package/whatwg-url) that has several known compatibility issues with other npm packages.
This can lead to errors like `Invalid URL: mongodb+srv://username:password@development.xyz.mongodb.net/abc` if you use one of the incompatible packages.
[You can find a list of incompatible packages here](https://mongoosejs.com/docs/incompatible_packages).

## Removed `reconnectTries` and `reconnectInterval` options {#removed-reconnecttries-and-reconnectinterval-options}

The `reconnectTries` and `reconnectInterval` options have been removed since they are no longer necessary.

The MongoDB node driver will always attempt to retry any operation for up to `serverSelectionTimeoutMS`, even if MongoDB is down for a long period of time.
So, it will never run out of retries or try to reconnect to MongoDB.

## Lodash `.isEmpty()` returns true for ObjectIds {#lodash-object-id}

Lodash's `isEmpty()` function returns true for primitives and primitive wrappers.
`ObjectId()` is an object wrapper that is treated as a primitive by Mongoose.
But starting in Mongoose 6, `_.isEmpty()` will return true for ObjectIds because of Lodash implementation details.

An ObjectId in mongoose is never empty, so if you're using `isEmpty()` you should check for `instanceof ObjectId`.

```javascript
if (!(val instanceof Types.ObjectId) && _.isEmpty(val)) {
  // Handle empty object here
}
```

## Removed `mongoose.modelSchemas` {#model-schemas}

The `mongoose.modelSchemas` property was removed. This may have been used to delete a model schema.

```javascript
// before
delete mongoose.modelSchemas.User;

// with Mongoose 6.x
delete mongoose.deleteModel('User');
```

## TypeScript changes

The `Schema` class now takes 3 generic params instead of 4. The 3rd generic param, `SchemaDefinitionType`, is now the same as the 1st generic param `DocType`. Replace `new Schema<UserDocument, UserModel, User>(schemaDefinition)` with `new Schema<UserDocument, UserModel>(schemaDefinition)`

`Types.ObjectId` is now a class, which means you can no longer omit `new` when creating a new ObjectId using `new mongoose.Types.ObjectId()`.
Currently, you can still omit `new` in JavaScript, but you **must** put `new` in TypeScript.

The following legacy types have been removed:

* `ModelUpdateOptions`
* `DocumentQuery`
* `HookSyncCallback`
* `HookAsyncCallback`
* `HookErrorCallback`
* `HookNextFunction`
* `HookDoneFunction`
* `SchemaTypeOpts`
* `ConnectionOptions`

Mongoose 6 infers the document's type for `this` in virtual getters and setters.
In Mongoose 5.x, `this` would be `any` in the following code.

```ts
schema.virtual('myVirtual').get(function() {
  this; // any in Mongoose 5.x
});
```

In Mongoose 6, `this` will be set to the document type.

```ts
const schema = new Schema({ name: String });

schema.virtual('myVirtual').get(function() {
  this.name; // string
});
```
