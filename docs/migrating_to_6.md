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
* [TypeScript changes](#typescript-changes)
* [Removed `reconnectTries` and `reconnectInterval` options](#removed-reconnecttries-and-reconnectinterval-options)

<h2 id="version-requirements"><a href="#version-requirements">Version Requirements</a></h2>

Mongoose now requires Node.js >= 12.0.0. Mongoose still supports MongoDB server versions back to 3.0.0.

<h2 id="mongodb-driver-40"><a href="#mongodb-driver-40">MongoDB Driver 4.0</a></h2>

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

<h2 id="no-more-deprecation-warning-options"><a href="#no-more-deprecation-warning-options">No More Deprecation Warning Options</a></h2>

`useNewUrlParser`, `useUnifiedTopology`, `useFindAndModify`, and `useCreateIndex` are no longer supported options. Mongoose 6 always behaves as if `useNewUrlParser`, `useUnifiedTopology`, and `useCreateIndex` are `true`, and `useFindAndModify` is `false`. Please remove these options from your code.

```javascript
// No longer necessary:
mongoose.set('useFindAndModify', false);

await mongoose.connect('mongodb://127.0.0.1:27017/test', {
  useNewUrlParser: true, // <-- no longer necessary
  useUnifiedTopology: true // <-- no longer necessary
});
```

<h2 id="the-aspromise-method-for-connections"><a href="#the-aspromise-method-for-connections">The <code>asPromise()</code> Method for Connections</a></h2>

Mongoose connections are no longer [thenable](https://masteringjs.io/tutorials/fundamentals/thenable). This means that `await mongoose.createConnection(uri)` **no longer waits for Mongoose to connect**. Use `mongoose.createConnection(uri).asPromise()` instead. See [#8810](https://github.com/Automattic/mongoose/issues/8810).

```javascript
// The below no longer works in Mongoose 6
await mongoose.createConnection(uri);

// Do this instead
await mongoose.createConnection(uri).asPromise();
```

<h2 id="mongoose-connect-returns-a-promise"><a href="#mongoose-connect-returns-a-promise"><code>mongoose.connect()</code> Returns a Promise</a></h2>

The `mongoose.connect()` function now always returns a promise, **not** a Mongoose instance.

<h2 id="duplicate-query-execution"><a href="#duplicate-query-execution">Duplicate Query Execution</a></h2>

Mongoose no longer allows executing the same query object twice. If you do, you'll get a `Query was already executed` error. Executing the same query instance twice is typically indicative of mixing callbacks and promises, but if you need to execute the same query twice, you can call `Query#clone()` to clone the query and re-execute it. See [gh-7398](https://github.com/Automattic/mongoose/issues/7398)

```javascript
// Results in 'Query was already executed' error, because technically this `find()` query executes twice.
await Model.find({}, function(err, result) {});

const q = Model.find();
await q;
await q.clone(); // Can `clone()` the query to allow executing the query again
```

<h2 id="model-exists-returns-a-lean-document-instead-of-boolean"><a href="#model-exists-returns-a-lean-document-instead-of-boolean">Model.exists(...) now returns a lean document instead of boolean</a></h2>

```js
// in Mongoose 5.x, `existingUser` used to be a boolean
// now `existingUser` will be either `{ _id: ObjectId(...) }` or `null`.
const existingUser = await User.exists({ name: 'John' });
if (existingUser) {
  console.log(existingUser._id);
}
```

<h2 id="strictquery-is-removed-and-replaced-by-strict"><a href="#strictquery-is-removed-and-replaced-by-strict"><code>strictQuery</code> is now equal to <code>strict</code> by default</a></h2>

~Mongoose no longer supports a `strictQuery` option. You must now use `strict`.~
As of Mongoose 6.0.10, we brought back the `strictQuery` option.
However, `strictQuery` is tied to `strict` by default.
This means that, by default, Mongoose will filter out query filter properties that are not in the schema.

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

<h2 id="mongoerror-is-now-mongoservererror"><a href="#mongoerror-is-now-mongoservererror">MongoError is now MongoServerError</a></h2>

In MongoDB Node.js Driver v4.x, 'MongoError' is now 'MongoServerError'. Please change any code that depends on the hardcoded string 'MongoError'.

<h2 id="clone-discriminator-schemas-by-default"><a href="#clone-discriminator-schemas-by-default">Clone Discriminator Schemas By Default</a></h2>

Mongoose now clones discriminator schemas by default. This means you need to pass `{ clone: false }` to `discriminator()` if you're using recursive embedded discriminators.

```javascript
// In Mongoose 6, these two are equivalent:
User.discriminator('author', authorSchema);
User.discriminator('author', authorSchema.clone());

// To opt out if `clone()` is causing issues, pass `clone: false`
User.discriminator('author', authorSchema, { clone: false });
```

<h2 id="simplified-isvalidobjectid-and-separate-isobjectidorhexstring"><a href="#simplified-isvalidobjectid-and-separate-isobjectidorhexstring">Simplified <code>isValidObjectId()</code> and separate <code>isObjectIdOrHexString()</code></a></h2>

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

<h2 id="schema-defined-document-key-order"><a href="#schema-defined-document-key-order">Schema Defined Document Key Order</a></h2>

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

<h2 id="sanitizefilter-and-trusted"><a href="#sanitizefilter-and-trusted"><code>sanitizeFilter</code> and <code>trusted()</code></a></h2>

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

<h2 id="removed-omitundefined"><a href="#removed-omitundefined">Removed <code>omitUndefined</code>: Mongoose now removes <code>undefined</code> keys in updates instead of setting them to <code>null</code></a></h2>

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

<h2 id="document-parameter-to-default-functions"><a href="#document-parameter-to-default-functions">Document Parameter to Default Functions</a></h2>

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

<h2 id="arrays-are-proxies"><a href="#arrays-are-proxies">Arrays are Proxies</a></h2>

Mongoose arrays are now ES6 proxies. You no longer need to `markModified()` after setting an array index directly.

```javascript
const post = await BlogPost.findOne();

post.tags[0] = 'javascript';
await post.save(); // Works, no need for `markModified()`!
```

<h2 id="typepojotomixed"><a href="#typepojotomixed"><code>typePojoToMixed</code></a></h2>

Schema paths declared with `type: { name: String }` become single nested subdocs in Mongoose 6, as opposed to Mixed in Mongoose 5. This removes the need for the `typePojoToMixed` option. See [gh-7181](https://github.com/Automattic/mongoose/issues/7181).

```javascript
// In Mongoose 6, the below makes `foo` into a subdocument with a `name` property.
// In Mongoose 5, the below would make `foo` a `Mixed` type, _unless_ you set `typePojoToMixed: true`.
const schema = new Schema({
  foo: { type: { name: String } }
});
```

<h2 id="strictpopulate"><a href="#strictpopulate"><code>strictPopulate()</code></a></h2>

Mongoose now throws an error if you `populate()` a path that isn't defined in your schema. This is only for cases when we can infer the local schema, like when you use `Query#populate()`, **not** when you call `Model.populate()` on a POJO. See [gh-5124](https://github.com/Automattic/mongoose/issues/5124).

<h2 id="subdocument-ref-function-context"><a href="#subdocument-ref-function-context">Subdocument <code>ref</code> Function Context</a></h2>

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

<h2 id="schema-reserved-names-warning"><a href="#schema-reserved-names-warning">Schema Reserved Names Warning</a></h2>

Using `save`, `isNew`, and other Mongoose reserved names as schema path names now triggers a warning, not an error. You can suppress the warning by setting the `suppressReservedKeysWarning` in your schema options: `new Schema({ save: String }, { suppressReservedKeysWarning: true })`. Keep in mind that this may break plugins that rely on these reserved names.

<h2 id="subdocument-paths"><a href="#subdocument-paths">Subdocument Paths</a></h2>

Single nested subdocs have been renamed to "subdocument paths". So `SchemaSingleNestedOptions` is now `SchemaSubdocumentOptions` and `mongoose.Schema.Types.Embedded` is now `mongoose.Schema.Types.Subdocument`. See [gh-10419](https://github.com/Automattic/mongoose/issues/10419)

<h2 id="creating-aggregation-cursors"><a href="#creating-aggregation-cursors">Creating Aggregation Cursors</a></h2>

`Aggregate#cursor()` now returns an AggregationCursor instance to be consistent with `Query#cursor()`. You no longer need to do `Model.aggregate(pipeline).cursor().exec()` to get an aggregation cursor, just `Model.aggregate(pipeline).cursor()`.

<h2 id="autocreate-defaults-to-true"><a href="#autocreate-defaults-to-true"><code>autoCreate</code> Defaults to <code>true</code></a></h2>

`autoCreate` is `true` by default **unless** readPreference is secondary or secondaryPreferred, which means Mongoose will attempt to create every model's underlying collection before creating indexes. If readPreference is secondary or secondaryPreferred, Mongoose will default to `false` for both `autoCreate` and `autoIndex` because both `createCollection()` and `createIndex()` will fail when connected to a secondary.

<h2 id="no-more-context-query"><a href="#no-more-context-query">No More <code>context: 'query'</code></a></h2>

The `context` option for queries has been removed. Now Mongoose always uses `context = 'query'`.

<h2 id="custom-validators-with-populated-paths"><a href="#custom-validators-with-populated-paths">Custom Validators with Populated Paths</a></h2>

Mongoose 6 always calls validators with depopulated paths (that is, with the id rather than the document itself). In Mongoose 5, Mongoose would call validators with the populated doc if the path was populated. See [#8042](https://github.com/Automattic/mongoose/issues/8042)

<h2 id="disconnected-event-with-replica-sets"><a href="#disconnected-event-with-replica-sets">Disconnected Event with Replica Sets</a></h2>

When connected to a replica set, connections now emit 'disconnected' when connection to the primary is lost. In Mongoose 5, connections only emitted 'disconnected' when losing connection to all members of the replica set.

However, Mongoose 6 does **not** buffer commands while a connection is disconnected. So you can still successfully execute commands like queries with `readPreference = 'secondary'`, even if the Mongoose connection is in the disconnected state.

<h2 id="removed-execpopulate"><a href="#removed-execpopulate">Removed <code>execPopulate()</code></a></h2>

`Document#populate()` now returns a promise and is now no longer chainable.

* Replace `await doc.populate('path1').populate('path2').execPopulate();` with `await doc.populate(['path1', 'path2']);`
* Replace `await doc.populate('path1', 'select1').populate('path2', 'select2').execPopulate();` with
  ```
  await doc.populate([{path: 'path1', select: 'select1'}, {path: 'path2', select: 'select2'}]);
  ```

<h2 id="create-with-empty-array"><a href="#create-with-empty-array"><code>create()</code> with Empty Array</a></h2>

`await Model.create([])` in v6.0 returns an empty array when provided an empty array, in v5.0 it used to return `undefined`. If any of your code is checking whether the output is `undefined` or not, you need to modify it with the assumption that `await Model.create(...)` will always return an array if provided an array.

<h2 id="removed-nested-path-merging"><a href="#removed-nested-path-merging">Removed Nested Path Merging</a></h2>

`doc.set({ child: { age: 21 } })` now works the same whether `child` is a nested path or a subdocument: Mongoose will overwrite the value of `child`. In Mongoose 5, this operation would merge `child` if `child` was a nested path.

<h2 id="objectid-valueof"><a href="#objectid-valueof">ObjectId <code>valueOf()</code></a></h2>

Mongoose now adds a `valueOf()` function to ObjectIds. This means you can now use `==` to compare an ObjectId against a string.

```javascript
const a = ObjectId('6143b55ac9a762738b15d4f0');

a == '6143b55ac9a762738b15d4f0'; // true
```

<h2 id="immutable-createdat"><a href="#immutable-createdat">Immutable <code>createdAt</code></a></h2>

If you set `timestamps: true`, Mongoose will now make the `createdAt` property `immutable`. See [gh-10139](https://github.com/Automattic/mongoose/issues/10139)

<h2 id="removed-validator-isasync"><a href="#removed-validator-isasync">Removed Validator <code>isAsync</code></a></h2>

`isAsync` is no longer an option for `validate`. Use an `async function` instead.

<h2 id="removed-safe"><a href="#removed-safe">Removed <code>safe</code></a></h2>

`safe` is no longer an option for schemas, queries, or `save()`. Use `writeConcern` instead.

<h2 id="schematype-set-parameters"><a href="#schematype-set-parameters">SchemaType <code>set</code> parameters</a></h2>

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

<h2 id="toobject-and-tojson-use-nested-schema-minimize"><a href="#toobject-and-tojson-use-nested-schema-minimize"><code>toObject()</code> and <code>toJSON()</code> Use Nested Schema <code>minimize</code></a></h2>

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

<h2 id="no-default-model-for-query-prototype-populate"><a href="#no-default-model-for-query-prototype-populate">No default model for <code>Query.prototype.populate()</code></a></h2>

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

<h2 id="removed-reconnecttries-and-reconnectinterval-options"><a href="#removed-reconnecttries-and-reconnectinterval-options">Removed <code>reconnectTries</code> and <code>reconnectInterval</code> options</a></h2>

The `reconnectTries` and `reconnectInterval` options have been removed since they are no longer necessary.

The MongoDB node driver will always attempt to retry any operation for up to `serverSelectionTimeoutMS`, even if MongoDB is down for a long period of time.
So, it will never run out of retries or try to reconnect to MongoDB.
