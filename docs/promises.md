# Promises

## Built-in Promises

Mongoose async operations, like `.save()` and queries, return thenables.
This means that you can do things like `MyModel.findOne({}).then()` and
`await MyModel.findOne({}).exec()` if you're using
[async/await](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html).

You can find the return type of specific operations [in the api docs](api/mongoose.html)
You can also read more about [promises in Mongoose](https://masteringjs.io/tutorials/mongoose/promise).

```acquit
[require:Built-in Promises]
```

## Queries are not promises

[Mongoose queries](http://mongoosejs.com/docs/queries.html) are **not** promises. They have a `.then()`
function for [co](https://www.npmjs.com/package/co) and async/await as
a convenience. If you need
a fully-fledged promise, use the `.exec()` function.

```acquit
[require:Queries are not promises]
```

## Queries are thenable

Although queries are not promises, queries are [thenables](https://promisesaplus.com/#terminology).
That means they have a `.then()` function, so you can use queries as promises with either
promise chaining or [async await](https://asyncawait.net)

```acquit
[require:Queries are thenable]
```

## Should You Use `exec()` With `await`?

There are two alternatives for using `await` with queries:

- `await Band.findOne();`
- `await Band.findOne().exec();`

As far as functionality is concerned, these two are equivalent.
However, we recommend using `.exec()` because that gives you
better stack traces.

```acquit
[require:Should You Use `exec\(\)` With `await`]
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
  <img src="/docs/images/asyncawait.png" style="width: 650px" />
</a>
