# Aggregate

- [`Aggregate()`](#Aggregate())
- [`Aggregate.prototype.addFields()`](#Aggregate.prototype.addFields())
- [`Aggregate.prototype.allowDiskUse()`](#Aggregate.prototype.allowDiskUse())
- [`Aggregate.prototype.append()`](#Aggregate.prototype.append())
- [`Aggregate.prototype.catch()`](#Aggregate.prototype.catch())
- [`Aggregate.prototype.collation()`](#Aggregate.prototype.collation())
- [`Aggregate.prototype.count()`](#Aggregate.prototype.count())
- [`Aggregate.prototype.cursor()`](#Aggregate.prototype.cursor())
- [`Aggregate.prototype.densify()`](#Aggregate.prototype.densify())
- [`Aggregate.prototype.exec()`](#Aggregate.prototype.exec())
- [`Aggregate.prototype.explain()`](#Aggregate.prototype.explain())
- [`Aggregate.prototype.facet()`](#Aggregate.prototype.facet())
- [`Aggregate.prototype.fill()`](#Aggregate.prototype.fill())
- [`Aggregate.prototype.finally()`](#Aggregate.prototype.finally())
- [`Aggregate.prototype.graphLookup()`](#Aggregate.prototype.graphLookup())
- [`Aggregate.prototype.group()`](#Aggregate.prototype.group())
- [`Aggregate.prototype.hint()`](#Aggregate.prototype.hint())
- [`Aggregate.prototype.limit()`](#Aggregate.prototype.limit())
- [`Aggregate.prototype.lookup()`](#Aggregate.prototype.lookup())
- [`Aggregate.prototype.match()`](#Aggregate.prototype.match())
- [`Aggregate.prototype.model()`](#Aggregate.prototype.model())
- [`Aggregate.prototype.near()`](#Aggregate.prototype.near())
- [`Aggregate.prototype.option()`](#Aggregate.prototype.option())
- [`Aggregate.prototype.options`](#Aggregate.prototype.options)
- [`Aggregate.prototype.pipeline()`](#Aggregate.prototype.pipeline())
- [`Aggregate.prototype.pipelineForUnionWith()`](#Aggregate.prototype.pipelineForUnionWith())
- [`Aggregate.prototype.project()`](#Aggregate.prototype.project())
- [`Aggregate.prototype.read()`](#Aggregate.prototype.read())
- [`Aggregate.prototype.readConcern()`](#Aggregate.prototype.readConcern())
- [`Aggregate.prototype.redact()`](#Aggregate.prototype.redact())
- [`Aggregate.prototype.replaceRoot()`](#Aggregate.prototype.replaceRoot())
- [`Aggregate.prototype.sample()`](#Aggregate.prototype.sample())
- [`Aggregate.prototype.search()`](#Aggregate.prototype.search())
- [`Aggregate.prototype.session()`](#Aggregate.prototype.session())
- [`Aggregate.prototype.skip()`](#Aggregate.prototype.skip())
- [`Aggregate.prototype.sort()`](#Aggregate.prototype.sort())
- [`Aggregate.prototype.sortByCount()`](#Aggregate.prototype.sortByCount())
- [`Aggregate.prototype.then()`](#Aggregate.prototype.then())
- [`Aggregate.prototype.unionWith()`](#Aggregate.prototype.unionWith())
- [`Aggregate.prototype.unwind()`](#Aggregate.prototype.unwind())
- [`Aggregate.prototype[Symbol.asyncIterator]()`](#Aggregate.prototype[Symbol.asyncIterator]())

## `Aggregate()`

### Parameters

- `[pipeline]` \<Array\> aggregation pipeline as an array of objects
- `[modelOrConn]` \<Model|Connection\> the model or connection to use with this aggregate.

### See

- [MongoDB](https://www.mongodb.com/docs/manual/applications/aggregation/)
- [driver](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#aggregate)

Aggregate constructor used for building aggregation pipelines. Do not
instantiate this class directly, use [Model.aggregate()](https://mongoosejs.com/docs/api/model.md#Model.aggregate()) instead.

#### Example:

    const aggregate = Model.aggregate([
      { $project: { a: 1, b: 1 } },
      { $skip: 5 }
    ]);

    Model.
      aggregate([{ $match: { age: { $gte: 21 }}}]).
      unwind('tags').
      exec();

#### Note:

- The documents returned are plain javascript objects, not mongoose documents (since any shape of document can be returned).
- Mongoose does **not** cast pipeline stages. The below will **not** work unless `_id` is a string in the database

    new Aggregate([{ $match: { _id: '00000000000000000000000a' } }]);
    // Do this instead to cast to an ObjectId
    new Aggregate([{ $match: { _id: new mongoose.Types.ObjectId('00000000000000000000000a') } }]);

## `Aggregate.prototype.addFields()`

### Parameters

- `arg` \<object\> field specification

### Returns

- \<Aggregate\>

### See

- [$addFields](https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/)

Appends a new $addFields operator to this aggregate pipeline.
Requires MongoDB v3.4+ to work

#### Example:

    // adding new fields based on existing fields
    aggregate.addFields({
        newField: '$b.nested'
      , plusTen: { $add: ['$val', 10]}
      , sub: {
           name: '$a'
        }
    })

    // etc
    aggregate.addFields({ salary_k: { $divide: [ "$salary", 1000 ] } });

## `Aggregate.prototype.allowDiskUse()`

### Parameters

- `value` \<boolean\> Should tell server it can use hard drive to store data during aggregation.

### Returns

- \<Aggregate\> this

### See

- [mongodb](https://www.mongodb.com/docs/manual/reference/command/aggregate/)

Sets the allowDiskUse option for the aggregation query

#### Example:

    await Model.aggregate([{ $match: { foo: 'bar' } }]).allowDiskUse(true);

## `Aggregate.prototype.append()`

### Parameters

- `...ops` \<object|Array[object]\> operator(s) to append. Can either be a spread of objects or a single parameter of an object array.

### Returns

- \<Aggregate\>

Appends new operators to this aggregate pipeline

#### Example:

    aggregate.append({ $project: { field: 1 }}, { $limit: 2 });

    // or pass an array
    const pipeline = [{ $match: { daw: 'Logic Audio X' }} ];
    aggregate.append(pipeline);

## `Aggregate.prototype.catch()`

### Parameters

- `[reject]` \<Function\>

### Returns

- \<Promise\>

Executes the aggregation returning a `Promise` which will be
resolved with either the doc(s) or rejected with the error.
Like [`.then()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.then), but only takes a rejection handler.
Compatible with `await`.

## `Aggregate.prototype.collation()`

### Parameters

- `collation` \<object\> options

### Returns

- \<Aggregate\> this

### See

- [mongodb](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/CollationOptions.html)

Adds a collation

#### Example:

    const res = await Model.aggregate(pipeline).collation({ locale: 'en_US', strength: 1 });

## `Aggregate.prototype.count()`

### Parameters

- `fieldName` \<string\> The name of the output field which has the count as its value. It must be a non-empty string, must not start with $ and must not contain the . character.

### Returns

- \<Aggregate\>

### See

- [$count](https://www.mongodb.com/docs/manual/reference/operator/aggregation/count)

Appends a new $count operator to this aggregate pipeline.

#### Example:

    aggregate.count("userCount");

## `Aggregate.prototype.cursor()`

### Parameters

- `options` \<object\>
- `[options.batchSize]` \<number\> set the cursor batch size
- `[options.useMongooseAggCursor]` \<boolean\> use experimental mongoose-specific aggregation cursor (for `eachAsync()` and other query cursor semantics)

### Returns

- \<AggregationCursor\> cursor representing this aggregation

### See

- [mongodb](https://mongodb.github.io/node-mongodb-native/7.0/classes/AggregationCursor.html)

Sets the `cursor` option and executes this aggregation, returning an aggregation cursor.
Cursors are useful if you want to process the results of the aggregation one-at-a-time
because the aggregation result is too big to fit into memory.

#### Example:

    const cursor = Model.aggregate(..).cursor({ batchSize: 1000 });
    cursor.eachAsync(function(doc, i) {
      // use doc
    });

## `Aggregate.prototype.densify()`

### Parameters

- `arg` \<object\> $densify operator contents

### Returns

- \<Aggregate\>

### See

- [$densify](https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/)

Appends a new $densify operator to this aggregate pipeline.

#### Example:

     aggregate.densify({
       field: 'timestamp',
       range: {
         step: 1,
         unit: 'hour',
         bounds: [new Date('2021-05-18T00:00:00.000Z'), new Date('2021-05-18T08:00:00.000Z')]
       }
     });

## `Aggregate.prototype.exec()`

### Returns

- \<Promise\>

Executes the aggregate pipeline on the currently bound Model.

#### Example:
    const result = await aggregate.exec();

## `Aggregate.prototype.explain()`

### Parameters

- `[verbosity]` \<'queryPlanner' | 'executionStats' | 'allPlansExecution'\>

### Returns

- \<Promise\>

Execute the aggregation with explain

#### Example:

    Model.aggregate(..).explain()

## `Aggregate.prototype.facet()`

### Parameters

- `facet` \<object\> options

### Returns

- \<Aggregate\> this

### See

- [$facet](https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/)

Combines multiple aggregation pipelines.

#### Example:

    const res = await Model.aggregate().facet({
      books: [{ groupBy: '$author' }],
      price: [{ $bucketAuto: { groupBy: '$price', buckets: 2 } }]
    });

    // Output: { books: [...], price: [{...}, {...}] }

## `Aggregate.prototype.fill()`

### Parameters

- `arg` \<object\> $fill operator contents

### Returns

- \<Aggregate\>

### See

- [$fill](https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/)

Appends a new $fill operator to this aggregate pipeline.

#### Example:

     aggregate.fill({
       output: {
         bootsSold: { value: 0 },
         sandalsSold: { value: 0 },
         sneakersSold: { value: 0 }
       }
     });

## `Aggregate.prototype.finally()`

### Parameters

- `[onFinally]` \<Function\>

### Returns

- \<Promise\>

Executes the aggregate returning a `Promise` which will be
resolved with `.finally()` chained.

More about [Promise `finally()` in JavaScript](https://thecodebarbarian.com/using-promise-finally-in-node-js.html).

## `Aggregate.prototype.graphLookup()`

### Parameters

- `options` \<object\> to $graphLookup as described in the above link

### Returns

- \<Aggregate\>

### See

- [$graphLookup](https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/#pipe._S_graphLookup)

Appends new custom $graphLookup operator(s) to this aggregate pipeline, performing a recursive search on a collection.

Note that graphLookup can only consume at most 100MB of memory, and does not allow disk use even if `{ allowDiskUse: true }` is specified.

#### Example:

     // Suppose we have a collection of courses, where a document might look like `{ _id: 0, name: 'Calculus', prerequisite: 'Trigonometry'}` and `{ _id: 0, name: 'Trigonometry', prerequisite: 'Algebra' }`
     aggregate.graphLookup({ from: 'courses', startWith: '$prerequisite', connectFromField: 'prerequisite', connectToField: 'name', as: 'prerequisites', maxDepth: 3 }) // this will recursively search the 'courses' collection up to 3 prerequisites

## `Aggregate.prototype.group()`

### Parameters

- `arg` \<object\> $group operator contents

### Returns

- \<Aggregate\>

### See

- [$group](https://www.mongodb.com/docs/manual/reference/aggregation/group/)

Appends a new custom $group operator to this aggregate pipeline.

#### Example:

    aggregate.group({ _id: "$department" });

## `Aggregate.prototype.hint()`

### Parameters

- `value` \<object|string\> a hint object or the index name

### Returns

- \<Aggregate\> this

### See

- [mongodb](https://www.mongodb.com/docs/manual/reference/command/aggregate/)

Sets the hint option for the aggregation query

#### Example:

    Model.aggregate(..).hint({ qty: 1, category: 1 }).exec();

## `Aggregate.prototype.limit()`

### Parameters

- `num` \<number\> maximum number of records to pass to the next stage

### Returns

- \<Aggregate\>

### See

- [$limit](https://www.mongodb.com/docs/manual/reference/aggregation/limit/)

Appends a new $limit operator to this aggregate pipeline.

#### Example:

    aggregate.limit(10);

## `Aggregate.prototype.lookup()`

### Parameters

- `options` \<object\> to $lookup as described in the above link

### Returns

- \<Aggregate\>

### See

- [$lookup](https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/#pipe._S_lookup)

Appends new custom $lookup operator to this aggregate pipeline.

#### Example:

    aggregate.lookup({ from: 'users', localField: 'userId', foreignField: '_id', as: 'users' });

## `Aggregate.prototype.match()`

### Parameters

- `arg` \<object\> $match operator contents

### Returns

- \<Aggregate\>

### See

- [$match](https://www.mongodb.com/docs/manual/reference/aggregation/match/)

Appends a new custom $match operator to this aggregate pipeline.

#### Example:

    aggregate.match({ department: { $in: [ "sales", "engineering" ] } });

## `Aggregate.prototype.model()`

### Parameters

- `[model]` \<Model\> Set the model associated with this aggregate. If not provided, returns the already stored model.

### Returns

- \<Model\>

Get/set the model that this aggregation will execute on.

#### Example:

    const aggregate = MyModel.aggregate([{ $match: { answer: 42 } }]);
    aggregate.model() === MyModel; // true

    // Change the model. There's rarely any reason to do this.
    aggregate.model(SomeOtherModel);
    aggregate.model() === SomeOtherModel; // true

## `Aggregate.prototype.near()`

### Parameters

- `arg` \<object\>
- `arg.near` \<object|Array[number]\> GeoJSON point or coordinates array

### Returns

- \<Aggregate\>

### See

- [$geoNear](https://www.mongodb.com/docs/manual/reference/aggregation/geoNear/)

Appends a new $geoNear operator to this aggregate pipeline.

#### Note:

**MUST** be used as the first operator in the pipeline.

#### Example:

    aggregate.near({
      near: { type: 'Point', coordinates: [40.724, -73.997] },
      distanceField: "dist.calculated", // required
      maxDistance: 0.008,
      query: { type: "public" },
      includeLocs: "dist.location",
      spherical: true,
    });

## `Aggregate.prototype.option()`

### Parameters

- `options` \<object\> keys to merge into current options
- `[options.maxTimeMS]` \<number\> number limits the time this aggregation will run, see [MongoDB docs on `maxTimeMS`](https://www.mongodb.com/docs/manual/reference/operator/meta/maxTimeMS/)
- `[options.allowDiskUse]` \<boolean\> boolean if true, the MongoDB server will use the hard drive to store data during this aggregation
- `[options.collation]` \<object\> object see [`Aggregate.prototype.collation()`](https://mongoosejs.com/docs/api/aggregate.md#Aggregate.prototype.collation())
- `[options.session]` \<ClientSession\> ClientSession see [`Aggregate.prototype.session()`](https://mongoosejs.com/docs/api/aggregate.md#Aggregate.prototype.session())
- `[options.middleware=true]` \<boolean|object\> set to `false` to skip all user-defined middleware
- `[options.middleware.pre=true]` \<boolean\> set to `false` to skip only pre hooks
- `[options.middleware.post=true]` \<boolean\> set to `false` to skip only post hooks

### Returns

- \<Aggregate\> this

### See

- [mongodb](https://www.mongodb.com/docs/manual/reference/command/aggregate/)

Lets you set arbitrary options, for middleware or plugins.

#### Example:

    const agg = Model.aggregate(..).option({ allowDiskUse: true }); // Set the `allowDiskUse` option
    agg.options; // `{ allowDiskUse: true }`

## `Aggregate.prototype.options`

### Type

- \<property\>

Contains options passed down to the [aggregate command](https://www.mongodb.com/docs/manual/reference/command/aggregate/).
Supported options are:

- [`allowDiskUse`](https://mongoosejs.com/docs/api/aggregate.md#Aggregate.prototype.allowDiskUse())
- `bypassDocumentValidation`
- [`collation`](https://mongoosejs.com/docs/api/aggregate.md#Aggregate.prototype.collation())
- `comment`
- [`cursor`](https://mongoosejs.com/docs/api/aggregate.md#Aggregate.prototype.cursor())
- [`explain`](https://mongoosejs.com/docs/api/aggregate.md#Aggregate.prototype.explain())
- `fieldsAsRaw`
- [`hint`](https://mongoosejs.com/docs/api/aggregate.md#Aggregate.prototype.hint())
- `let`
- `maxTimeMS`
- `raw`
- [`readConcern`](https://mongoosejs.com/docs/api/aggregate.md#Aggregate.prototype.readConcern())
- `readPreference`
- [`session`](https://mongoosejs.com/docs/api/aggregate.md#Aggregate.prototype.session())
- `writeConcern`

## `Aggregate.prototype.pipeline()`

### Returns

- \<Array[PipelineStage]\> The current pipeline similar to the operation that will be executed

Returns the current pipeline

#### Example:

    MyModel.aggregate().match({ test: 1 }).pipeline(); // [{ $match: { test: 1 } }]

## `Aggregate.prototype.pipelineForUnionWith()`

### Returns

- \<Array[PipelineStage]\> The current pipeline with `$unionWith` stage restrictions

Returns the current pipeline as a `$unionWith`-safe pipeline.
Throws if this pipeline contains `$out` or `$merge`.

#### Example:

    const base = MyModel.aggregate().match({ test: 1 });
    base.pipelineForUnionWith(); // [{ $match: { test: 1 } }]

## `Aggregate.prototype.project()`

### Parameters

- `arg` \<object|string\> field specification

### Returns

- \<Aggregate\>

### See

- [projection](https://www.mongodb.com/docs/manual/reference/aggregation/project/)

Appends a new $project operator to this aggregate pipeline.

Mongoose query [selection syntax](https://mongoosejs.com/docs/api/query.md#Query.prototype.select()) is also supported.

#### Example:

    // include a, include b, exclude _id
    aggregate.project("a b -_id");

    // or you may use object notation, useful when
    // you have keys already prefixed with a "-"
    aggregate.project({a: 1, b: 1, _id: 0});

    // reshaping documents
    aggregate.project({
        newField: '$b.nested'
      , plusTen: { $add: ['$val', 10]}
      , sub: {
           name: '$a'
        }
    })

    // etc
    aggregate.project({ salary_k: { $divide: [ "$salary", 1000 ] } });

## `Aggregate.prototype.read()`

### Parameters

- `pref` \<string|ReadPreference\> one of the listed preference options or their aliases
- `[tags]` \<Array\> optional tags for this query.

### Returns

- \<Aggregate\> this

### See

- [mongodb](https://www.mongodb.com/docs/manual/applications/replication/#read-preference)

Sets the readPreference option for the aggregation query.

#### Example:

    await Model.aggregate(pipeline).read('primaryPreferred');

## `Aggregate.prototype.readConcern()`

### Parameters

- `level` \<'local' | 'available' | 'majority' | 'snapshot' | 'linearizable' | 'l' | 'a' | 'm' | 's' | 'lz'\> one of the listed read concern level or their aliases

### Returns

- \<Aggregate\> this

### See

- [mongodb](https://www.mongodb.com/docs/manual/reference/read-concern/)

Sets the readConcern level for the aggregation query.

#### Example:

    await Model.aggregate(pipeline).readConcern('majority');

## `Aggregate.prototype.redact()`

### Parameters

- `expression` \<object\> redact options or conditional expression
- `[thenExpr]` \<string|object\> true case for the condition
- `[elseExpr]` \<string|object\> false case for the condition

### Returns

- \<Aggregate\> this

### See

- [$redact](https://www.mongodb.com/docs/manual/reference/operator/aggregation/redact/)

Appends a new $redact operator to this aggregate pipeline.

If 3 arguments are supplied, Mongoose will wrap them with if-then-else of $cond operator respectively
If `thenExpr` or `elseExpr` is string, make sure it starts with $$, like `$$DESCEND`, `$$PRUNE` or `$$KEEP`.

#### Example:

    await Model.aggregate(pipeline).redact({
      $cond: {
        if: { $eq: [ '$level', 5 ] },
        then: '$$PRUNE',
        else: '$$DESCEND'
      }
    });

    // $redact often comes with $cond operator, you can also use the following syntax provided by mongoose
    await Model.aggregate(pipeline).redact({ $eq: [ '$level', 5 ] }, '$$PRUNE', '$$DESCEND');

## `Aggregate.prototype.replaceRoot()`

### Parameters

- `newRoot` \<string|object\> the field or document which will become the new root document

### Returns

- \<Aggregate\>

### See

- [$replaceRoot](https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceRoot)

Appends a new $replaceRoot operator to this aggregate pipeline.

Note that the `$replaceRoot` operator requires field strings to start with '$'.
If you are passing in a string Mongoose will prepend '$' if the specified field doesn't start '$'.
If you are passing in an object the strings in your expression will not be altered.

#### Example:

    aggregate.replaceRoot("user");

    aggregate.replaceRoot({ x: { $concat: ['$this', '$that'] } });

## `Aggregate.prototype.sample()`

### Parameters

- `size` \<number\> number of random documents to pick

### Returns

- \<Aggregate\>

### See

- [$sample](https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/#pipe._S_sample)

Appends new custom $sample operator to this aggregate pipeline.

#### Example:

    aggregate.sample(3); // Add a pipeline that picks 3 random documents

    // `$match` before `$sample` samples from the filtered subset
    aggregate.match({ difficulty: 'easy' }).sample(3);

## `Aggregate.prototype.search()`

### Parameters

- `$search` \<object\> options

### Returns

- \<Aggregate\> this

### See

- [$search](https://www.mongodb.com/docs/atlas/atlas-search/tutorial/)

Helper for [Atlas Text Search](https://www.mongodb.com/docs/atlas/atlas-search/tutorial/)'s
`$search` stage.

#### Example:

    const res = await Model.aggregate().
     search({
       text: {
         query: 'baseball',
         path: 'plot'
       }
     });

    // Output: [{ plot: '...', title: '...' }]

## `Aggregate.prototype.session()`

### Parameters

- `session` \<ClientSession\>

### Returns

- \<Aggregate\> this

### See

- [mongodb](https://www.mongodb.com/docs/manual/reference/command/aggregate/)

Sets the session for this aggregation. Useful for [transactions](https://mongoosejs.com/docs/transactions.html).

#### Example:

    const session = await Model.startSession();
    await Model.aggregate(..).session(session);

## `Aggregate.prototype.skip()`

### Parameters

- `num` \<number\> number of records to skip before next stage

### Returns

- \<Aggregate\>

### See

- [$skip](https://www.mongodb.com/docs/manual/reference/aggregation/skip/)

Appends a new $skip operator to this aggregate pipeline.

#### Example:

    aggregate.skip(10);

## `Aggregate.prototype.sort()`

### Parameters

- `arg` \<object|string\>

### Returns

- \<Aggregate\> this

### See

- [$sort](https://www.mongodb.com/docs/manual/reference/aggregation/sort/)

Appends a new $sort operator to this aggregate pipeline.

If an object is passed, values allowed are `asc`, `desc`, `ascending`, `descending`, `1`, and `-1`.

If a string is passed, it must be a space delimited list of path names. The sort order of each path is ascending unless the path name is prefixed with `-` which will be treated as descending.

#### Example:

    // these are equivalent
    aggregate.sort({ field: 'asc', test: -1 });
    aggregate.sort('field -test');

## `Aggregate.prototype.sortByCount()`

### Parameters

- `arg` \<object|string\>

### Returns

- \<Aggregate\> this

### See

- [$sortByCount](https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortByCount/)

Appends a new $sortByCount operator to this aggregate pipeline. Accepts either a string field name
or a pipeline object.

Note that the `$sortByCount` operator requires the new root to start with '$'.
Mongoose will prepend '$' if the specified field name doesn't start with '$'.

#### Example:

    aggregate.sortByCount('users');
    aggregate.sortByCount({ $mergeObjects: [ "$employee", "$business" ] })

## `Aggregate.prototype.then()`

### Parameters

- `[resolve]` \<Function\> successCallback
- `[reject]` \<Function\> errorCallback

### Returns

- \<Promise\>

Provides a Promise-like `then` function, which will call `.exec` without a callback
Compatible with `await`.

#### Example:

    Model.aggregate(..).then(successCallback, errorCallback);

## `Aggregate.prototype.unionWith()`

### Parameters

- `options` \<object\> to $unionWith query as described in the above link

### Returns

- \<Aggregate\>

### See

- [$unionWith](https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith)

Appends new $unionWith operator to this aggregate pipeline.

#### Example:

    aggregate.unionWith({ coll: 'users', pipeline: [ { $match: { _id: 1 } } ] });

## `Aggregate.prototype.unwind()`

### Parameters

- `fields` \<string|object|Array[string]|Array[object]\> the field(s) to unwind, either as field names or as [objects with options](https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/#document-operand-with-options). If passing a string, prefixing the field name with '$' is optional. If passing an object, `path` must start with '$'.

### Returns

- \<Aggregate\>

### See

- [$unwind](https://www.mongodb.com/docs/manual/reference/aggregation/unwind/)

Appends new custom $unwind operator(s) to this aggregate pipeline.

Note that the `$unwind` operator requires the path name to start with '$'.
Mongoose will prepend '$' if the specified field doesn't start '$'.

#### Example:

    aggregate.unwind("tags");
    aggregate.unwind("a", "b", "c");
    aggregate.unwind({ path: '$tags', preserveNullAndEmptyArrays: true });

## `Aggregate.prototype[Symbol.asyncIterator]()`

Returns an asyncIterator for use with [`for/await/of` loops](https://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js)
You do not need to call this function explicitly, the JavaScript runtime
will call it for you.

#### Example:

    const agg = Model.aggregate([{ $match: { age: { $gte: 25 } } }]);
    for await (const doc of agg) {
      console.log(doc.name);
    }
