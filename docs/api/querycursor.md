# QueryCursor

- [`QueryCursor()`](#QueryCursor())
- [`QueryCursor.prototype.addCursorFlag()`](#QueryCursor.prototype.addCursorFlag())
- [`QueryCursor.prototype.close()`](#QueryCursor.prototype.close())
- [`QueryCursor.prototype.eachAsync()`](#QueryCursor.prototype.eachAsync())
- [`QueryCursor.prototype.getDriverCursor()`](#QueryCursor.prototype.getDriverCursor())
- [`QueryCursor.prototype.map()`](#QueryCursor.prototype.map())
- [`QueryCursor.prototype.next()`](#QueryCursor.prototype.next())
- [`QueryCursor.prototype.options`](#QueryCursor.prototype.options)
- [`QueryCursor.prototype.rewind()`](#QueryCursor.prototype.rewind())
- [`QueryCursor.prototype[Symbol.asyncIterator]()`](#QueryCursor.prototype[Symbol.asyncIterator]())

## `QueryCursor()`

### Parameters

- `query` \<Query\>
- `options` \<object\> query options passed to `.find()`

### Inherits

- [Readable](https://nodejs.org/api/stream.html#class-streamreadable)

A QueryCursor is a concurrency primitive for processing query results
one document at a time. A QueryCursor fulfills the Node.js streams3 API,
in addition to several other mechanisms for loading documents from MongoDB
one at a time.

QueryCursors execute the model's pre `find` hooks before loading any documents
from MongoDB, and the model's post `find` hooks after loading each document.

Unless you're an advanced user, do **not** instantiate this class directly.
Use [`Query#cursor()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.cursor()) instead.

## `QueryCursor.prototype.addCursorFlag()`

### Parameters

- `flag` \<'tailable' | 'oplogReplay' | 'noCursorTimeout' | 'awaitData' | 'partial'\>
- `value` \<boolean\>

### Returns

- \<AggregationCursor\> this

Adds a [cursor flag](https://mongodb.github.io/node-mongodb-native/7.0/classes/FindCursor.html#addCursorFlag).
Useful for setting the `noCursorTimeout` and `tailable` flags.

## `QueryCursor.prototype.close()`

### Returns

- \<Promise\>

### See

- [AggregationCursor.close](https://mongodb.github.io/node-mongodb-native/7.0/classes/AggregationCursor.html#close)

Marks this cursor as closed. Will stop streaming and subsequent calls to
`next()` will error.

## `QueryCursor.prototype.eachAsync()`

### Parameters

- `fn` \<Function\>
- `[options]` \<object\>
- `[options.parallel]` \<number\> the number of promises to execute in parallel. Defaults to 1.
- `[options.batchSize]` \<number\> if set, will call `fn()` with arrays of documents with length at most `batchSize`
- `[options.continueOnError=false]` \<boolean\> if true, `eachAsync()` iterates through all docs even if `fn` throws an error. If false, `eachAsync()` throws an error immediately if the given function `fn()` throws an error.

### Returns

- \<Promise\>

Execute `fn` for every document in the cursor. If `fn` returns a promise,
will wait for the promise to resolve before iterating on to the next one.
Returns a promise that resolves when done.

#### Example:

    // Iterate over documents asynchronously
    Thing.
      find({ name: /^hello/ }).
      cursor().
      eachAsync(async function (doc, i) {
        doc.foo = doc.bar + i;
        await doc.save();
      })

## `QueryCursor.prototype.getDriverCursor()`

Returns the underlying cursor from the MongoDB Node driver that this cursor uses.

## `QueryCursor.prototype.map()`

### Parameters

- `fn` \<Function\>

### Returns

- \<QueryCursor\>

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

## `QueryCursor.prototype.next()`

### Returns

- \<Promise\>

Get the next document from this cursor. Will return `null` when there are
no documents left.

## `QueryCursor.prototype.options`

### Type

- \<property\>

The `options` passed in to the `QueryCursor` constructor.

## `QueryCursor.prototype.rewind()`

### Returns

- \<AggregationCursor\> this

Rewind this cursor to its uninitialized state. Any options that are present on the cursor will
remain in effect. Iterating this cursor will cause new queries to be sent to the server, even
if the resultant data has already been retrieved by this cursor.

## `QueryCursor.prototype[Symbol.asyncIterator]()`

Returns an asyncIterator for use with [`for/await/of` loops](https://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js).
You do not need to call this function explicitly, the JavaScript runtime
will call it for you.

#### Example:

    // Works without using `cursor()`
    for await (const doc of Model.find([{ $sort: { name: 1 } }])) {
      console.log(doc.name);
    }

    // Can also use `cursor()`
    for await (const doc of Model.find([{ $sort: { name: 1 } }]).cursor()) {
      console.log(doc.name);
    }

Node.js 10.x supports async iterators natively without any flags. You can
enable async iterators in Node.js 8.x using the [`--harmony_async_iteration` flag](https://github.com/tc39/proposal-async-iteration/issues/117#issuecomment-346695187).

**Note:** This function is not if `Symbol.asyncIterator` is undefined. If
`Symbol.asyncIterator` is undefined, that means your Node.js version does not
support async iterators.
