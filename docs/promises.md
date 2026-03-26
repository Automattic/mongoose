# Promises

## Built-in Promises

Mongoose async operations, like `.save()` and queries, return thenables.
This means that you can do things like `MyModel.findOne({}).then()` and
`await MyModel.findOne({}).exec()` if you're using
[async/await](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html).

You can find the return type of specific operations [in the api docs](api/mongoose.html)
You can also read more about [promises in Mongoose](https://masteringjs.io/tutorials/mongoose/promise).

```javascript acquit:Built-in Promises
const gnr = new Band({
  name: 'Guns N\' Roses',
  members: ['Axl', 'Slash']
});

const promise = gnr.save();
assert.ok(promise instanceof Promise);

promise.then(function(doc) {
  assert.equal(doc.name, 'Guns N\' Roses');
});
```

## Queries are not promises

[Mongoose queries](https://mongoosejs.com/docs/queries.html) are **not** promises. They have a `.then()`
function for [co](https://www.npmjs.com/package/co) and async/await as
a convenience. If you need
a fully-fledged promise, use the `.exec()` function.

```javascript acquit:Queries are not promises
const query = Band.findOne({ name: 'Guns N\' Roses' });
assert.ok(!(query instanceof Promise));


// A query is not a fully-fledged promise, but it does have a `.then()`.
query.then(function(doc) {
  // use doc
});

// `.exec()` gives you a fully-fledged promise
const promise = Band.findOne({ name: 'Guns N\' Roses' }).exec();
assert.ok(promise instanceof Promise);

promise.then(function(doc) {
  // use doc
});
```

## Queries are thenable

Although queries are not promises, queries are [thenables](https://promisesaplus.com/#terminology).
That means they have a `.then()` function, so you can use queries as promises with either
promise chaining or [async await](https://asyncawait.net)

```javascript acquit:Queries are thenable
Band.findOne({ name: 'Guns N\' Roses' }).then(function(doc) {
  // use doc
});
```

## Should You Use `exec()` With `await`?

There are two alternatives for using `await` with queries:

* `await Band.findOne();`
* `await Band.findOne().exec();`

As far as functionality is concerned, these two are equivalent.
However, we recommend using `.exec()` because that gives you
better stack traces.

```javascript acquit:Should You Use `exec\(\)` With `await`
const doc = await Band.findOne({ name: 'Guns N\' Roses' }); // works

const badId = 'this is not a valid id';
try {
  await Band.findOne({ _id: badId });
} catch (err) {
  // Without `exec()`, the stack trace does **not** include the
  // calling code. Below is the stack trace:
  //
  // CastError: Cast to ObjectId failed for value "this is not a valid id" at path "_id" for model "band-promises"
  //   at new CastError (/app/node_modules/mongoose/lib/error/cast.js:29:11)
  //   at model.Query.exec (/app/node_modules/mongoose/lib/query.js:4331:21)
  //   at model.Query.Query.then (/app/node_modules/mongoose/lib/query.js:4423:15)
  //   at process._tickCallback (internal/process/next_tick.js:68:7)
  err.stack;
}

try {
  await Band.findOne({ _id: badId }).exec();
} catch (err) {
  // With `exec()`, the stack trace includes where in your code you
  // called `exec()`. Below is the stack trace:
  //
  // CastError: Cast to ObjectId failed for value "this is not a valid id" at path "_id" for model "band-promises"
  //   at new CastError (/app/node_modules/mongoose/lib/error/cast.js:29:11)
  //   at model.Query.exec (/app/node_modules/mongoose/lib/query.js:4331:21)
  //   at Context.<anonymous> (/app/test/index.test.js:138:42)
  //   at process._tickCallback (internal/process/next_tick.js:68:7)
  err.stack;
}
```

<i>
  Want to learn how to check whether your favorite npm modules work with
  async/await without cobbling together contradictory answers from Google
  and Stack Overflow? Chapter 4 of Mastering Async/Await explains the
  basic principles for determining whether frameworks like React and
  Mongoose support async/await.
  <a href="http://asyncawait.net/?utm_source=mongoosejs&utm_campaign=promises">Get your copy!</a>
</i>
<br><br>
<a href="http://asyncawait.net/?utm_source=mongoosejs&utm_campaign=promises" style="margin-left: 100px">
  <img src="/docs/images/asyncawait.png" style="width: 650px" alt="Mastering Async/Await" />
</a>
