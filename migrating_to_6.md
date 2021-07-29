* Mongoose connections are no longer [thenable](https://masteringjs.io/tutorials/fundamentals/thenable). This means that `await mongoose.createConnection(uri)` **no longer waits for Mongoose to connect**. Use `mongoose.createConnection(uri).asPromise()` instead. See [#8810](https://github.com/Automattic/mongoose/issues/8810).

* The `mongoose.connect()` function now always returns a promise, **not** a Mongoose instance.

* Mongoose no longer allows executing the same query object twice. If you do, you'll get a `Query was already executed` error. Executing the same query instance twice is typically indicative of mixing callbacks and promises, but if you need to execute the same query twice, you can call `Query#clone()` to clone the query and re-execute it. See [gh-7398](https://github.com/Automattic/mongoose/issues/7398)

* In MongoDB Node.js Driver v4.x, 'MongoError' is now 'MongoServerError'. Please change any code that depends on the hardcoded string 'MongoError'.

* Mongoose now clones discriminator schemas by default. This means you need to pass `{ clone: false }` to `discriminator()` if you're using recursive embedded discriminators.

* Mongoose now passes the document as the first parameter to `default` functions. This may affect you if you pass a function that expects different parameters to `default`, like `default: mongoose.Types.ObjectId`. See [gh-9633](https://github.com/Automattic/mongoose/issues/9633)

* When populating a subdocument with a function `ref` or `refPath`, `this` is now the subdocument being populated, not the top-level document. See [#8469](https://github.com/Automattic/mongoose/issues/8469)

* Single nested subdocs have been renamed to "subdocument paths". So `SchemaSingleNestedOptions` is now `SchemaSubdocumentOptions` and `mongoose.Schema.Types.Embedded` is now `mongoose.Schema.Types.Subdocument`. See [gh-10419](https://github.com/Automattic/mongoose/issues/10419)

* `Aggregate#cursor()` now returns an AggregationCursor instance to be consistent with `Query#cursor()`. You no longer need to do `Model.aggregate(pipeline).cursor().exec()` to get an aggregation cursor, just `Model.aggregate(pipeline).cursor()`.

* `autoCreate` is `true` by default **unless** readPreference is secondary or secondaryPreferred, which means Mongoose will attempt to create every model's underlying collection before creating indexes. If readPreference is secondary or secondaryPreferred, Mongoose will default to `false` for both `autoCreate` and `autoIndex` because both `createCollection()` and `createIndex()` will fail when connected to a secondary.

* The `context` option for queries has been removed. Now Mongoose always uses `context = 'query'`.

* When connected to a replica set, connections now emit 'disconnected' when connection to the primary is lost. In Mongoose 5, connections only emitted 'disconnected' when losing connection to all members of the replica set.

* `Document#populate()` now returns a promise. And is now no longer chainable. Replace `await doc.populate('path1').populate('path2').execPopulate()` with `await doc.populate('path1'); await doc.populate('path2');`

* `await Model.create([])` in v6.0 returns an empty array when provided an empty array, in v5.0 it used to return `undefined`. If any of your code is checking whether the output is `undefined` or not, you need to modify it with the assumption that `await Model.create(...)` will always return an array if provided an array.

* `doc.set({ child: { age: 21 } })` now works the same whether `child` is a nested path or a subdocument: Mongoose will overwrite the value of `child`. In Mongoose 5, this operation would merge `child` if `child` was a nested path.

* Mongoose now adds a `valueOf()` function to ObjectIds. This means you can now use `==` to compare two ObjectId instances.

* If you set `timestamps: true`, Mongoose will now make the `createdAt` property `immutable`. See [gh-10139](https://github.com/Automattic/mongoose/issues/10139)

* `isAsync` is no longer an option for `validate`. Use an `async function` instead.