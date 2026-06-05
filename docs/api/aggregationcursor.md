# AggregationCursor

- [`AggregationCursor()`](#AggregationCursor())
- [`AggregationCursor.prototype.addCursorFlag()`](#AggregationCursor.prototype.addCursorFlag())
- [`AggregationCursor.prototype.close()`](#AggregationCursor.prototype.close())
- [`AggregationCursor.prototype.eachAsync()`](#AggregationCursor.prototype.eachAsync())
- [`AggregationCursor.prototype.map()`](#AggregationCursor.prototype.map())
- [`AggregationCursor.prototype.next()`](#AggregationCursor.prototype.next())
- [`AggregationCursor.prototype[Symbol.asyncIterator]()`](#AggregationCursor.prototype[Symbol.asyncIterator]())
- [`_handlePreHookError()`](#_handlePreHookError())

## `AggregationCursor()`

### Parameters

- `agg` \<Aggregate\>

### Inherits

- [Readable](https://nodejs.org/api/stream.html#class-streamreadable)

An AggregationCursor is a concurrency primitive for processing aggregation
results one document at a time. It is analogous to QueryCursor.

An AggregationCursor fulfills the Node.js streams3 API,
in addition to several other mechanisms for loading documents from MongoDB
one at a time.

Creating an AggregationCursor executes the model's pre aggregate hooks,
but **not** the model's post aggregate hooks.

Unless you're an advanced user, do **not** instantiate this class directly.
Use [`Aggregate#cursor()`](https://mongoosejs.com/docs/api/aggregate.md#Aggregate.prototype.cursor()) instead.

## `AggregationCursor.prototype.addCursorFlag()`

### Parameters

- `flag` \<'tailable' | 'oplogReplay' | 'noCursorTimeout' | 'awaitData' | 'partial'\>
- `value` \<boolean\>

### Returns

- \<AggregationCursor\> this

Adds a [cursor flag](https://mongodb.github.io/node-mongodb-native/7.0/classes/AggregationCursor.html#addCursorFlag).
Useful for setting the `noCursorTimeout` and `tailable` flags.

## `AggregationCursor.prototype.close()`

### Returns

- \<Promise\>

### See

- [AggregationCursor.close](https://mongodb.github.io/node-mongodb-native/7.0/classes/AggregationCursor.html#close)

Marks this cursor as closed. Will stop streaming and subsequent calls to
`next()` will error.

## `AggregationCursor.prototype.eachAsync()`

### Parameters

- `fn` \<Function\>
- `[options]` \<object\>
- `[options.parallel]` \<number\> the number of promises to execute in parallel. Defaults to 1.
- `[options.batchSize=null]` \<number\> if set, Mongoose will call `fn` with an array of at most `batchSize` documents, instead of a single document
- `[options.continueOnError=false]` \<boolean\> if true, `eachAsync()` iterates through all docs even if `fn` throws an error. If false, `eachAsync()` throws an error immediately if the given function `fn()` throws an error.

### Returns

- \<Promise\>

Execute `fn` for every document in the cursor. If `fn` returns a promise,
will wait for the promise to resolve before iterating on to the next one.
Returns a promise that resolves when done.

## `AggregationCursor.prototype.map()`

### Parameters

- `fn` \<Function\>

### Returns

- \<AggregationCursor\>

Registers a transform function which subsequently maps documents retrieved
via the streams interface or `.next()`

#### Example:

    // Map documents returned by `data` events
    Thing.
      find({ name: /^hello/ }).
      cursor().
      map(function (doc) {
       doc.foo = "bar";
       return doc;
      })
      on('data', function(doc) { console.log(doc.foo); });

    // Or map documents returned by `.next()`
    const cursor = Thing.find({ name: /^hello/ }).
      cursor().
      map(function (doc) {
        doc.foo = "bar";
        return doc;
      });
    cursor.next(function(error, doc) {
      console.log(doc.foo);
    });

## `AggregationCursor.prototype.next()`

### Returns

- \<Promise\>

Get the next document from this cursor. Will return `null` when there are
no documents left.

## `AggregationCursor.prototype[Symbol.asyncIterator]()`

Returns an asyncIterator for use with [`for/await/of` loops](https://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js)
You do not need to call this function explicitly, the JavaScript runtime
will call it for you.

#### Example:

    // Async iterator without explicitly calling `cursor()`. Mongoose still
    // creates an AggregationCursor instance internally.
    const agg = Model.aggregate([{ $match: { age: { $gte: 25 } } }]);
    for await (const doc of agg) {
      console.log(doc.name);
    }

    // You can also use an AggregationCursor instance for async iteration
    const cursor = Model.aggregate([{ $match: { age: { $gte: 25 } } }]).cursor();
    for await (const doc of cursor) {
      console.log(doc.name);
    }

Node.js 10.x supports async iterators natively without any flags. You can
enable async iterators in Node.js 8.x using the [`--harmony_async_iteration` flag](https://github.com/tc39/proposal-async-iteration/issues/117#issuecomment-346695187).

**Note:** This function is not set if `Symbol.asyncIterator` is undefined. If
`Symbol.asyncIterator` is undefined, that means your Node.js version does not
support async iterators.

## `_handlePreHookError()`

### Parameters

- `queryCursor` \<QueryCursor\>
- `err` \<Error\>

Handles error emitted from pre middleware. In particular, checks for `skipWrappedFunction`, which allows skipping
the actual aggregation and overwriting the function's return value. Because aggregation cursors don't return a value,
we need to make sure the user doesn't accidentally set a value in skipWrappedFunction.
