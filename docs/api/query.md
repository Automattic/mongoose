# Query

- [`Query()`](#Query())
- [`Query.prototype.$where()`](#Query.prototype.$where())
- [`Query.prototype.all()`](#Query.prototype.all())
- [`Query.prototype.allowDiskUse()`](#Query.prototype.allowDiskUse())
- [`Query.prototype.and()`](#Query.prototype.and())
- [`Query.prototype.batchSize()`](#Query.prototype.batchSize())
- [`Query.prototype.box()`](#Query.prototype.box())
- [`Query.prototype.cast()`](#Query.prototype.cast())
- [`Query.prototype.catch()`](#Query.prototype.catch())
- [`Query.prototype.center()`](#Query.prototype.center())
- [`Query.prototype.centerSphere()`](#Query.prototype.centerSphere())
- [`Query.prototype.circle()`](#Query.prototype.circle())
- [`Query.prototype.clone()`](#Query.prototype.clone())
- [`Query.prototype.collation()`](#Query.prototype.collation())
- [`Query.prototype.comment()`](#Query.prototype.comment())
- [`Query.prototype.countDocuments()`](#Query.prototype.countDocuments())
- [`Query.prototype.cursor()`](#Query.prototype.cursor())
- [`Query.prototype.deleteMany()`](#Query.prototype.deleteMany())
- [`Query.prototype.deleteOne()`](#Query.prototype.deleteOne())
- [`Query.prototype.distinct()`](#Query.prototype.distinct())
- [`Query.prototype.elemMatch()`](#Query.prototype.elemMatch())
- [`Query.prototype.equals()`](#Query.prototype.equals())
- [`Query.prototype.error()`](#Query.prototype.error())
- [`Query.prototype.estimatedDocumentCount()`](#Query.prototype.estimatedDocumentCount())
- [`Query.prototype.exec()`](#Query.prototype.exec())
- [`Query.prototype.exists()`](#Query.prototype.exists())
- [`Query.prototype.explain()`](#Query.prototype.explain())
- [`Query.prototype.finally()`](#Query.prototype.finally())
- [`Query.prototype.find()`](#Query.prototype.find())
- [`Query.prototype.findById()`](#Query.prototype.findById())
- [`Query.prototype.findByIdAndDelete()`](#Query.prototype.findByIdAndDelete())
- [`Query.prototype.findByIdAndUpdate()`](#Query.prototype.findByIdAndUpdate())
- [`Query.prototype.findOne()`](#Query.prototype.findOne())
- [`Query.prototype.findOneAndDelete()`](#Query.prototype.findOneAndDelete())
- [`Query.prototype.findOneAndReplace()`](#Query.prototype.findOneAndReplace())
- [`Query.prototype.findOneAndUpdate()`](#Query.prototype.findOneAndUpdate())
- [`Query.prototype.geometry()`](#Query.prototype.geometry())
- [`Query.prototype.get()`](#Query.prototype.get())
- [`Query.prototype.getFilter()`](#Query.prototype.getFilter())
- [`Query.prototype.getOptions()`](#Query.prototype.getOptions())
- [`Query.prototype.getPopulatedPaths()`](#Query.prototype.getPopulatedPaths())
- [`Query.prototype.getQuery()`](#Query.prototype.getQuery())
- [`Query.prototype.getUpdate()`](#Query.prototype.getUpdate())
- [`Query.prototype.gt()`](#Query.prototype.gt())
- [`Query.prototype.gte()`](#Query.prototype.gte())
- [`Query.prototype.hint()`](#Query.prototype.hint())
- [`Query.prototype.in()`](#Query.prototype.in())
- [`Query.prototype.intersects()`](#Query.prototype.intersects())
- [`Query.prototype.isPathSelectedInclusive()`](#Query.prototype.isPathSelectedInclusive())
- [`Query.prototype.j()`](#Query.prototype.j())
- [`Query.prototype.lean()`](#Query.prototype.lean())
- [`Query.prototype.limit()`](#Query.prototype.limit())
- [`Query.prototype.lt()`](#Query.prototype.lt())
- [`Query.prototype.lte()`](#Query.prototype.lte())
- [`Query.prototype.maxDistance()`](#Query.prototype.maxDistance())
- [`Query.prototype.maxTimeMS()`](#Query.prototype.maxTimeMS())
- [`Query.prototype.merge()`](#Query.prototype.merge())
- [`Query.prototype.mod()`](#Query.prototype.mod())
- [`Query.prototype.model`](#Query.prototype.model)
- [`Query.prototype.mongooseOptions()`](#Query.prototype.mongooseOptions())
- [`Query.prototype.ne()`](#Query.prototype.ne())
- [`Query.prototype.near()`](#Query.prototype.near())
- [`Query.prototype.nearSphere()`](#Query.prototype.nearSphere())
- [`Query.prototype.nin()`](#Query.prototype.nin())
- [`Query.prototype.nor()`](#Query.prototype.nor())
- [`Query.prototype.or()`](#Query.prototype.or())
- [`Query.prototype.orFail()`](#Query.prototype.orFail())
- [`Query.prototype.polygon()`](#Query.prototype.polygon())
- [`Query.prototype.populate()`](#Query.prototype.populate())
- [`Query.prototype.post()`](#Query.prototype.post())
- [`Query.prototype.pre()`](#Query.prototype.pre())
- [`Query.prototype.projection()`](#Query.prototype.projection())
- [`Query.prototype.read()`](#Query.prototype.read())
- [`Query.prototype.readConcern()`](#Query.prototype.readConcern())
- [`Query.prototype.regex()`](#Query.prototype.regex())
- [`Query.prototype.replaceOne()`](#Query.prototype.replaceOne())
- [`Query.prototype.sanitizeProjection()`](#Query.prototype.sanitizeProjection())
- [`Query.prototype.schemaLevelProjections()`](#Query.prototype.schemaLevelProjections())
- [`Query.prototype.select()`](#Query.prototype.select())
- [`Query.prototype.selected()`](#Query.prototype.selected())
- [`Query.prototype.selectedExclusively()`](#Query.prototype.selectedExclusively())
- [`Query.prototype.selectedInclusively()`](#Query.prototype.selectedInclusively())
- [`Query.prototype.session()`](#Query.prototype.session())
- [`Query.prototype.set()`](#Query.prototype.set())
- [`Query.prototype.setOptions()`](#Query.prototype.setOptions())
- [`Query.prototype.setQuery()`](#Query.prototype.setQuery())
- [`Query.prototype.setUpdate()`](#Query.prototype.setUpdate())
- [`Query.prototype.size()`](#Query.prototype.size())
- [`Query.prototype.skip()`](#Query.prototype.skip())
- [`Query.prototype.slice()`](#Query.prototype.slice())
- [`Query.prototype.sort()`](#Query.prototype.sort())
- [`Query.prototype.tailable()`](#Query.prototype.tailable())
- [`Query.prototype.then()`](#Query.prototype.then())
- [`Query.prototype.toConstructor()`](#Query.prototype.toConstructor())
- [`Query.prototype.transform()`](#Query.prototype.transform())
- [`Query.prototype.updateMany()`](#Query.prototype.updateMany())
- [`Query.prototype.updateOne()`](#Query.prototype.updateOne())
- [`Query.prototype.w()`](#Query.prototype.w())
- [`Query.prototype.where()`](#Query.prototype.where())
- [`Query.prototype.within()`](#Query.prototype.within())
- [`Query.prototype.writeConcern()`](#Query.prototype.writeConcern())
- [`Query.prototype.wtimeout()`](#Query.prototype.wtimeout())
- [`Query.prototype[Symbol.asyncIterator]()`](#Query.prototype[Symbol.asyncIterator]())
- [`Query.prototype[Symbol.toStringTag]()`](#Query.prototype[Symbol.toStringTag]())
- [`Query.use$geoWithin`](#Query.use$geoWithin)
- [`canMerge()`](#canMerge())

## `Query()`

### Parameters

- `[options]` \<object\>
- `[model]` \<object\>
- `[conditions]` \<object\>
- `[collection]` \<object\> Mongoose collection

Query constructor used for building queries. You do not need
to instantiate a `Query` directly. Instead use Model functions like
[`Model.find()`](https://mongoosejs.com/docs/api/model.md#Model.find()).

#### Example:

    const query = MyModel.find(); // `query` is an instance of `Query`
    query.setOptions({ lean : true });
    query.collection(MyModel.collection);
    query.where('age').gte(21).exec(callback);

    // You can instantiate a query directly. There is no need to do
    // this unless you're an advanced user with a very good reason to.
    const query = new mongoose.Query();

## `Query.prototype.$where()`

### Parameters

- `js` \<string|Function\> javascript string or function

### Returns

- \<Query\> this

### See

- [$where](https://www.mongodb.com/docs/manual/reference/operator/where/)

Specifies a javascript function or expression to pass to MongoDBs query system.

#### Example:

    query.$where('this.comments.length === 10 || this.name.length === 5')

    // or

    query.$where(function () {
      return this.comments.length === 10 || this.name.length === 5;
    })

#### Note:

Only use `$where` when you have a condition that cannot be met using other MongoDB operators like `$lt`.
**Be sure to read about all of [its caveats](https://www.mongodb.com/docs/manual/reference/operator/where/) before using.**

## `Query.prototype.all()`

### Parameters

- `[path]` \<string\>
- `val` \<Array\>

### See

- [$all](https://www.mongodb.com/docs/manual/reference/operator/all/)

Specifies an `$all` query condition.

When called with one argument, the most recent path passed to `where()` is used.

#### Example:

    MyModel.find().where('pets').all(['dog', 'cat', 'ferret']);
    // Equivalent:
    MyModel.find().all('pets', ['dog', 'cat', 'ferret']);

## `Query.prototype.allowDiskUse()`

### Parameters

- `[v]` \<boolean\> Enable/disable `allowDiskUse`. If called with 0 arguments, sets `allowDiskUse: true`

### Returns

- \<Query\> this

Sets the [`allowDiskUse` option](https://www.mongodb.com/docs/manual/reference/method/cursor.allowDiskUse/),
which allows the MongoDB server to use more than 100 MB for this query's `sort()`. This option can
let you work around `QueryExceededMemoryLimitNoDiskUseAllowed` errors from the MongoDB server.

Note that this option requires MongoDB server >= 4.4. Setting this option is a no-op for MongoDB 4.2
and earlier.

Calling `query.allowDiskUse(v)` is equivalent to `query.setOptions({ allowDiskUse: v })`

#### Example:

    await query.find().sort({ name: 1 }).allowDiskUse(true);
    // Equivalent:
    await query.find().sort({ name: 1 }).allowDiskUse();

## `Query.prototype.and()`

### Parameters

- `array` \<Array\> array of conditions

### Returns

- \<Query\> this

### See

- [$and](https://www.mongodb.com/docs/manual/reference/operator/and/)

Specifies arguments for a `$and` condition.

#### Example:

    query.and([{ color: 'green' }, { status: 'ok' }])

## `Query.prototype.batchSize()`

### Parameters

- `val` \<number\>

### See

- [batchSize](https://www.mongodb.com/docs/manual/reference/method/cursor.batchSize/)

Specifies the batchSize option.

#### Example:

    query.batchSize(100)

#### Note:

Cannot be used with `distinct()`

## `Query.prototype.box()`

### Parameters

- `val1` \<object|Array<number>\> Lower Left Coordinates OR an object of lower-left(ll) and upper-right(ur) Coordinates
- `[val2]` \<Array<number>\> Upper Right Coordinates

### Returns

- \<Query\> this

### See

- [$box](https://www.mongodb.com/docs/manual/reference/operator/box/)
- [within() Query#within](https://mongoosejs.com/docs/api/query.md#Query.prototype.within())
- [MongoDB Geospatial Indexing](https://www.mongodb.com/docs/manual/core/geospatial-indexes/)

Specifies a `$box` condition

#### Example:

    const lowerLeft = [40.73083, -73.99756]
    const upperRight= [40.741404,  -73.988135]

    query.where('loc').within().box(lowerLeft, upperRight)
    query.box({ ll : lowerLeft, ur : upperRight })

## `Query.prototype.cast()`

### Parameters

- `[model]` \<Model\> the model to cast to. If not set, defaults to `this.model`
- `[obj]` \<object\>

### Returns

- \<object\>

Casts this query to the schema of `model`

#### Note:

If `obj` is present, it is cast instead of this query.

## `Query.prototype.catch()`

### Parameters

- `[reject]` \<Function\>

### Returns

- \<Promise\>

Executes the query returning a `Promise` which will be
resolved with either the doc(s) or rejected with the error.
Like `.then()`, but only takes a rejection handler.

More about [Promise `catch()` in JavaScript](https://masteringjs.io/tutorials/fundamentals/catch).

## `Query.prototype.center()`

Deprecated.

_DEPRECATED_ Alias for [circle](https://mongoosejs.com/docs/api/query.md#Query.prototype.circle())

**Deprecated.** Use [circle](https://mongoosejs.com/docs/api/query.md#Query.prototype.circle()) instead.

## `Query.prototype.centerSphere()`

Deprecated.

### Parameters

- `[path]` \<string\>
- `val` \<object\>

### Returns

- \<Query\> this

### See

- [MongoDB Geospatial Indexing](https://www.mongodb.com/docs/manual/core/geospatial-indexes/)
- [$centerSphere](https://www.mongodb.com/docs/manual/reference/operator/centerSphere/)

_DEPRECATED_ Specifies a `$centerSphere` condition

**Deprecated.** Use [circle](https://mongoosejs.com/docs/api/query.md#Query.prototype.circle()) instead.

#### Example:

    const area = { center: [50, 50], radius: 10 };
    query.where('loc').within().centerSphere(area);

## `Query.prototype.circle()`

### Parameters

- `[path]` \<string\>
- `area` \<object\>

### Returns

- \<Query\> this

### See

- [$center](https://www.mongodb.com/docs/manual/reference/operator/center/)
- [$centerSphere](https://www.mongodb.com/docs/manual/reference/operator/centerSphere/)
- [$geoWithin](https://www.mongodb.com/docs/manual/reference/operator/geoWithin/)
- [MongoDB Geospatial Indexing](https://www.mongodb.com/docs/manual/core/geospatial-indexes/)

Specifies a `$center` or `$centerSphere` condition.

#### Example:

    const area = { center: [50, 50], radius: 10, unique: true }
    query.where('loc').within().circle(area)
    // alternatively
    query.circle('loc', area);

    // spherical calculations
    const area = { center: [50, 50], radius: 10, unique: true, spherical: true }
    query.where('loc').within().circle(area)
    // alternatively
    query.circle('loc', area);

## `Query.prototype.clone()`

### Returns

- \<Query\> copy

Make a copy of this query so you can re-execute it.

#### Example:

    const q = Book.findOne({ title: 'Casino Royale' });
    await q.exec();
    await q.exec(); // Throws an error because you can't execute a query twice

    await q.clone().exec(); // Works

## `Query.prototype.collation()`

### Parameters

- `value` \<object\>

### Returns

- \<Query\> this

### See

- [MongoDB docs](https://www.mongodb.com/docs/manual/reference/method/cursor.collation/#cursor.collation)

Adds a collation to this op (MongoDB 3.4 and up)

## `Query.prototype.comment()`

### Parameters

- `val` \<string\>

### See

- [comment](https://www.mongodb.com/docs/manual/reference/operator/comment/)

Specifies the `comment` option.

#### Example:

    query.comment('login query')

#### Note:

Cannot be used with `distinct()`

## `Query.prototype.countDocuments()`

### Parameters

- `[filter]` \<object\> mongodb selector
- `[options]` \<object\>

### Returns

- \<Query\> this

### See

- [countDocuments](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#countDocuments)

Specifies this query as a `countDocuments()` query. Behaves like `count()`,
except it always does a full collection scan when passed an empty filter `{}`.

There are also minor differences in how `countDocuments()` handles
[`$where` and a couple geospatial operators](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#countDocuments).
versus `count()`.

This function triggers the following middleware.

- `countDocuments()`

#### Example:

    const countQuery = model.where({ 'color': 'black' }).countDocuments();

    query.countDocuments({ color: 'black' }).count().exec();

    await query.countDocuments({ color: 'black' });

    query.where('color', 'black').countDocuments().exec();

The `countDocuments()` function is similar to `count()`, but there are a
[few operators that `countDocuments()` does not support](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#countDocuments).
Below are the operators that `count()` supports but `countDocuments()` does not,
and the suggested replacement:

- `$where`: [`$expr`](https://www.mongodb.com/docs/manual/reference/operator/query/expr/)
- `$near`: [`$geoWithin`](https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/) with [`$center`](https://www.mongodb.com/docs/manual/reference/operator/query/center/#op._S_center)
- `$nearSphere`: [`$geoWithin`](https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/) with [`$centerSphere`](https://www.mongodb.com/docs/manual/reference/operator/query/centerSphere/#op._S_centerSphere)

## `Query.prototype.cursor()`

### Parameters

- `[options]` \<object\>

### Returns

- \<QueryCursor\>

### See

- [QueryCursor](https://mongoosejs.com/docs/api/querycursor.md)

Returns a wrapper around a [mongodb driver cursor](https://mongodb.github.io/node-mongodb-native/7.0/classes/FindCursor.html).
A QueryCursor exposes a Streams3 interface, as well as a `.next()` function.

The `.cursor()` function triggers pre find hooks, but **not** post find hooks.

#### Example:

    // There are 2 ways to use a cursor. First, as a stream:
    Thing.
      find({ name: /^hello/ }).
      cursor().
      on('data', function(doc) { console.log(doc); }).
      on('end', function() { console.log('Done!'); });

    // Or you can use `.next()` to manually get the next doc in the stream.
    // `.next()` returns a promise, so you can use promises or callbacks.
    const cursor = Thing.find({ name: /^hello/ }).cursor();
    cursor.next(function(error, doc) {
      console.log(doc);
    });

    // Because `.next()` returns a promise, you can use co
    // to easily iterate through all documents without loading them
    // all into memory.
    const cursor = Thing.find({ name: /^hello/ }).cursor();
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      console.log(doc);
    }

#### Valid options

  - `transform`: optional function which accepts a mongoose document. The return value of the function will be emitted on `data` and returned by `.next()`.

## `Query.prototype.deleteMany()`

### Parameters

- `[filter]` \<object|Query\> mongodb selector
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.requireFilter=false]` \<boolean\> If true, throws an error if the filter is empty (`{}`)

### Returns

- \<Query\> this

### See

- [DeleteResult](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/DeleteResult.html)
- [deleteMany](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#deleteMany)

Declare and/or execute this query as a `deleteMany()` operation. Works like
remove, except it deletes _every_ document that matches `filter` in the
collection, regardless of the value of `single`.

This function triggers `deleteMany` middleware.

#### Example:

    await Character.deleteMany({ name: /Stark/, age: { $gte: 18 } });

This function calls the MongoDB driver's [`Collection#deleteMany()` function](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#deleteMany).
The returned [promise](https://mongoosejs.com/docs/queries.html) resolves to an
object that contains 2 properties:

- `acknowledged`: boolean
- `deletedCount`: the number of documents deleted

#### Example:

    const res = await Character.deleteMany({ name: /Stark/, age: { $gte: 18 } });
    // `0` if no docs matched the filter, number of docs deleted otherwise
    res.deletedCount;

## `Query.prototype.deleteOne()`

### Parameters

- `[filter]` \<object|Query\> mongodb selector
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.requireFilter=false]` \<boolean\> If true, throws an error if the filter is empty (`{}`)

### Returns

- \<Query\> this

### See

- [DeleteResult](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/DeleteResult.html)
- [deleteOne](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#deleteOne)

Declare and/or execute this query as a `deleteOne()` operation. Works like
remove, except it deletes at most one document regardless of the `single`
option.

This function triggers `deleteOne` middleware.

#### Example:

    await Character.deleteOne({ name: 'Eddard Stark' });

This function calls the MongoDB driver's [`Collection#deleteOne()` function](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#deleteOne).
The returned [promise](https://mongoosejs.com/docs/queries.html) resolves to an
object that contains 2 properties:

- `acknowledged`: boolean
- `deletedCount`: the number of documents deleted

#### Example:

    const res = await Character.deleteOne({ name: 'Eddard Stark' });
    // `1` if MongoDB deleted a doc, `0` if no docs matched the filter `{ name: ... }`
    res.deletedCount;

## `Query.prototype.distinct()`

### Parameters

- `[field]` \<string\>
- `[filter]` \<object|Query\>
- `[options]` \<object\>

### Returns

- \<Query\> this

### See

- [distinct](https://www.mongodb.com/docs/manual/reference/method/db.collection.distinct/)

Declares or executes a distinct() operation.

This function does not trigger any middleware.

#### Example:

    distinct(field, conditions, options)
    distinct(field, conditions)
    distinct(field)
    distinct()

## `Query.prototype.elemMatch()`

### Parameters

- `path` \<string|object|Function\>
- `filter` \<object|Function\>

### Returns

- \<Query\> this

### See

- [$elemMatch](https://www.mongodb.com/docs/manual/reference/operator/elemMatch/)

Specifies an `$elemMatch` condition

#### Example:

    query.elemMatch('comment', { author: 'autobot', votes: {$gte: 5}})

    query.where('comment').elemMatch({ author: 'autobot', votes: {$gte: 5}})

    query.elemMatch('comment', function (elem) {
      elem.where('author').equals('autobot');
      elem.where('votes').gte(5);
    })

    query.where('comment').elemMatch(function (elem) {
      elem.where({ author: 'autobot' });
      elem.where('votes').gte(5);
    })

## `Query.prototype.equals()`

### Parameters

- `val` \<object\>

### Returns

- \<Query\> this

Specifies the complementary comparison value for paths specified with `where()`

#### Example:

    User.where('age').equals(49);

    // is the same as

    User.where('age', 49);

## `Query.prototype.error()`

### Parameters

- `err` \<Error|null\> if set, `exec()` will fail fast before sending the query to MongoDB

### Returns

- \<Query\> this

Gets/sets the error flag on this query. If this flag is not null or
undefined, the `exec()` promise will reject without executing.

#### Example:

    Query().error(); // Get current error value
    Query().error(null); // Unset the current error
    Query().error(new Error('test')); // `exec()` will resolve with test
    Schema.pre('find', function() {
      if (!this.getQuery().userId) {
        this.error(new Error('Not allowed to query without setting userId'));
      }
    });

Note that query casting runs **after** hooks, so cast errors will override
custom errors.

#### Example:

    const TestSchema = new Schema({ num: Number });
    const TestModel = db.model('Test', TestSchema);
    TestModel.find({ num: 'not a number' }).error(new Error('woops')).exec(function(error) {
      // `error` will be a cast error because `num` failed to cast
    });

## `Query.prototype.estimatedDocumentCount()`

### Parameters

- `[options]` \<object\> passed transparently to the [MongoDB driver](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/EstimatedDocumentCountOptions.html)

### Returns

- \<Query\> this

### See

- [estimatedDocumentCount](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#estimatedDocumentCount)

Specifies this query as a `estimatedDocumentCount()` query. Faster than
using `countDocuments()` for large collections because
`estimatedDocumentCount()` uses collection metadata rather than scanning
the entire collection.

`estimatedDocumentCount()` does **not** accept a filter. `Model.find({ foo: bar }).estimatedDocumentCount()`
is equivalent to `Model.find().estimatedDocumentCount()`

This function triggers the following middleware.

- `estimatedDocumentCount()`

#### Example:

    await Model.find().estimatedDocumentCount();

## `Query.prototype.exec()`

### Parameters

- `[operation]` \<string|Function\>

### Returns

- \<Promise\>

Executes the query

#### Example:

    const promise = query.exec();
    const promise = query.exec('update');

## `Query.prototype.exists()`

### Parameters

- `[path]` \<string\>
- `val` \<boolean\>

### Returns

- \<Query\> this

### See

- [$exists](https://www.mongodb.com/docs/manual/reference/operator/exists/)

Specifies an `$exists` condition

#### Example:

    // { name: { $exists: true }}
    Thing.where('name').exists()
    Thing.where('name').exists(true)
    Thing.find().exists('name')

    // { name: { $exists: false }}
    Thing.where('name').exists(false);
    Thing.find().exists('name', false);

## `Query.prototype.explain()`

### Parameters

- `[verbose]` \<'queryPlanner' | 'executionStats' | 'allPlansExecution'\> The verbosity mode. The default is 'queryPlanner'

### Returns

- \<Query\> this

Sets the [`explain` option](https://www.mongodb.com/docs/manual/reference/method/cursor.explain/),
which makes this query return detailed execution stats instead of the actual
query result. This method is useful for determining what index your queries
use.

Calling `query.explain(v)` is equivalent to `query.setOptions({ explain: v })`

#### Example:

    const query = new Query();
    const res = await query.find({ a: 1 }).explain('queryPlanner');
    console.log(res);

## `Query.prototype.finally()`

### Parameters

- `[onFinally]` \<Function\>

### Returns

- \<Promise\>

Executes the query returning a `Promise` which will be
resolved with `.finally()` chained.

More about [Promise `finally()` in JavaScript](https://thecodebarbarian.com/using-promise-finally-in-node-js.html).

## `Query.prototype.find()`

### Parameters

- `[filter]` \<object|ObjectId\> mongodb filter. If not specified, returns all documents.

### Returns

- \<Query\> this

Find all documents that match `selector`. The result will be an array of documents.

If there are too many documents in the result to fit in memory, use
[`Query.prototype.cursor()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.cursor())

#### Example:

    const arr = await Movie.find({ year: { $gte: 1980, $lte: 1989 } });

## `Query.prototype.findById()`

### Parameters

- `id` \<any\> value of `_id` to query by
- `[projection]` \<object\> optional fields to return
- `[options]` \<object\> see [`setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.

### Returns

- \<Query\> this

### See

- [findOne](https://www.mongodb.com/docs/manual/reference/method/db.collection.findOne/)
- [Query.select](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())

Finds a single document by its _id field. `findById(id)` is equivalent to
`findOne({ _id: id })`.

The `id` is cast based on the Schema before sending the command.

This function triggers the following middleware.

- `findOne()`

## `Query.prototype.findByIdAndDelete()`

### Parameters

- `id` \<any\> value of `_id` to query by
- `[options]` \<object\>
- `[options.includeResultMetadata]` \<boolean\> if true, returns the full [ModifyResult from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/ModifyResult.html) rather than just the document
- `[options.session=null]` \<ClientSession\> The session associated with this query. See [transactions docs](https://mongoosejs.com/docs/transactions.html).
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)

### Returns

- \<Query\> this

### See

- [findAndModify command](https://www.mongodb.com/docs/manual/reference/command/findAndModify/)

Issue a MongoDB `findOneAndDelete()` command by a document's _id field.
In other words, `findByIdAndDelete(id)` is a shorthand for
`findOneAndDelete({ _id: id })`.

This function triggers the following middleware.

- `findOneAndDelete()`

## `Query.prototype.findByIdAndUpdate()`

### Parameters

- `id` \<any\> value of `_id` to query by
- `[doc]` \<object\>
- `[options]` \<object\>
- `[options.cloneUpdate=true]` \<boolean\> if `false`, Mongoose will not clone the update before executing the query
- `[options.includeResultMetadata]` \<boolean\> if true, returns the full [ModifyResult from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/ModifyResult.html) rather than just the document
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.session=null]` \<ClientSession\> The session associated with this query. See [transactions docs](https://mongoosejs.com/docs/transactions.html).
- `[options.multipleCastError]` \<boolean\> by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
- `[options.new=false]` \<boolean\> By default, `findOneAndUpdate()` returns the document as it was **before** `update` was applied. If you set `new: true`, `findOneAndUpdate()` will instead give you the object after `update` was applied. **Deprecated:** Use `returnDocument: 'after'` instead of `new: true`, or `returnDocument: 'before'` instead of `new: false`.
- `[options.lean]` \<object\> if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.lean()) and [the Mongoose lean tutorial](https://mongoosejs.com/docs/tutorials/lean.html).
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
- `[options.returnOriginal=null]` \<boolean\> An alias for the `new` option. `returnOriginal: false` is equivalent to `new: true`. **Deprecated:** Use `returnDocument: 'after'` instead of `returnOriginal: false`, or `returnDocument: 'before'` instead of `returnOriginal: true`.
- `[options.returnDocument='before']` \<'before' | 'after'\> Has two possible values, `'before'` and `'after'`. By default, it will return the document before the update was applied.
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.
- `[options.overwriteDiscriminatorKey=false]` \<boolean\> Mongoose removes discriminator key updates from `update` by default, set `overwriteDiscriminatorKey` to `true` to allow updating the discriminator key
- `[options.overwriteImmutable=false]` \<boolean\> Mongoose removes updated immutable properties from `update` by default (excluding $setOnInsert). Set `overwriteImmutable` to `true` to allow updating immutable properties using other update operators.

### Returns

- \<Query\> this

### See

- [Tutorial](https://mongoosejs.com/docs/tutorials/findoneandupdate.html)
- [findAndModify command](https://www.mongodb.com/docs/manual/reference/command/findAndModify/)
- [ModifyResult](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/ModifyResult.html)
- [findOneAndUpdate](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#findOneAndUpdate)

Issues a mongodb findOneAndUpdate command by a document's _id field.
`findByIdAndUpdate(id, ...)` is equivalent to `findOneAndUpdate({ _id: id }, ...)`.

Finds a matching document, updates it according to the `update` arg,
passing any `options`, and returns the found document (if any).

This function triggers the following middleware.

- `findOneAndUpdate()`

## `Query.prototype.findOne()`

### Parameters

- `[filter]` \<object\> mongodb selector
- `[projection]` \<object\> optional fields to return
- `[options]` \<object\> see [`setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.

### Returns

- \<Query\> this

### See

- [findOne](https://www.mongodb.com/docs/manual/reference/method/db.collection.findOne/)
- [Query.select](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())

Declares the query a findOne operation. When executed, the first found document is passed to the callback.

The result of the query is a single document, or `null` if no document was found.

* *Note:* `conditions` is optional, and if `conditions` is null or undefined,
mongoose will send an empty `findOne` command to MongoDB, which will return
an arbitrary document. If you're querying by `_id`, use `Model.findById()`
instead.

This function triggers the following middleware.

- `findOne()`

#### Example:

    const query = Kitten.where({ color: 'white' });
    const kitten = await query.findOne();

## `Query.prototype.findOneAndDelete()`

### Parameters

- `[filter]` \<object\>
- `[options]` \<object\>
- `[options.includeResultMetadata]` \<boolean\> if true, returns the full [ModifyResult from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/ModifyResult.html) rather than just the document
- `[options.requireFilter=false]` \<boolean\> If true, throws an error if the filter is empty (`{}`)
- `[options.session=null]` \<ClientSession\> The session associated with this query. See [transactions docs](https://mongoosejs.com/docs/transactions.html).
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)

### Returns

- \<Query\> this

### See

- [findAndModify command](https://www.mongodb.com/docs/manual/reference/command/findAndModify/)

Issues a MongoDB [findOneAndDelete](https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndDelete/) command.

Finds a matching document, removes it, and returns the found document (if any).

This function triggers the following middleware.

- `findOneAndDelete()`

#### Available options

- `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
- `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
- `requireFilter`: bool - if true, throws an error if the filter is empty (`{}`). Defaults to false.

#### Example:

    A.where().findOneAndDelete(conditions, options)  // return Query
    A.where().findOneAndDelete(conditions) // returns Query
    A.where().findOneAndDelete()           // returns Query

## `Query.prototype.findOneAndReplace()`

### Parameters

- `[filter]` \<object\>
- `[replacement]` \<object\>
- `[options]` \<object\>
- `[options.cloneUpdate=true]` \<boolean\> if `false`, Mongoose will not clone the update before executing the query
- `[options.includeResultMetadata]` \<boolean\> if true, returns the full [ModifyResult from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/ModifyResult.html) rather than just the document
- `[options.session=null]` \<ClientSession\> The session associated with this query. See [transactions docs](https://mongoosejs.com/docs/transactions.html).
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.new=false]` \<boolean\> By default, `findOneAndUpdate()` returns the document as it was **before** `update` was applied. If you set `new: true`, `findOneAndUpdate()` will instead give you the object after `update` was applied. **Deprecated:** Use `returnDocument: 'after'` instead of `new: true`, or `returnDocument: 'before'` instead of `new: false`.
- `[options.lean]` \<object\> if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.lean()) and [the Mongoose lean tutorial](https://mongoosejs.com/docs/tutorials/lean.html).
- `[options.session=null]` \<ClientSession\> The session associated with this query. See [transactions docs](https://mongoosejs.com/docs/transactions.html).
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
- `[options.returnOriginal=null]` \<boolean\> An alias for the `new` option. `returnOriginal: false` is equivalent to `new: true`. **Deprecated:** Use `returnDocument: 'after'` instead of `returnOriginal: false`, or `returnDocument: 'before'` instead of `returnOriginal: true`.
- `[options.returnDocument='before']` \<'before' | 'after'\> Has two possible values, `'before'` and `'after'`. By default, it will return the document before the update was applied.
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.
- `[options.requireFilter=false]` \<boolean\> If true, throws an error if the filter is empty (`{}`)

### Returns

- \<Query\> this

Issues a MongoDB [findOneAndReplace](https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndReplace/) command.

Finds a matching document, removes it, and returns the found document (if any).

This function triggers the following middleware.

- `findOneAndReplace()`

#### Available options

- `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
- `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
- `includeResultMetadata`: if true, returns the full [ModifyResult from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/ModifyResult.html) rather than just the document
- `requireFilter`: bool - if true, throws an error if the filter is empty (`{}`). Defaults to false.

#### Example:

    A.where().findOneAndReplace(filter, replacement, options); // return Query
    A.where().findOneAndReplace(filter); // returns Query
    A.where().findOneAndReplace(); // returns Query

## `Query.prototype.findOneAndUpdate()`

### Parameters

- `[filter]` \<object|Query\>
- `[update]` \<object\>
- `[options]` \<object\>
- `[options.cloneUpdate=true]` \<boolean\> if `false`, Mongoose will not clone the update before executing the query
- `[options.includeResultMetadata]` \<boolean\> if true, returns the full [ModifyResult from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/ModifyResult.html) rather than just the document
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.session=null]` \<ClientSession\> The session associated with this query. See [transactions docs](https://mongoosejs.com/docs/transactions.html).
- `[options.multipleCastError]` \<boolean\> by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
- `[options.new=false]` \<boolean\> By default, `findOneAndUpdate()` returns the document as it was **before** `update` was applied. If you set `new: true`, `findOneAndUpdate()` will instead give you the object after `update` was applied. **Deprecated:** Use `returnDocument: 'after'` instead of `new: true`, or `returnDocument: 'before'` instead of `new: false`.
- `[options.lean]` \<object\> if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.lean()) and [the Mongoose lean tutorial](https://mongoosejs.com/docs/tutorials/lean.html).
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
- `[options.returnOriginal=null]` \<boolean\> An alias for the `new` option. `returnOriginal: false` is equivalent to `new: true`. **Deprecated:** Use `returnDocument: 'after'` instead of `returnOriginal: false`, or `returnDocument: 'before'` instead of `returnOriginal: true`.
- `[options.returnDocument='before']` \<'before' | 'after'\> Has two possible values, `'before'` and `'after'`. By default, it will return the document before the update was applied.
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.
- `[options.overwriteDiscriminatorKey=false]` \<boolean\> Mongoose removes discriminator key updates from `update` by default, set `overwriteDiscriminatorKey` to `true` to allow updating the discriminator key
- `[options.overwriteImmutable=false]` \<boolean\> Mongoose removes updated immutable properties from `update` by default (excluding $setOnInsert). Set `overwriteImmutable` to `true` to allow updating immutable properties using other update operators.
- `[options.requireFilter=false]` \<boolean\> If true, throws an error if the filter is empty (`{}`)

### Returns

- \<Query\> this

### See

- [Tutorial](https://mongoosejs.com/docs/tutorials/findoneandupdate.html)
- [findAndModify command](https://www.mongodb.com/docs/manual/reference/command/findAndModify/)
- [ModifyResult](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/ModifyResult.html)
- [findOneAndUpdate](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#findOneAndUpdate)

Issues a mongodb `findOneAndUpdate()` command.

Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found
document (if any).

This function triggers the following middleware.

- `findOneAndUpdate()`

#### Available options

- `new`: bool - if true, return the modified document rather than the original. defaults to false (changed in 4.0)
- `upsert`: bool - creates the object if it doesn't exist. defaults to false.
- `fields`: {Object|String} - Field selection. Equivalent to `.select(fields).findOneAndUpdate()`
- `sort`: if multiple docs are found by the filter, sets the sort order to choose which doc to update
- `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
- `runValidators`: if true, runs [update validators](https://mongoosejs.com/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
- `setDefaultsOnInsert`: `true` by default. If `setDefaultsOnInsert` and `upsert` are true, mongoose will apply the [defaults](https://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created.
- `requireFilter`: bool - if true, throws an error if the filter is empty (`{}`). Defaults to false.

#### Example:

    query.findOneAndUpdate(filter, update, options);  // returns Query
    query.findOneAndUpdate(filter, update);           // returns Query
    // Note that `Query#findOneAndUpdate()` with 1 arg treats the first arg as the `update`, NOT the `filter`.
    query.findOneAndUpdate(update);                   // returns Query
    query.findOneAndUpdate();                         // returns Query

## `Query.prototype.geometry()`

### Parameters

- `object` \<object\> Must contain a `type` property which is a String and a `coordinates` property which is an Array. See the examples.

### Returns

- \<Query\> this

### See

- [$geometry](https://www.mongodb.com/docs/manual/reference/operator/geometry/)
- [Geospatial Support Enhancements](https://www.mongodb.com/docs/manual/release-notes/2.4/#geospatial-support-enhancements)
- [MongoDB Geospatial Indexing](https://www.mongodb.com/docs/manual/core/geospatial-indexes/)

Specifies a `$geometry` condition

#### Example:

    const polyA = [[[ 10, 20 ], [ 10, 40 ], [ 30, 40 ], [ 30, 20 ]]]
    query.where('loc').within().geometry({ type: 'Polygon', coordinates: polyA })

    // or
    const polyB = [[ 0, 0 ], [ 1, 1 ]]
    query.where('loc').within().geometry({ type: 'LineString', coordinates: polyB })

    // or
    const polyC = [ 0, 0 ]
    query.where('loc').within().geometry({ type: 'Point', coordinates: polyC })

    // or
    query.where('loc').intersects().geometry({ type: 'Point', coordinates: polyC })

The argument is assigned to the most recent path passed to `where()`.

#### Note:

`geometry()` **must** come after either `intersects()` or `within()`.

The `object` argument must contain `type` and `coordinates` properties.
- type {String}
- coordinates {Array}

## `Query.prototype.get()`

### Parameters

- `path` \<string|object\> path or object of key/value pairs to get

### Returns

- \<Query\> this

For update operations, returns the value of a path in the update's `$set`.
Useful for writing getters/setters that can work with both update operations
and `save()`.

#### Example:

    const query = Model.updateOne({}, { $set: { name: 'Jean-Luc Picard' } });
    query.get('name'); // 'Jean-Luc Picard'

## `Query.prototype.getFilter()`

### Returns

- \<object\> current query filter

Returns the current query filter (also known as conditions) as a [POJO](https://masteringjs.io/tutorials/fundamentals/pojo).

#### Example:

    const query = new Query();
    query.find({ a: 1 }).where('b').gt(2);
    query.getFilter(); // { a: 1, b: { $gt: 2 } }

## `Query.prototype.getOptions()`

### Returns

- \<object\> the options

Gets query options.

#### Example:

    const query = new Query();
    query.limit(10);
    query.setOptions({ maxTimeMS: 1000 });
    query.getOptions(); // { limit: 10, maxTimeMS: 1000 }

## `Query.prototype.getPopulatedPaths()`

### Returns

- \<Array\> an array of strings representing populated paths

Gets a list of paths to be populated by this query

#### Example:

     bookSchema.pre('findOne', function() {
       let keys = this.getPopulatedPaths(); // ['author']
     });
     ...
     Book.findOne({}).populate('author');

#### Example:

     // Deep populate
     const q = L1.find().populate({
       path: 'level2',
       populate: { path: 'level3' }
     });
     q.getPopulatedPaths(); // ['level2', 'level2.level3']

## `Query.prototype.getQuery()`

### Returns

- \<object\> current query filter

Returns the current query filter. Equivalent to `getFilter()`.

You should use `getFilter()` instead of `getQuery()` where possible. `getQuery()`
will likely be deprecated in a future release.

#### Example:

    const query = new Query();
    query.find({ a: 1 }).where('b').gt(2);
    query.getQuery(); // { a: 1, b: { $gt: 2 } }

## `Query.prototype.getUpdate()`

### Returns

- \<object\> current update operations

Returns the current update operations as a JSON object.

#### Example:

    const query = new Query();
    query.updateOne({}, { $set: { a: 5 } });
    query.getUpdate(); // { $set: { a: 5 } }

## `Query.prototype.gt()`

### Parameters

- `[path]` \<string\>
- `val` \<number\>

### See

- [$gt](https://www.mongodb.com/docs/manual/reference/operator/gt/)

Specifies a `$gt` query condition.

When called with one argument, the most recent path passed to `where()` is used.

#### Example:

    Thing.find().where('age').gt(21);

    // or
    Thing.find().gt('age', 21);

## `Query.prototype.gte()`

### Parameters

- `[path]` \<string\>
- `val` \<number\>

### See

- [$gte](https://www.mongodb.com/docs/manual/reference/operator/gte/)

Specifies a `$gte` query condition.

When called with one argument, the most recent path passed to `where()` is used.

## `Query.prototype.hint()`

### Parameters

- `val` \<object\> a hint object

### Returns

- \<Query\> this

### See

- [$hint](https://www.mongodb.com/docs/manual/reference/operator/hint/)

Sets query hints.

#### Example:

    query.hint({ indexA: 1, indexB: -1 });

#### Note:

Cannot be used with `distinct()`

## `Query.prototype.in()`

### Parameters

- `[path]` \<string\>
- `val` \<Array\>

### See

- [$in](https://www.mongodb.com/docs/manual/reference/operator/in/)

Specifies an `$in` query condition.

When called with one argument, the most recent path passed to `where()` is used.

## `Query.prototype.intersects()`

### Parameters

- `[arg]` \<object\>

### Returns

- \<Query\> this

### See

- [$geometry](https://www.mongodb.com/docs/manual/reference/operator/geometry/)
- [geoIntersects](https://www.mongodb.com/docs/manual/reference/operator/geoIntersects/)

Declares an intersects query for `geometry()`.

#### Example:

    query.where('path').intersects().geometry({
      type: 'LineString',
      coordinates: [[180.0, 11.0], [180, 9.0]]
    });

    query.where('path').intersects({
      type: 'LineString',
      coordinates: [[180.0, 11.0], [180, 9.0]]
    });

#### Note:

**MUST** be used after `where()`.

#### Note:

In Mongoose 3.7, `intersects` changed from a getter to a function. If you need the old syntax, use [this](https://github.com/ebensing/mongoose-within).

## `Query.prototype.isPathSelectedInclusive()`

### Parameters

- `path` \<string\>

### Returns

- \<boolean\>

Wrapper function to call isPathSelectedInclusive on a query.

## `Query.prototype.j()`

### Parameters

- `val` \<boolean\>

### Returns

- \<Query\> this

### See

- [mongodb](https://www.mongodb.com/docs/manual/reference/write-concern/#j-option)

Requests acknowledgement that this operation has been persisted to MongoDB's
on-disk journal.
This option is only valid for operations that write to the database:

- `deleteOne()`
- `deleteMany()`
- `findOneAndDelete()`
- `findOneAndReplace()`
- `findOneAndUpdate()`
- `updateOne()`
- `updateMany()`

Defaults to the schema's [`writeConcern.j` option](https://mongoosejs.com/docs/guide.html#writeConcern)

#### Example:

    await mongoose.model('Person').deleteOne({ name: 'Ned Stark' }).j(true);

## `Query.prototype.lean()`

### Parameters

- `bool` \<boolean|object\> defaults to true

### Returns

- \<Query\> this

Sets the lean option.

Documents returned from queries with the `lean` option enabled are plain
javascript objects, not [Mongoose Documents](https://mongoosejs.com/docs/api/document.md). They have no
`save` method, getters/setters, virtuals, or other Mongoose features.

#### Example:

    new Query().lean() // true
    new Query().lean(true)
    new Query().lean(false)

    const docs = await Model.find().lean();
    docs[0] instanceof mongoose.Document; // false

[Lean is great for high-performance, read-only cases](https://mongoosejs.com/docs/tutorials/lean.html),
especially when combined
with [cursors](https://mongoosejs.com/docs/queries.html#streaming).

If you need virtuals, getters/setters, or defaults with `lean()`, you need
to use a plugin. See:

- [mongoose-lean-virtuals](https://plugins.mongoosejs.io/plugins/lean-virtuals)
- [mongoose-lean-getters](https://plugins.mongoosejs.io/plugins/lean-getters)
- [mongoose-lean-defaults](https://www.npmjs.com/package/mongoose-lean-defaults)

## `Query.prototype.limit()`

### Parameters

- `val` \<number\>

Specifies the maximum number of documents the query will return.

#### Example:

    query.limit(20);

#### Note:

Cannot be used with `distinct()`

## `Query.prototype.lt()`

### Parameters

- `[path]` \<string\>
- `val` \<number\>

### See

- [$lt](https://www.mongodb.com/docs/manual/reference/operator/lt/)

Specifies a `$lt` query condition.

When called with one argument, the most recent path passed to `where()` is used.

## `Query.prototype.lte()`

### Parameters

- `[path]` \<string\>
- `val` \<number\>

### See

- [$lte](https://www.mongodb.com/docs/manual/reference/operator/lte/)

Specifies a `$lte` query condition.

When called with one argument, the most recent path passed to `where()` is used.

## `Query.prototype.maxDistance()`

### Parameters

- `[path]` \<string\>
- `val` \<number\>

### See

- [$maxDistance](https://www.mongodb.com/docs/manual/reference/operator/maxDistance/)

Specifies a `maxDistance` query condition.

When called with one argument, the most recent path passed to `where()` is used.

## `Query.prototype.maxTimeMS()`

### Parameters

- `[ms]` \<number\> The number of milliseconds

### Returns

- \<Query\> this

Sets the [maxTimeMS](https://www.mongodb.com/docs/manual/reference/method/cursor.maxTimeMS/)
option. This will tell the MongoDB server to abort if the query or write op
has been running for more than `ms` milliseconds.

Calling `query.maxTimeMS(v)` is equivalent to `query.setOptions({ maxTimeMS: v })`

#### Example:

    const query = new Query();
    // Throws an error 'operation exceeded time limit' as long as there's
    // >= 1 doc in the queried collection
    const res = await query.find({ $where: 'sleep(1000) || true' }).maxTimeMS(100);

## `Query.prototype.merge()`

### Parameters

- `source` \<Query|object\>

### Returns

- \<Query\> this

Merges another Query or conditions object into this one.

When a Query is passed, conditions, field selection and options are merged.

## `Query.prototype.mod()`

### Parameters

- `[path]` \<string\>
- `val` \<Array\> must be of length 2, first element is `divisor`, 2nd element is `remainder`.

### Returns

- \<Query\> this

### See

- [$mod](https://www.mongodb.com/docs/manual/reference/operator/mod/)

Specifies a `$mod` condition, filters documents for documents whose
`path` property is a number that is equal to `remainder` modulo `divisor`.

#### Example:

    // All find products whose inventory is odd
    Product.find().mod('inventory', [2, 1]);
    Product.find().where('inventory').mod([2, 1]);
    // This syntax is a little strange, but supported.
    Product.find().where('inventory').mod(2, 1);

## `Query.prototype.model`

### Type

- \<property\>

The model this query is associated with.

#### Example:

    const q = MyModel.find();
    q.model === MyModel; // true

## `Query.prototype.mongooseOptions()`

### Parameters

- `options` \<object\> if specified, overwrites the current options

### Returns

- \<object\> the options

Getter/setter around the current mongoose-specific options for this query
Below are the current Mongoose-specific options.

- `populate`: an array representing what paths will be populated. Should have one entry for each call to [`Query.prototype.populate()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.populate())
- `lean`: if truthy, Mongoose will not [hydrate](https://mongoosejs.com/docs/api/model.md#Model.hydrate()) any documents that are returned from this query. See [`Query.prototype.lean()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.lean()) for more information.
- `strict`: controls how Mongoose handles keys that aren't in the schema for updates. This option is `true` by default, which means Mongoose will silently strip any paths in the update that aren't in the schema. See the [`strict` mode docs](https://mongoosejs.com/docs/guide.html#strict) for more information.
- `strictQuery`: controls how Mongoose handles keys that aren't in the schema for the query `filter`. This option is `false` by default, which means Mongoose will allow `Model.find({ foo: 'bar' })` even if `foo` is not in the schema. See the [`strictQuery` docs](https://mongoosejs.com/docs/guide.html#strictQuery) for more information.
- `nearSphere`: use `$nearSphere` instead of `near()`. See the [`Query.prototype.nearSphere()` docs](https://mongoosejs.com/docs/api/query.md#Query.prototype.nearSphere())
- `schemaLevelProjections`: if `false`, Mongoose will not apply schema-level `select: false` or `select: true` for this query
- `cloneUpdate`: if `false`, Mongoose will not clone updates before executing the query

Mongoose maintains a separate object for internal options because
Mongoose sends `Query.prototype.options` to the MongoDB server, and the
above options are not relevant for the MongoDB server.

## `Query.prototype.ne()`

### Parameters

- `[path]` \<string\>
- `val` \<any\>

### See

- [$ne](https://www.mongodb.com/docs/manual/reference/operator/ne/)

Specifies a `$ne` query condition.

When called with one argument, the most recent path passed to `where()` is used.

## `Query.prototype.near()`

### Parameters

- `[path]` \<string\>
- `val` \<object\>

### Returns

- \<Query\> this

### See

- [$near](https://www.mongodb.com/docs/manual/reference/operator/near/)
- [$nearSphere](https://www.mongodb.com/docs/manual/reference/operator/nearSphere/)
- [$maxDistance](https://www.mongodb.com/docs/manual/reference/operator/maxDistance/)
- [MongoDB Geospatial Indexing](https://www.mongodb.com/docs/manual/core/geospatial-indexes/)

Specifies a `$near` or `$nearSphere` condition

These operators return documents sorted by distance.

#### Example:

    query.where('loc').near({ center: [10, 10] });
    query.where('loc').near({ center: [10, 10], maxDistance: 5 });
    query.where('loc').near({ center: [10, 10], maxDistance: 5, spherical: true });
    query.near('loc', { center: [10, 10], maxDistance: 5 });

## `Query.prototype.nearSphere()`

Deprecated.

### See

- [near()](https://mongoosejs.com/docs/api/query.md#Query.prototype.near())
- [$near](https://www.mongodb.com/docs/manual/reference/operator/near/)
- [$nearSphere](https://www.mongodb.com/docs/manual/reference/operator/nearSphere/)
- [$maxDistance](https://www.mongodb.com/docs/manual/reference/operator/maxDistance/)

_DEPRECATED_ Specifies a `$nearSphere` condition

#### Example:

    query.where('loc').nearSphere({ center: [10, 10], maxDistance: 5 });

**Deprecated.** Use `query.near()` instead with the `spherical` option set to `true`.

#### Example:

    query.where('loc').near({ center: [10, 10], spherical: true });

## `Query.prototype.nin()`

### Parameters

- `[path]` \<string\>
- `val` \<Array\>

### See

- [$nin](https://www.mongodb.com/docs/manual/reference/operator/nin/)

Specifies an `$nin` query condition.

When called with one argument, the most recent path passed to `where()` is used.

## `Query.prototype.nor()`

### Parameters

- `array` \<Array\> array of conditions

### Returns

- \<Query\> this

### See

- [$nor](https://www.mongodb.com/docs/manual/reference/operator/nor/)

Specifies arguments for a `$nor` condition.

#### Example:

    query.nor([{ color: 'green' }, { status: 'ok' }]);

## `Query.prototype.or()`

### Parameters

- `array` \<Array\> array of conditions

### Returns

- \<Query\> this

### See

- [$or](https://www.mongodb.com/docs/manual/reference/operator/or/)

Specifies arguments for an `$or` condition.

#### Example:

    query.or([{ color: 'red' }, { status: 'emergency' }]);

## `Query.prototype.orFail()`

### Parameters

- `[err]` \<Function|Error\> optional error to throw if no docs match `filter`. If not specified, `orFail()` will throw a `DocumentNotFoundError`

### Returns

- \<Query\> this

Make this query throw an error if no documents match the given `filter`.
This is handy for integrating with async/await, because `orFail()` saves you
an extra `if` statement to check if no document was found.

#### Example:

    // Throws if no doc returned
    await Model.findOne({ foo: 'bar' }).orFail();

    // Throws if no document was updated. Note that `orFail()` will still
    // throw if the only document that matches is `{ foo: 'bar', name: 'test' }`,
    // because `orFail()` will throw if no document was _updated_, not
    // if no document was _found_.
    await Model.updateOne({ foo: 'bar' }, { name: 'test' }).orFail();

    // Throws "No docs found!" error if no docs match `{ foo: 'bar' }`
    await Model.find({ foo: 'bar' }).orFail(new Error('No docs found!'));

    // Throws "Not found" error if no document was found
    await Model.findOneAndUpdate({ foo: 'bar' }, { name: 'test' }).
      orFail(() => Error('Not found'));

## `Query.prototype.polygon()`

### Parameters

- `[path]` \<string|Array\>
- `[...coordinatePairs]` \<Array|object\>

### Returns

- \<Query\> this

### See

- [$polygon](https://www.mongodb.com/docs/manual/reference/operator/polygon/)
- [MongoDB Geospatial Indexing](https://www.mongodb.com/docs/manual/core/geospatial-indexes/)

Specifies a `$polygon` condition

#### Example:

    query.where('loc').within().polygon([10, 20], [13, 25], [7, 15]);
    query.polygon('loc', [10, 20], [13, 25], [7, 15]);

## `Query.prototype.populate()`

### Parameters

- `path` \<object|string|Array<string>\> either the path(s) to populate or an object specifying all parameters
- `[select]` \<object|string\> Field selection for the population query
- `[model]` \<Model\> The model you wish to use for population. If not specified, populate will look up the model by the name in the Schema's `ref` field.
- `[match]` \<object\> Conditions for the population query
- `[options]` \<object\> Options for the population query (sort, etc)
- `[options.path=null]` \<string\> The path to populate.
- `[options.populate=null]` \<string|PopulateOptions\> Recursively populate paths in the populated documents. See [deep populate docs](https://mongoosejs.com/docs/populate.html#deep-populate).
- `[options.retainNullValues=false]` \<boolean\> by default, Mongoose removes null and undefined values from populated arrays. Use this option to make `populate()` retain `null` and `undefined` array entries.
- `[options.getters=false]` \<boolean\> if true, Mongoose will call any getters defined on the `localField`. By default, Mongoose gets the raw value of `localField`. For example, you would need to set this option to `true` if you wanted to [add a `lowercase` getter to your `localField`](https://mongoosejs.com/docs/schematypes.html#schematype-options).
- `[options.clone=false]` \<boolean\> When you do `BlogPost.find().populate('author')`, blog posts with the same author will share 1 copy of an `author` doc. Enable this option to make Mongoose clone populated docs before assigning them.
- `[options.match=null]` \<object|Function\> Add an additional filter to the populate query. Can be a filter object containing [MongoDB query syntax](https://www.mongodb.com/docs/manual/tutorial/query-documents/), or a function that returns a filter object.
- `[options.skipInvalidIds=false]` \<boolean\> By default, Mongoose throws a cast error if `localField` and `foreignField` schemas don't line up. If you enable this option, Mongoose will instead filter out any `localField` properties that cannot be casted to `foreignField`'s schema type.
- `[options.perDocumentLimit=null]` \<number\> For legacy reasons, `limit` with `populate()` may give incorrect results because it only executes a single query for every document being populated. If you set `perDocumentLimit`, Mongoose will ensure correct `limit` per document by executing a separate query for each document to `populate()`. For example, `.find().populate({ path: 'test', perDocumentLimit: 2 })` will execute 2 additional queries if `.find()` returns 2 documents.
- `[options.strictPopulate=true]` \<boolean\> Set to false to allow populating paths that aren't defined in the given model's schema.
- `[options.transform=null]` \<Function\> Function that Mongoose will call on every populated document that allows you to transform the populated document.
- `[options.options=null]` \<object\> Additional options like `limit` and `lean`.
- `[options.ordered=false]` \<boolean\> Set to `true` to execute any populate queries one at a time, as opposed to in parallel. Set this option to `true` if populating multiple paths or paths with multiple models in transactions.

### Returns

- \<Query\> this

### See

- [population](https://mongoosejs.com/docs/populate.html)
- [Query#select](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())
- [Model.populate](https://mongoosejs.com/docs/api/model.md#Model.populate())

Specifies paths which should be populated with other documents.

#### Example:

    let book = await Book.findOne().populate('authors');
    book.title; // 'Node.js in Action'
    book.authors[0].name; // 'TJ Holowaychuk'
    book.authors[1].name; // 'Nathan Rajlich'

    let books = await Book.find().populate({
      path: 'authors',
      // `match` and `sort` apply to the Author model,
      // not the Book model. These options do not affect
      // which documents are in `books`, just the order and
      // contents of each book document's `authors`.
      match: { name: new RegExp('.*h.*', 'i') },
      sort: { name: -1 }
    });
    books[0].title; // 'Node.js in Action'
    // Each book's `authors` are sorted by name, descending.
    books[0].authors[0].name; // 'TJ Holowaychuk'
    books[0].authors[1].name; // 'Marc Harter'

    books[1].title; // 'Professional AngularJS'
    // Empty array, no authors' name has the letter 'h'
    books[1].authors; // []

Paths are populated after the query executes and a response is received. A
separate query is then executed for each path specified for population. After
a response for each query has also been returned, the results are passed to
the callback.

## `Query.prototype.post()`

### Parameters

- `fn` \<Function\>

### Returns

- \<Promise\>

Add post [middleware](https://mongoosejs.com/docs/middleware.html) to this query instance. Doesn't affect
other queries.

#### Example:

    const q1 = Question.find({ answer: 42 });
    q1.post(function middleware() {
      console.log(this.getFilter());
    });
    await q1.exec(); // Prints "{ answer: 42 }"

    // Doesn't print anything, because `middleware()` is only
    // registered on `q1`.
    await Question.find({ answer: 42 });

## `Query.prototype.pre()`

### Parameters

- `fn` \<Function\>

### Returns

- \<Promise\>

Add pre [middleware](https://mongoosejs.com/docs/middleware.html) to this query instance. Doesn't affect
other queries.

#### Example:

    const q1 = Question.find({ answer: 42 });
    q1.pre(function middleware() {
      console.log(this.getFilter());
    });
    await q1.exec(); // Prints "{ answer: 42 }"

    // Doesn't print anything, because `middleware()` is only
    // registered on `q1`.
    await Question.find({ answer: 42 });

## `Query.prototype.projection()`

### Parameters

- `arg` \<object|null\>

### Returns

- \<object\> the current projection

Get/set the current projection (AKA fields). Pass `null` to remove the
current projection.

Unlike `projection()`, the `select()` function modifies the current
projection in place. This function overwrites the existing projection.

#### Example:

    const q = Model.find();
    q.projection(); // null

    q.select('a b');
    q.projection(); // { a: 1, b: 1 }

    q.projection({ c: 1 });
    q.projection(); // { c: 1 }

    q.projection(null);
    q.projection(); // null

## `Query.prototype.read()`

### Parameters

- `mode` \<string\> one of the listed preference options or aliases
- `[tags]` \<Array\> optional tags for this query

### Returns

- \<Query\> this

### See

- [mongodb](https://www.mongodb.com/docs/manual/applications/replication/#read-preference)

Determines the MongoDB nodes from which to read.

#### Preferences:

```
primary - (default) Read from primary only. Operations will produce an error if primary is unavailable. Cannot be combined with tags.
secondary            Read from secondary if available, otherwise error.
primaryPreferred     Read from primary if available, otherwise a secondary.
secondaryPreferred   Read from a secondary if available, otherwise read from the primary.
nearest              All operations read from among the nearest candidates, but unlike other modes, this option will include both the primary and all secondaries in the random selection.
```

Aliases

```
p   primary
pp  primaryPreferred
s   secondary
sp  secondaryPreferred
n   nearest
```

#### Example:

    new Query().read('primary')
    new Query().read('p')  // same as primary

    new Query().read('primaryPreferred')
    new Query().read('pp') // same as primaryPreferred

    new Query().read('secondary')
    new Query().read('s')  // same as secondary

    new Query().read('secondaryPreferred')
    new Query().read('sp') // same as secondaryPreferred

    new Query().read('nearest')
    new Query().read('n')  // same as nearest

    // read from secondaries with matching tags
    new Query().read('s', [{ dc:'sf', s: 1 },{ dc:'ma', s: 2 }])

Read more about how to use read preferences [here](https://www.mongodb.com/docs/manual/applications/replication/#read-preference).

## `Query.prototype.readConcern()`

### Parameters

- `level` \<'local' | 'available' | 'majority' | 'snapshot' | 'linearizable' | 'l' | 'a' | 'm' | 's' | 'lz'\> one of the listed read concern level or their aliases

### Returns

- \<Query\> this

### See

- [mongodb](https://www.mongodb.com/docs/manual/reference/read-concern/)

Sets the readConcern option for the query.

#### Example:

    new Query().readConcern('local')
    new Query().readConcern('l')  // same as local

    new Query().readConcern('available')
    new Query().readConcern('a')  // same as available

    new Query().readConcern('majority')
    new Query().readConcern('m')  // same as majority

    new Query().readConcern('linearizable')
    new Query().readConcern('lz') // same as linearizable

    new Query().readConcern('snapshot')
    new Query().readConcern('s')  // same as snapshot


#### Read Concern Level:

```
local         MongoDB 3.2+ The query returns from the instance with no guarantee guarantee that the data has been written to a majority of the replica set members (i.e. may be rolled back).
available     MongoDB 3.6+ The query returns from the instance with no guarantee guarantee that the data has been written to a majority of the replica set members (i.e. may be rolled back).
majority      MongoDB 3.2+ The query returns the data that has been acknowledged by a majority of the replica set members. The documents returned by the read operation are durable, even in the event of failure.
linearizable  MongoDB 3.4+ The query returns data that reflects all successful majority-acknowledged writes that completed prior to the start of the read operation. The query may wait for concurrently executing writes to propagate to a majority of replica set members before returning results.
snapshot      MongoDB 4.0+ Only available for operations within multi-document transactions. Upon transaction commit with write concern "majority", the transaction operations are guaranteed to have read from a snapshot of majority-committed data.
```

Aliases

```
l   local
a   available
m   majority
lz  linearizable
s   snapshot
```

Read more about how to use read concern [here](https://www.mongodb.com/docs/manual/reference/read-concern/).

## `Query.prototype.regex()`

### Parameters

- `[path]` \<string\>
- `val` \<string|RegExp\>

### See

- [$regex](https://www.mongodb.com/docs/manual/reference/operator/regex/)

Specifies a `$regex` query condition.

When called with one argument, the most recent path passed to `where()` is used.

## `Query.prototype.replaceOne()`

### Parameters

- `[filter]` \<object\>
- `[doc]` \<object\> the update command
- `[options]` \<object\>
- `[options.cloneUpdate=true]` \<boolean\> if `false`, Mongoose will not clone the update before executing the query
- `[options.multipleCastError]` \<boolean\> by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.upsert=false]` \<boolean\> if true, and no documents found, insert a new document
- `[options.writeConcern=null]` \<object\> sets the [write concern](https://www.mongodb.com/docs/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](https://mongoosejs.com/docs/guide.html#writeConcern)
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Does nothing if schema-level timestamps are not set.
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.
- `[options.requireFilter=false]` \<boolean\> If true, throws an error if the filter is empty (`{}`)

### Returns

- \<Query\> this

### See

- [Model.update](https://mongoosejs.com/docs/api/model.md#Model.update())
- [Query docs](https://mongoosejs.com/docs/queries.html)
- [update](https://www.mongodb.com/docs/manual/reference/method/db.collection.update/)
- [UpdateResult](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/UpdateResult.html)
- [MongoDB docs](https://www.mongodb.com/docs/manual/reference/command/update/#update-command-output)

Declare and/or execute this query as a replaceOne() operation.
MongoDB will replace the existing document and will not accept any [atomic operators](https://www.mongodb.com/docs/manual/tutorial/model-data-for-atomic-operations/#pattern) (`$set`, etc.)

**Note** replaceOne will _not_ fire update middleware. Use `pre('replaceOne')`
and `post('replaceOne')` instead.

#### Example:

    const res = await Person.replaceOne({ _id: 24601 }, { name: 'Jean Valjean' });
    res.acknowledged; // Indicates if this write result was acknowledged. If not, then all other members of this result will be undefined.
    res.matchedCount; // Number of documents that matched the filter
    res.modifiedCount; // Number of documents that were modified
    res.upsertedCount; // Number of documents that were upserted
    res.upsertedId; // Identifier of the inserted document (if an upsert took place)

This function triggers the following middleware.

- `replaceOne()`

## `Query.prototype.sanitizeProjection()`

### Parameters

- `value` \<boolean\>

### Returns

- \<Query\> this

### See

- [sanitizeProjection](https://thecodebarbarian.com/whats-new-in-mongoose-5-13-sanitizeprojection.html)

Sets this query's `sanitizeProjection` option. If set, `sanitizeProjection` does
two things:

1. Enforces that projection values are numbers, not strings.
2. Prevents using `+` syntax to override properties that are deselected by default.

With `sanitizeProjection()`, you can pass potentially untrusted user data to `.select()`.

#### Example

    const userSchema = new Schema({
      name: String,
      password: { type: String, select: false }
    });
    const UserModel = mongoose.model('User', userSchema);
    const { _id } = await UserModel.create({ name: 'John', password: 'secret' })

    // The MongoDB server has special handling for string values that start with '$'
    // in projections, which can lead to unexpected leaking of sensitive data.
    let doc = await UserModel.findOne().select({ name: '$password' });
    doc.name; // 'secret'
    doc.password; // undefined

    // With `sanitizeProjection`, Mongoose forces all projection values to be numbers
    doc = await UserModel.findOne().sanitizeProjection(true).select({ name: '$password' });
    doc.name; // 'John'
    doc.password; // undefined

    // By default, Mongoose supports projecting in `password` using `+password`
    doc = await UserModel.findOne().select('+password');
    doc.password; // 'secret'

    // With `sanitizeProjection`, Mongoose prevents projecting in `password` and other
    // fields that have `select: false` in the schema.
    doc = await UserModel.findOne().sanitizeProjection(true).select('+password');
    doc.password; // undefined

## `Query.prototype.schemaLevelProjections()`

### Parameters

- `value` \<boolean\>

### Returns

- \<Query\> this

### See

- [SchemaTypeOptions](https://mongoosejs.com/docs/schematypes.html#all-schema-types)

Enable or disable schema level projections for this query. Enabled by default.
Set to `false` to include fields with `select: false` in the query result by default.

#### Example:

    const userSchema = new Schema({
      email: { type: String, required: true },
      passwordHash: { type: String, select: false, required: true }
    });
    const UserModel = mongoose.model('User', userSchema);

    const doc = await UserModel.findOne().orFail().schemaLevelProjections(false);

    // Contains password hash, because `schemaLevelProjections()` overrides `select: false`
    doc.passwordHash;

## `Query.prototype.select()`

### Parameters

- `arg` \<object|string|Array<string>\>

### Returns

- \<Query\> this

### See

- [SchemaType](https://mongoosejs.com/docs/api/schematype.md)

Specifies which document fields to include or exclude (also known as the query "projection")

When using string syntax, prefixing a path with `-` will flag that path as excluded. When a path does not have the `-` prefix, it is included. Lastly, if a path is prefixed with `+`, it forces inclusion of the path, which is useful for paths excluded at the [schema level](https://mongoosejs.com/docs/api/schematype.md#SchemaType.prototype.select()).

A projection _must_ be either inclusive or exclusive. In other words, you must
either list the fields to include (which excludes all others), or list the fields
to exclude (which implies all other fields are included). The [`_id` field is the only exception because MongoDB includes it by default](https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/#suppress-id-field).

#### Example:

    // include a and b, exclude other fields
    query.select('a b');
    // Equivalent syntaxes:
    query.select(['a', 'b']);
    query.select({ a: 1, b: 1 });

    // exclude c and d, include other fields
    query.select('-c -d');

    // Use `+` to override schema-level `select: false` without making the
    // projection inclusive.
    const schema = new Schema({
      foo: { type: String, select: false },
      bar: String
    });
    // ...
    query.select('+foo'); // Override foo's `select: false` without excluding `bar`

    // or you may use object notation, useful when
    // you have keys already prefixed with a "-"
    query.select({ a: 1, b: 1 });
    query.select({ c: 0, d: 0 });

    Additional calls to select can override the previous selection:
    query.select({ a: 1, b: 1 }).select({ b: 0 }); // selection is now { a: 1 }
    query.select({ a: 0, b: 0 }).select({ b: 1 }); // selection is now { a: 0 }

## `Query.prototype.selected()`

### Returns

- \<boolean\>

Determines if field selection has been made.

## `Query.prototype.selectedExclusively()`

### Returns

- \<boolean\>

Determines if exclusive field selection has been made.

    query.selectedExclusively(); // false
    query.select('-name');
    query.selectedExclusively(); // true
    query.selectedInclusively(); // false

## `Query.prototype.selectedInclusively()`

### Returns

- \<boolean\>

Determines if inclusive field selection has been made.

    query.selectedInclusively(); // false
    query.select('name');
    query.selectedInclusively(); // true

## `Query.prototype.session()`

### Parameters

- `[session]` \<ClientSession\> from `await conn.startSession()`

### Returns

- \<Query\> this

### See

- [Connection.prototype.startSession()](https://mongoosejs.com/docs/api/connection.md#Connection.prototype.startSession())
- [mongoose.startSession()](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.startSession())

Sets the [MongoDB session](https://www.mongodb.com/docs/manual/reference/server-sessions/)
associated with this query. Sessions are how you mark a query as part of a
[transaction](https://mongoosejs.com/docs/transactions.html).

Calling `session(null)` removes the session from this query.

#### Example:

    const s = await mongoose.startSession();
    await mongoose.model('Person').findOne({ name: 'Axl Rose' }).session(s);

## `Query.prototype.set()`

### Parameters

- `path` \<string|object\> path or object of key/value pairs to set
- `[val]` \<any\> the value to set

### Returns

- \<Query\> this

Adds a `$set` to this query's update without changing the operation.
This is useful for query middleware so you can add an update regardless
of whether you use `updateOne()`, `updateMany()`, `findOneAndUpdate()`, etc.

#### Example:

    // Updates `{ $set: { updatedAt: new Date() } }`
    new Query().updateOne({}, {}).set('updatedAt', new Date());
    new Query().updateMany({}, {}).set({ updatedAt: new Date() });

## `Query.prototype.setOptions()`

### Parameters

- `options` \<object\>

### Returns

- \<Query\> this

Sets query options. Some options only make sense for certain operations.

#### Options:

The following options are only for `find()`:

- [tailable](https://www.mongodb.com/docs/manual/core/tailable-cursors/)
- [limit](https://www.mongodb.com/docs/manual/reference/method/cursor.limit/)
- [skip](https://www.mongodb.com/docs/manual/reference/method/cursor.skip/)
- [allowDiskUse](https://www.mongodb.com/docs/manual/reference/method/cursor.allowDiskUse/)
- [batchSize](https://www.mongodb.com/docs/manual/reference/method/cursor.batchSize/)
- [readPreference](https://www.mongodb.com/docs/manual/applications/replication/#read-preference)
- [hint](https://www.mongodb.com/docs/manual/reference/method/cursor.hint/)
- [comment](https://www.mongodb.com/docs/manual/reference/method/cursor.comment/)

The following options are only for write operations: `updateOne()`, `updateMany()`, `replaceOne()`, `findOneAndUpdate()`, and `findByIdAndUpdate()`:

- [upsert](https://www.mongodb.com/docs/manual/reference/method/db.collection.update/)
- [writeConcern](https://www.mongodb.com/docs/manual/reference/method/db.collection.update/)
- [timestamps](https://mongoosejs.com/docs/guide.html#timestamps): If `timestamps` is set in the schema, set this option to `false` to skip timestamps for that particular update. Has no effect if `timestamps` is not enabled in the schema options.
- cloneUpdate: set to `false` to skip cloning the update before executing the query.
- overwriteDiscriminatorKey: allow setting the discriminator key in the update. Will use the correct discriminator schema if the update changes the discriminator key.
- overwriteImmutable: allow overwriting properties that are set to `immutable` in the schema. Defaults to false.

The following options are only for `find()`, `findOne()`, `findById()`, `findOneAndUpdate()`, `findOneAndReplace()`, `findOneAndDelete()`, and `findByIdAndUpdate()`:

- [lean](https://mongoosejs.com/docs/api/query.md#Query.prototype.lean())
- [populate](https://mongoosejs.com/docs/populate.html)
- [projection](https://mongoosejs.com/docs/api/query.md#Query.prototype.projection())
- sanitizeProjection
- useBigInt64
- defaults: if `false`, skip applying default values to the returned document(s). Defaults to true.

The following options are only for all operations **except** `updateOne()`, `updateMany()`, `deleteOne()`, and `deleteMany()`:

- [maxTimeMS](https://www.mongodb.com/docs/manual/reference/operator/meta/maxTimeMS/)

The following options are for `find()`, `findOne()`, `findOneAndUpdate()`, `findOneAndDelete()`, `updateOne()`, and `deleteOne()`:

- [sort](https://www.mongodb.com/docs/manual/reference/method/cursor.sort/)

The following options are for `findOneAndUpdate()` and `findOneAndDelete()`

- includeResultMetadata

The following options are for all operations:

- [strict](https://mongoosejs.com/docs/guide.html#strict)
- [collation](https://www.mongodb.com/docs/manual/reference/collation/)
- [session](https://www.mongodb.com/docs/manual/reference/server-sessions/)
- [explain](https://www.mongodb.com/docs/manual/reference/method/cursor.explain/)
- [middleware](https://mongoosejs.com/docs/middleware.html#skipping): set to `false` to skip all user-defined middleware, or `{ pre: false }` / `{ post: false }` to skip only pre or post hooks

## `Query.prototype.setQuery()`

### Parameters

- `new` \<object\> query conditions

### Returns

- \<undefined,void\>

Sets the query conditions to the provided JSON object.

#### Example:

    const query = new Query();
    query.find({ a: 1 })
    query.setQuery({ a: 2 });
    query.getQuery(); // { a: 2 }

## `Query.prototype.setUpdate()`

### Parameters

- `new` \<object\> update operation
- `[cloneUpdate=true]` \<boolean\> if `false`, Mongoose will not clone the update

### Returns

- \<undefined,void\>

Sets the current update operation to new value.

#### Example:

    const query = new Query();
    query.updateOne({}, { $set: { a: 5 } });
    query.setUpdate({ $set: { b: 6 } });
    query.getUpdate(); // { $set: { b: 6 } }

## `Query.prototype.size()`

### Parameters

- `[path]` \<string\>
- `val` \<number\>

### See

- [$size](https://www.mongodb.com/docs/manual/reference/operator/size/)

Specifies a `$size` query condition.

When called with one argument, the most recent path passed to `where()` is used.

#### Example:

    const docs = await MyModel.where('tags').size(0).exec();
    assert(Array.isArray(docs));
    console.log('documents with 0 tags', docs);

## `Query.prototype.skip()`

### Parameters

- `val` \<number\>

### See

- [cursor.skip](https://www.mongodb.com/docs/manual/reference/method/cursor.skip/)

Specifies the number of documents to skip.

#### Example:

    query.skip(100).limit(20);

#### Note:

Cannot be used with `distinct()`

## `Query.prototype.slice()`

### Parameters

- `[path]` \<string\>
- `val` \<number|Array\> number of elements to slice or array with number of elements to skip and number of elements to slice

### Returns

- \<Query\> this

### See

- [mongodb](https://www.mongodb.com/docs/manual/tutorial/query-documents/#projection)
- [$slice](https://www.mongodb.com/docs/manual/reference/projection/slice/#prj._S_slice)

Specifies a `$slice` projection for an array.

#### Example:

    query.slice('comments', 5); // Returns the first 5 comments
    query.slice('comments', -5); // Returns the last 5 comments
    query.slice('comments', [10, 5]); // Returns the first 5 comments after the 10-th
    query.where('comments').slice(5); // Returns the first 5 comments
    query.where('comments').slice([-10, 5]); // Returns the first 5 comments after the 10-th to last

**Note:** If the absolute value of the number of elements to be sliced is greater than the number of elements in the array, all array elements will be returned.

     // Given `arr`: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
     query.slice('arr', 20); // Returns [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
     query.slice('arr', -20); // Returns [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

**Note:** If the number of elements to skip is positive and greater than the number of elements in the array, an empty array will be returned.

     // Given `arr`: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
     query.slice('arr', [20, 5]); // Returns []

**Note:** If the number of elements to skip is negative and its absolute value is greater than the number of elements in the array, the starting position is the start of the array.

     // Given `arr`: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
     query.slice('arr', [-20, 5]); // Returns [1, 2, 3, 4, 5]

## `Query.prototype.sort()`

### Parameters

- `arg` \<object|string|Array<Array<string|number>>\>
- `[options]` \<object\>
- `[options.override=false]` \<boolean\> If true, replace existing sort options with `arg`

### Returns

- \<Query\> this

### See

- [cursor.sort](https://www.mongodb.com/docs/manual/reference/method/cursor.sort/)

Sets the sort order

If an object is passed, values allowed are `asc`, `desc`, `ascending`, `descending`, `1`, and `-1`.

If a string is passed, it must be a space delimited list of path names. The
sort order of each path is ascending unless the path name is prefixed with `-`
which will be treated as descending.

#### Example:

    // sort by "field" ascending and "test" descending
    query.sort({ field: 'asc', test: -1 });

    // equivalent
    query.sort('field -test');

    // also possible is to use a array with array key-value pairs
    query.sort([['field', 'asc']]);

#### Note:

Cannot be used with `distinct()`

## `Query.prototype.tailable()`

### Parameters

- `bool` \<boolean\> defaults to true
- `[opts]` \<object\> options to set
- `[opts.awaitData]` \<boolean\> false by default. Set to true to keep the cursor open even if there's no data.
- `[opts.maxAwaitTimeMS]` \<number\> the maximum amount of time for the server to wait on new documents to satisfy a tailable cursor query. Requires `tailable` and `awaitData` to be true

### See

- [tailable](https://www.mongodb.com/docs/manual/tutorial/create-tailable-cursor/)

Sets the tailable option (for use with capped collections).

#### Example:

    query.tailable(); // true
    query.tailable(true);
    query.tailable(false);

    // Set both `tailable` and `awaitData` options
    query.tailable({ awaitData: true });

#### Note:

Cannot be used with `distinct()`

## `Query.prototype.then()`

### Parameters

- `[resolve]` \<Function\>
- `[reject]` \<Function\>

### Returns

- \<Promise\>

Executes the query returning a `Promise` which will be
resolved with either the doc(s) or rejected with the error.

More about [`then()` in JavaScript](https://masteringjs.io/tutorials/fundamentals/then).

## `Query.prototype.toConstructor()`

### Returns

- \<Query\> subclass-of-Query

Converts this query to a customized, reusable query constructor with all arguments and options retained.

#### Example:

    // Create a query for adventure movies and read from the primary
    // node in the replica-set unless it is down, in which case we'll
    // read from a secondary node.
    const query = Movie.find({ tags: 'adventure' }).read('primaryPreferred');

    // create a custom Query constructor based off these settings
    const Adventure = query.toConstructor();

    // further narrow down our query results while still using the previous settings
    await Adventure().where({ name: /^Life/ }).exec();

    // since Adventure is a stand-alone constructor we can also add our own
    // helper methods and getters without impacting global queries
    Adventure.prototype.startsWith = function (prefix) {
      this.where({ name: new RegExp('^' + prefix) })
      return this;
    }
    Object.defineProperty(Adventure.prototype, 'highlyRated', {
      get: function () {
        this.where({ rating: { $gt: 4.5 }});
        return this;
      }
    })
    await Adventure().highlyRated.startsWith('Life').exec();

## `Query.prototype.transform()`

### Parameters

- `fn` \<Function\> function to run to transform the query result

### Returns

- \<Query\> this

Runs a function `fn` and treats the return value of `fn` as the new value
for the query to resolve to.

Any functions you pass to `transform()` will run **after** any post hooks.

#### Example:

    const res = await MyModel.findOne().transform(res => {
      // Sets a `loadedAt` property on the doc that tells you the time the
      // document was loaded.
      return res == null ?
        res :
        Object.assign(res, { loadedAt: new Date() });
    });

## `Query.prototype.updateMany()`

### Parameters

- `[filter]` \<object\>
- `[update]` \<object|Array\> the update command. If array, this update will be treated as an update pipeline and not casted.
- `[options]` \<object\>
- `[options.cloneUpdate=true]` \<boolean\> if `false`, Mongoose will not clone the update before executing the query
- `[options.multipleCastError]` \<boolean\> by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.upsert=false]` \<boolean\> if true, and no documents found, insert a new document
- `[options.writeConcern=null]` \<object\> sets the [write concern](https://www.mongodb.com/docs/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](https://mongoosejs.com/docs/guide.html#writeConcern)
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Does nothing if schema-level timestamps are not set.
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.
- `[options.overwriteDiscriminatorKey=false]` \<boolean\> Mongoose removes discriminator key updates from `update` by default, set `overwriteDiscriminatorKey` to `true` to allow updating the discriminator key
- `[options.overwriteImmutable=false]` \<boolean\> Mongoose removes updated immutable properties from `update` by default (excluding $setOnInsert). Set `overwriteImmutable` to `true` to allow updating immutable properties using other update operators.
- `[options.requireFilter=false]` \<boolean\> If true, throws an error if the filter is empty (`{}`)

### Returns

- \<Query\> this

### See

- [Model.update](https://mongoosejs.com/docs/api/model.md#Model.update())
- [Query docs](https://mongoosejs.com/docs/queries.html)
- [update](https://www.mongodb.com/docs/manual/reference/method/db.collection.update/)
- [UpdateResult](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/UpdateResult.html)
- [MongoDB docs](https://www.mongodb.com/docs/manual/reference/command/update/#update-command-output)

Declare and/or execute this query as an updateMany() operation.
MongoDB will update _all_ documents that match `filter` (as opposed to just the first one).

**Note** updateMany will _not_ fire update middleware. Use `pre('updateMany')`
and `post('updateMany')` instead.

#### Example:

    const res = await Person.updateMany({ name: /Stark$/ }, { isDeleted: true });
    res.n; // Number of documents matched
    res.nModified; // Number of documents modified

    // Other supported syntaxes
    await Person.find({ name: /Stark$/ }).updateMany({ isDeleted: true }); // Using chaining syntax
    await Person.find().updateMany({ isDeleted: true }); // Set `isDeleted` on _all_ Person documents

This function triggers the following middleware.

- `updateMany()`

## `Query.prototype.updateOne()`

### Parameters

- `[filter]` \<object\>
- `[update]` \<object|Array\> the update command. If array, this update will be treated as an update pipeline and not casted.
- `[options]` \<object\>
- `[options.cloneUpdate=true]` \<boolean\> if `false`, Mongoose will not clone the update before executing the query
- `[options.multipleCastError]` \<boolean\> by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.upsert=false]` \<boolean\> if true, and no documents found, insert a new document
- `[options.writeConcern=null]` \<object\> sets the [write concern](https://www.mongodb.com/docs/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](https://mongoosejs.com/docs/guide.html#writeConcern)
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.
- `[options.overwriteDiscriminatorKey=false]` \<boolean\> Mongoose removes discriminator key updates from `update` by default, set `overwriteDiscriminatorKey` to `true` to allow updating the discriminator key
- `[options.overwriteImmutable=false]` \<boolean\> Mongoose removes updated immutable properties from `update` by default (excluding $setOnInsert). Set `overwriteImmutable` to `true` to allow updating immutable properties using other update operators.
- `[options.requireFilter=false]` \<boolean\> If true, throws an error if the filter is empty (`{}`)

### Returns

- \<Query\> this

### See

- [Model.update](https://mongoosejs.com/docs/api/model.md#Model.update())
- [Query docs](https://mongoosejs.com/docs/queries.html)
- [update](https://www.mongodb.com/docs/manual/reference/method/db.collection.update/)
- [UpdateResult](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/UpdateResult.html)
- [MongoDB docs](https://www.mongodb.com/docs/manual/reference/command/update/#update-command-output)

Declare and/or execute this query as an updateOne() operation.
MongoDB will update _only_ the first document that matches `filter`.

- Use `replaceOne()` if you want to overwrite an entire document rather than using [atomic operators](https://www.mongodb.com/docs/manual/tutorial/model-data-for-atomic-operations/#pattern) like `$set`.

**Note** updateOne will _not_ fire update middleware. Use `pre('updateOne')`
and `post('updateOne')` instead.

#### Example:

    const res = await Person.updateOne({ name: 'Jean-Luc Picard' }, { ship: 'USS Enterprise' });
    res.acknowledged; // Indicates if this write result was acknowledged. If not, then all other members of this result will be undefined.
    res.matchedCount; // Number of documents that matched the filter
    res.modifiedCount; // Number of documents that were modified
    res.upsertedCount; // Number of documents that were upserted
    res.upsertedId; // Identifier of the inserted document (if an upsert took place)

    // Other supported syntaxes
    await Person.findOne({ name: 'Jean-Luc Picard' }).updateOne({ ship: 'USS Enterprise' }); // Using chaining syntax
    await Person.updateOne({ ship: 'USS Enterprise' }); // Updates first doc's `ship` property

This function triggers the following middleware.

- `updateOne()`

## `Query.prototype.w()`

### Parameters

- `val` \<string|number\> 0 for fire-and-forget, 1 for acknowledged by one server, 'majority' for majority of the replica set, or [any of the more advanced options](https://www.mongodb.com/docs/manual/reference/write-concern/#w-option).

### Returns

- \<Query\> this

### See

- [mongodb](https://www.mongodb.com/docs/manual/reference/write-concern/#w-option)

Sets the specified number of `mongod` servers, or tag set of `mongod` servers,
that must acknowledge this write before this write is considered successful.
This option is only valid for operations that write to the database:

- `deleteOne()`
- `deleteMany()`
- `findOneAndDelete()`
- `findOneAndReplace()`
- `findOneAndUpdate()`
- `updateOne()`
- `updateMany()`

Defaults to the schema's [`writeConcern.w` option](https://mongoosejs.com/docs/guide.html#writeConcern)

#### Example:

    // The 'majority' option means the `deleteOne()` promise won't resolve
    // until the `deleteOne()` has propagated to the majority of the replica set
    await mongoose.model('Person').
      deleteOne({ name: 'Ned Stark' }).
      w('majority');

## `Query.prototype.where()`

### Parameters

- `[path]` \<string|object\>
- `[val]` \<any\>

### Returns

- \<Query\> this

Specifies a `path` for use with chaining.

#### Example:

    // instead of writing:
    User.find({age: {$gte: 21, $lte: 65}});

    // we can instead write:
    User.where('age').gte(21).lte(65);

    // passing query conditions is permitted
    User.find().where({ name: 'vonderful' })

    // chaining
    User
    .where('age').gte(21).lte(65)
    .where('name', /^vonderful/i)
    .where('friends').slice(10)
    .exec()

## `Query.prototype.within()`

### Returns

- \<Query\> this

### See

- [$polygon](https://www.mongodb.com/docs/manual/reference/operator/polygon/)
- [$box](https://www.mongodb.com/docs/manual/reference/operator/box/)
- [$geometry](https://www.mongodb.com/docs/manual/reference/operator/geometry/)
- [$center](https://www.mongodb.com/docs/manual/reference/operator/center/)
- [$centerSphere](https://www.mongodb.com/docs/manual/reference/operator/centerSphere/)

Defines a `$within` or `$geoWithin` argument for geo-spatial queries.

#### Example:

    query.where(path).within().box()
    query.where(path).within().circle()
    query.where(path).within().geometry()

    query.where('loc').within({ center: [50,50], radius: 10, unique: true, spherical: true });
    query.where('loc').within({ box: [[40.73, -73.9], [40.7, -73.988]] });
    query.where('loc').within({ polygon: [[],[],[],[]] });

    query.where('loc').within([], [], []) // polygon
    query.where('loc').within([], []) // box
    query.where('loc').within({ type: 'LineString', coordinates: [...] }); // geometry

**MUST** be used after `where()`.

#### Note:

As of Mongoose 3.7, `$geoWithin` is always used for queries. To change this behavior, see [Query.use$geoWithin](https://mongoosejs.com/docs/api/query.md#Query.prototype.use$geoWithin).

#### Note:

In Mongoose 3.7, `within` changed from a getter to a function. If you need the old syntax, use [this](https://github.com/ebensing/mongoose-within).

## `Query.prototype.writeConcern()`

### Parameters

- `writeConcern` \<object\> the write concern value to set

### Returns

- \<Query\> this

### See

- [WriteConcernSettings](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/WriteConcernSettings.html)

Sets the 3 write concern parameters for this query:

- `w`: Sets the specified number of `mongod` servers, or tag set of `mongod` servers, that must acknowledge this write before this write is considered successful.
- `j`: Boolean, set to `true` to request acknowledgement that this operation has been persisted to MongoDB's on-disk journal.
- `wtimeout`: If [`w > 1`](https://mongoosejs.com/docs/api/query.md#Query.prototype.w()), the maximum amount of time to wait for this write to propagate through the replica set before this operation fails. The default is `0`, which means no timeout.

This option is only valid for operations that write to the database:

- `deleteOne()`
- `deleteMany()`
- `findOneAndDelete()`
- `findOneAndReplace()`
- `findOneAndUpdate()`
- `updateOne()`
- `updateMany()`

Defaults to the schema's [`writeConcern` option](https://mongoosejs.com/docs/guide.html#writeConcern)

#### Example:

    // The 'majority' option means the `deleteOne()` promise won't resolve
    // until the `deleteOne()` has propagated to the majority of the replica set
    await mongoose.model('Person').
      deleteOne({ name: 'Ned Stark' }).
      writeConcern({ w: 'majority' });

## `Query.prototype.wtimeout()`

### Parameters

- `ms` \<number\> number of milliseconds to wait

### Returns

- \<Query\> this

### See

- [mongodb](https://www.mongodb.com/docs/manual/reference/write-concern/#wtimeout)

If [`w > 1`](https://mongoosejs.com/docs/api/query.md#Query.prototype.w()), the maximum amount of time to
wait for this write to propagate through the replica set before this
operation fails. The default is `0`, which means no timeout.

This option is only valid for operations that write to the database:

- `deleteOne()`
- `deleteMany()`
- `findOneAndDelete()`
- `findOneAndReplace()`
- `findOneAndUpdate()`
- `updateOne()`
- `updateMany()`

Defaults to the schema's [`writeConcern.wtimeout` option](https://mongoosejs.com/docs/guide.html#writeConcern)

#### Example:

    // The `deleteOne()` promise won't resolve until this `deleteOne()` has
    // propagated to at least `w = 2` members of the replica set. If it takes
    // longer than 1 second, this `deleteOne()` will fail.
    await mongoose.model('Person').
      deleteOne({ name: 'Ned Stark' }).
      w(2).
      wtimeout(1000);

## `Query.prototype[Symbol.asyncIterator]()`

Returns an asyncIterator for use with [`for/await/of` loops](https://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js)
This function *only* works for `find()` queries.
You do not need to call this function explicitly, the JavaScript runtime
will call it for you.

#### Example:

    for await (const doc of Model.aggregate([{ $sort: { name: 1 } }])) {
      console.log(doc.name);
    }

## `Query.prototype[Symbol.toStringTag]()`

### Returns

- \<string\>

Returns a string representation of this query.

More about [`toString()` in JavaScript](https://masteringjs.io/tutorials/fundamentals/tostring).

#### Example:
    const q = Model.find();
    console.log(q); // Prints "Query { find }"

## `Query.use$geoWithin`

### Type

- \<property\>

### See

- [geoWithin](https://www.mongodb.com/docs/manual/reference/operator/geoWithin/)

Flag to opt out of using `$geoWithin`.

```javascript
mongoose.Query.use$geoWithin = false;
```

MongoDB 2.4 deprecated the use of `$within`, replacing it with `$geoWithin`. Mongoose uses `$geoWithin` by default (which is 100% backward compatible with `$within`). If you are running an older version of MongoDB, set this flag to `false` so your `within()` queries continue to work.

## `canMerge()`

Determine if we can merge the given value as a query filter. Override for mquery.canMerge() to allow null
