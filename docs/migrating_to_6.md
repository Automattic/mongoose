## Migrating from 5.x to 6.x

There are several [backwards-breaking changes](https://github.com/Automattic/mongoose/blob/master/CHANGELOG.md)
you should be aware of when migrating from Mongoose 5.x to Mongoose 6.x.

If you're still on Mongoose 4.x, please read the [Mongoose 4.x to 5.x migration guide](/docs/migrating_to_5.html) and upgrade to Mongoose 5.x first.

* [Version Requirements](#version-requirements)
* [No More Deprecation Warning Options](#no-more-deprecation-warning-options)
* [The `asPromise()` Method for Connections](#the-aspromise-method-for-connections)
* [`mongoose.connect()` Returns a Promise](#mongoose-connect-returns-a-promise)
* [Duplicate Query Execution](#duplicate-query-execution)
* [`strictQuery` is removed and replaced by `strict`](#strictquery-is-removed-and-replaced-by-strict)
* [MongoError is now MongoServerError](#mongoerror-is-now-mongoservererror)
* [Clone Discriminator Schemas By Default](#clone-discriminator-schemas-by-default)
* [Schema Defined Document Key Order](#schema-defined-document-key-order)
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
* [TypeScript changes](#typescript-changes)

<h3 id="version-requirements"><a href="#version-requirements">Version Requirements</a></h3>

Mongoose now requires Node.js >= 12.0.0. Mongoose still supports MongoDB server versions back to 3.0.0.

<h3 id="no-more-deprecation-warning-options"><a href="#no-more-deprecation-warning-options">No More Deprecation Warning Options</a></h3>

`useNewUrlParser`, `useUnifiedTopology`, `useFindAndModify`, and `useCreateIndex` are no longer supported options. Mongoose 6 always behaves as if `useNewUrlParser`, `useUnifiedTopology`, and `useCreateIndex` are `true`, and `useFindAndModify` is `false`. Please remove these options from your code.

```javascript
// No longer necessary:
mongoose.set('useFindAndModify', false);

await mongoose.connect('mongodb://localhost:27017/test', {
  useNewUrlParser: true, // <-- no longer necessary
  useUnifiedTopology: true // <-- no longer necessary
});
```

<h3 id="the-aspromise-method-for-connections"><a href="#the-aspromise-method-for-connections">The `asPromise()` Method for Connections</a></h3>

Mongoose connections are no longer [thenable](https://masteringjs.io/tutorials/fundamentals/thenable). This means that `await mongoose.createConnection(uri)` **no longer waits for Mongoose to connect**. Use `mongoose.createConnection(uri).asPromise()` instead. See [#8810](https://github.com/Automattic/mongoose/issues/8810).

```javascript
// The below no longer works in Mongoose 6
await mongoose.createConnection(uri);

// Do this instead
await mongoose.createConnection(uri).asPromise();
```

<h3 id="mongoose-connect-returns-a-promise"><a href="#mongoose-connect-returns-a-promise">`mongoose.connect()` Returns a Promise</a></h3>

The `mongoose.connect()` function now always returns a promise, **not** a Mongoose instance.

<h3 id="duplicate-query-execution"><a href="#duplicate-query-execution">Duplicate Query Execution</a></h3>

Mongoose no longer allows executing the same query object twice. If you do, you'll get a `Query was already executed` error. Executing the same query instance twice is typically indicative of mixing callbacks and promises, but if you need to execute the same query twice, you can call `Query#clone()` to clone the query and re-execute it. See [gh-7398](https://github.com/Automattic/mongoose/issues/7398)

```javascript
// Results in 'Query was already executed' error, because technically this `find()` query executes twice.
await Model.find({}, function(err, result) {});

const q = Model.find();
await q;
await q.clone(); // Can `clone()` the query to allow executing the query again
```

<h3 id="strictquery-is-removed-and-replaced-by-strict"><a href="#strictquery-is-removed-and-replaced-by-strict">`strictQuery` is removed and replaced by `strict`</a></h3>

Mongoose no longer supports a `strictQuery` option. You must now use `strict`. This means that, by default, Mongoose will filter out filter properties that are not in the schema.

```javascript
const userSchema = new Schema({ name: String });
const User = mongoose.model('User', userSchema);

// By default, this is equivalent to `User.find()` because Mongoose filters out `notInSchema`
await User.find({ notInSchema: 1 });

// Set `strict: false` to opt in to filtering by properties that aren't in the schema
await User.find({ notInSchema: 1 }, { strict: false });
```

<h3 id="mongoerror-is-now-mongoservererror"><a href="#mongoerror-is-now-mongoservererror">MongoError is now MongoServerError</a></h3>

In MongoDB Node.js Driver v4.x, 'MongoError' is now 'MongoServerError'. Please change any code that depends on the hardcoded string 'MongoError'.

<h3 id="clone-discriminator-schemas-by-default"><a href="#clone-discriminator-schemas-by-default">Clone Discriminator Schemas By Default</a></h3>

Mongoose now clones discriminator schemas by default. This means you need to pass `{ clone: false }` to `discriminator()` if you're using recursive embedded discriminators.

```javascript
// In Mongoose 6, these two are equivalent:
User.discriminator('author', authorSchema);
User.discriminator('author', authorSchema.clone());

// To opt out if `clone()` is causing issues, pass `clone: false`
User.discriminator('author', authorSchema, { clone: false });
```

<h3 id="schema-defined-document-key-order"><a href="#schema-defined-document-key-order">Schema Defined Document Key Order</a></h3>

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

<h3 id="document-parameter-to-default-functions"><a href="#document-parameter-to-default-functions">Document Parameter to Default Functions</a></h3>

Mongoose now passes the document as the first parameter to `default` functions, which is helpful for using [arrow functions](https://masteringjs.io/tutorials/fundamentals/arrow) with defaults. This may affect you if you pass a function that expects different parameters to `default`, like `default: mongoose.Types.ObjectId`. See [gh-9633](https://github.com/Automattic/mongoose/issues/9633)

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

<h3 id="arrays-are-proxies"><a href="#arrays-are-proxies">Arrays are Proxies</a></h3>

Mongoose arrays are now ES6 proxies. You no longer need to `markModified()` after setting an array index directly.

```javascript
const post = await BlogPost.findOne();

post.tags[0] = 'javascript';
await post.save(); // Works, no need for `markModified()`!
```

<h3 id="typepojotomixed"><a href="#typepojotomixed">`typePojoToMixed`</a></h3>

Schema paths declared with `type: { name: String }` become single nested subdocs in Mongoose 6, as opposed to Mixed in Mongoose 5. This removes the need for the `typePojoToMixed` option. See [gh-7181](https://github.com/Automattic/mongoose/issues/7181).

```javascript
// In Mongoose 6, the below makes `foo` into a subdocument with a `name` property.
// In Mongoose 5, the below would make `foo` a `Mixed` type, _unless_ you set `typePojoToMixed: true`.
const schema = new Schema({
  foo: { type: { name: String } }
});
```

<h3 id="strictpopulate"><a href="#strictpopulate">`strictPopulate()`</a></h3>

Mongoose now throws an error if you `populate()` a path that isn't defined in your schema. This is only for cases when we can infer the local schema, like when you use `Query#populate()`, **not** when you call `Model.populate()` on a POJO. See [gh-5124](https://github.com/Automattic/mongoose/issues/5124).

<h3 id="subdocument-ref-function-context"><a href="#subdocument-ref-function-context">Subdocument `ref` Function Context</a></h3>

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

<h3 id="schema-reserved-names-warning"><a href="#schema-reserved-names-warning">Schema Reserved Names Warning</a></h3>

Using `save`, `isNew`, and other Mongoose reserved names as schema path names now triggers a warning, not an error. You can suppress the warning by setting the `supressReservedKeysWarning` in your schema options: `new Schema({ save: String }, { supressReservedKeysWarning: true })`. Keep in mind that this may break plugins that rely on these reserved names.

<h3 id="subdocument-paths"><a href="#subdocument-paths">Subdocument Paths</a></h3>

Single nested subdocs have been renamed to "subdocument paths". So `SchemaSingleNestedOptions` is now `SchemaSubdocumentOptions` and `mongoose.Schema.Types.Embedded` is now `mongoose.Schema.Types.Subdocument`. See [gh-10419](https://github.com/Automattic/mongoose/issues/10419)

<h3 id="creating-aggregation-cursors"><a href="#creating-aggregation-cursors">Creating Aggregation Cursors</a></h3>

`Aggregate#cursor()` now returns an AggregationCursor instance to be consistent with `Query#cursor()`. You no longer need to do `Model.aggregate(pipeline).cursor().exec()` to get an aggregation cursor, just `Model.aggregate(pipeline).cursor()`.

<h3 id="autocreate-defaults-to-true"><a href="#autocreate-defaults-to-true">`autoCreate` Defaults to `true`</a></h3>

`autoCreate` is `true` by default **unless** readPreference is secondary or secondaryPreferred, which means Mongoose will attempt to create every model's underlying collection before creating indexes. If readPreference is secondary or secondaryPreferred, Mongoose will default to `false` for both `autoCreate` and `autoIndex` because both `createCollection()` and `createIndex()` will fail when connected to a secondary.

<h3 id="no-more-context-query"><a href="#no-more-context-query">No More `context: 'query'`</a></h3>

The `context` option for queries has been removed. Now Mongoose always uses `context = 'query'`.

<h3 id="custom-validators-with-populated-paths"><a href="#custom-validators-with-populated-paths">Custom Validators with Populated Paths</a></h3>

Mongoose 6 always calls validators with depopulated paths (that is, with the id rather than the document itself). In Mongoose 5, Mongoose would call validators with the populated doc if the path was populated. See [#8042](https://github.com/Automattic/mongoose/issues/8042)

<h3 id="disconnected-event-with-replica-sets"><a href="#disconnected-event-with-replica-sets">Disconnected Event with Replica Sets</a></h3>

When connected to a replica set, connections now emit 'disconnected' when connection to the primary is lost. In Mongoose 5, connections only emitted 'disconnected' when losing connection to all members of the replica set.

However, Mongoose 6 does **not** buffer commands while a connection is disconnected. So you can still successfully execute commands like queries with `readPreference = 'secondary'`, even if the Mongoose connection is in the disconnected state.

<h3 id="removed-execpopulate"><a href="#removed-execpopulate">Removed `execPopulate()`</a></h3>

`Document#populate()` now returns a promise. And is now no longer chainable. Replace `await doc.populate('path1').populate('path2').execPopulate()` with `await doc.populate(['path1', 'path2']);`

<h3 id="create-with-empty-array"><a href="#create-with-empty-array">`create()` with Empty Array</a></h3>

`await Model.create([])` in v6.0 returns an empty array when provided an empty array, in v5.0 it used to return `undefined`. If any of your code is checking whether the output is `undefined` or not, you need to modify it with the assumption that `await Model.create(...)` will always return an array if provided an array.

<h3 id="removed-nested-path-merging"><a href="#removed-nested-path-merging">Removed Nested Path Merging</a></h3>

`doc.set({ child: { age: 21 } })` now works the same whether `child` is a nested path or a subdocument: Mongoose will overwrite the value of `child`. In Mongoose 5, this operation would merge `child` if `child` was a nested path.

<h3 id="objectid-valueof"><a href="#objectid-valueof">ObjectId `valueOf()`</a></h3>

Mongoose now adds a `valueOf()` function to ObjectIds. This means you can now use `==` to compare two ObjectId instances.

<h3 id="immutable-createdat"><a href="#immutable-createdat">Immutable `createdAt`</a></h3>

If you set `timestamps: true`, Mongoose will now make the `createdAt` property `immutable`. See [gh-10139](https://github.com/Automattic/mongoose/issues/10139)

<h3 id="removed-validator-isasync"><a href="#removed-validator-isasync">Removed Validator `isAsync`</a></h3>

`isAsync` is no longer an option for `validate`. Use an `async function` instead.

<h3 id="removed-safe"><a href="#removed-safe">Removed `safe`</a></h3>

`safe` is no longer an option for schemas, queries, or `save()`. Use `writeConcern` instead.

## TypeScript changes

The `Schema` class now takes 3 generic params instead of 4. The 3rd generic param, `SchemaDefinitionType`, is now the same as the 1st generic param `DocType`. Replace `new Schema<UserDocument, UserModel, User>(schemaDefinition)` with `new Schema<UserDocument, UserModel>(schemaDefinition)`

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