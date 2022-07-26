## Queries

Mongoose [models](./models.html) provide several static helper functions
for [CRUD operations](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete).
Each of these functions returns a
[mongoose `Query` object](http://mongoosejs.com/docs/api.html#Query).

- [`Model.deleteMany()`](/docs/api.html#model_Model-deleteMany)
- [`Model.deleteOne()`](/docs/api.html#model_Model-deleteOne)
- [`Model.find()`](/docs/api.html#model_Model-find)
- [`Model.findById()`](/docs/api.html#model_Model-findById)
- [`Model.findByIdAndDelete()`](/docs/api.html#model_Model-findByIdAndDelete)
- [`Model.findByIdAndRemove()`](/docs/api.html#model_Model-findByIdAndRemove)
- [`Model.findByIdAndUpdate()`](/docs/api.html#model_Model-findByIdAndUpdate)
- [`Model.findOne()`](/docs/api.html#model_Model-findOne)
- [`Model.findOneAndDelete()`](/docs/api.html#model_Model-findOneAndDelete)
- [`Model.findOneAndRemove()`](/docs/api.html#model_Model-findOneAndRemove)
- [`Model.findOneAndReplace()`](/docs/api.html#model_Model-findOneAndReplace)
- [`Model.findOneAndUpdate()`](/docs/api.html#model_Model-findOneAndUpdate)
- [`Model.replaceOne()`](/docs/api.html#model_Model-replaceOne)
- [`Model.updateMany()`](/docs/api.html#model_Model-updateMany)
- [`Model.updateOne()`](/docs/api.html#model_Model-updateOne)

A mongoose query can be executed in one of two ways. First, if you
pass in a `callback` function, Mongoose will execute the query asynchronously
and pass the results to the `callback`.

A query also has a `.then()` function, and thus can be used as a promise.

<ul class="toc">
  <li><a href="#executing">Executing</a></li>
  <li><a href="#queries-are-not-promises">Queries are Not Promises</a></li>
  <li><a href="#refs">References to other documents</a></li>
  <li><a href="#streaming">Streaming</a></li>
  <li><a href="#versus-aggregation">Versus Aggregation</a></li>
</ul>

### Executing

When executing a query with a `callback` function, you specify your query as a JSON document. The JSON document's syntax is the same as the [MongoDB shell](http://docs.mongodb.org/manual/tutorial/query-documents/).

```javascript
const Person = mongoose.model('Person', yourSchema);

// find each person with a last name matching 'Ghost', selecting the `name` and `occupation` fields
Person.findOne({ 'name.last': 'Ghost' }, 'name occupation', function (err, person) {
  if (err) return handleError(err);
  // Prints "Space Ghost is a talk show host".
  console.log('%s %s is a %s.', person.name.first, person.name.last,
    person.occupation);
});
```

Mongoose executed the query and passed the results to `callback`. All callbacks in Mongoose use the pattern:
`callback(error, result)`. If an error occurs executing the query, the `error` parameter will contain an error document, and `result`
will be null. If the query is successful, the `error` parameter will be null, and the `result` will be populated with the results of the query.

Anywhere a callback is passed to a query in Mongoose, the callback follows the pattern `callback(error, results)`. What `results` is depends on the operation: For `findOne()` it is a [potentially-null single document](./api.html#model_Model-findOne), `find()` a [list of documents](./api.html#model_Model-find), `count()` [the number of documents](./api.html#model_Model-count), `update()` the [number of documents affected](./api.html#model_Model-update), etc. The [API docs for Models](./api.html#model-js) provide more detail on what is passed to the callbacks.

Now let's look at what happens when no `callback` is passed:

```javascript
// find each person with a last name matching 'Ghost'
const query = Person.findOne({ 'name.last': 'Ghost' });

// selecting the `name` and `occupation` fields
query.select('name occupation');

// execute the query at a later time
query.exec(function (err, person) {
  if (err) return handleError(err);
  // Prints "Space Ghost is a talk show host."
  console.log('%s %s is a %s.', person.name.first, person.name.last,
    person.occupation);
});
```

In the above code, the `query` variable is of type [Query](./api.html#query-js).
A `Query` enables you to build up a query using chaining syntax, rather than specifying a JSON object.
The below 2 examples are equivalent.

```javascript
// With a JSON doc
Person.
  find({
    occupation: /host/,
    'name.last': 'Ghost',
    age: { $gt: 17, $lt: 66 },
    likes: { $in: ['vaporizing', 'talking'] }
  }).
  limit(10).
  sort({ occupation: -1 }).
  select({ name: 1, occupation: 1 }).
  exec(callback);

// Using query builder
Person.
  find({ occupation: /host/ }).
  where('name.last').equals('Ghost').
  where('age').gt(17).lt(66).
  where('likes').in(['vaporizing', 'talking']).
  limit(10).
  sort('-occupation').
  select('name occupation').
  exec(callback);
```

A full list of [Query helper functions can be found in the API docs](./api.html#query-js).

<h3 id="queries-are-not-promises">
  <a href="#queries-are-not-promises">
    Queries are Not Promises
  </a>
</h3>

Mongoose queries are **not** promises. They have a `.then()`
function for [co](https://www.npmjs.com/package/co) and
[async/await](http://thecodebarbarian.com/common-async-await-design-patterns-in-node.js.html)
as a convenience. However, unlike promises, calling a query's `.then()`
can execute the query multiple times.

For example, the below code will execute 3 `updateMany()` calls, one
because of the callback, and two because `.then()` is called twice.

```javascript
const q = MyModel.updateMany({}, { isDeleted: true }, function() {
  console.log('Update 1');
});

q.then(() => console.log('Update 2'));
q.then(() => console.log('Update 3'));
```

Don't mix using callbacks and promises with queries, or you may end up
with duplicate operations. That's because passing a callback to a query function
immediately executes the query, and calling [`then()`](https://masteringjs.io/tutorials/fundamentals/then)
executes the query again.

Mixing promises and callbacks can lead to duplicate entries in arrays.
For example, the below code inserts 2 entries into the `tags` array, **not** just 1.

```javascript
const BlogPost = mongoose.model('BlogPost', new Schema({
  title: String,
  tags: [String]
}));

// Because there's both `await` **and** a callback, this `updateOne()` executes twice
// and thus pushes the same string into `tags` twice.
const update = { $push: { tags: ['javascript'] } };
await BlogPost.updateOne({ title: 'Introduction to Promises' }, update, (err, res) => {
  console.log(res);
});
```

<h3 id="refs"><a href="#refs">References to other documents</a></h3>

There are no joins in MongoDB but sometimes we still want references to
documents in other collections. This is where [population](./populate.html)
comes in. Read more about how to include documents from other collections in
your query results [here](./api.html#query_Query-populate).

<h3 id="streaming"><a href="#streaming">Streaming</a></h3>

You can [stream](http://nodejs.org/api/stream.html) query results from
MongoDB. You need to call the
[Query#cursor()](./api.html#query_Query-cursor) function to return an instance of
[QueryCursor](./api.html#query_Query-cursor).

```javascript
const cursor = Person.find({ occupation: /host/ }).cursor();

for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
  console.log(doc); // Prints documents one at a time
}
```

Iterating through a Mongoose query using [async iterators](https://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js.html)
also creates a cursor.

```javascript
for await (const doc of Person.find()) {
  console.log(doc); // Prints documents one at a time
}
```

Cursors are subject to [cursor timeouts](https://stackoverflow.com/questions/21853178/when-a-mongodb-cursor-will-expire).
By default, MongoDB will close your cursor after 10 minutes and subsequent
`next()` calls will result in a `MongoServerError: cursor id 123 not found` error.
To override this, set the `noCursorTimeout` option on your cursor.

```javascript
// MongoDB won't automatically close this cursor after 10 minutes.
const cursor = Person.find().cursor().addCursorFlag('noCursorTimeout', true);
```

However, cursors can still time out because of [session idle timeouts](https://docs.mongodb.com/manual/reference/method/cursor.noCursorTimeout/#session-idle-timeout-overrides-nocursortimeout).
So even a cursor with `noCursorTimeout` set will still time out after 30 minutes
of inactivity. You can read more about working around session idle timeouts in the [MongoDB documentation](https://docs.mongodb.com/manual/reference/method/cursor.noCursorTimeout/#session-idle-timeout-overrides-nocursortimeout).

<h3 id="versus-aggregation"><a href="#versus-aggregation">Versus Aggregation</a></h3>

[Aggregation](https://mongoosejs.com/docs/api.html#aggregate_Aggregate) can
do many of the same things that queries can. For example, below is
how you can use `aggregate()` to find docs where `name.last = 'Ghost'`:

```javascript
const docs = await Person.aggregate([{ $match: { 'name.last': 'Ghost' } }]);
```

However, just because you can use `aggregate()` doesn't mean you should.
In general, you should use queries where possible, and only use `aggregate()`
when you absolutely need to.

Unlike query results, Mongoose does **not** [`hydrate()`](/docs/api/model.html#model_Model-hydrate)
aggregation results. Aggregation results are always POJOs, not Mongoose
documents.

```javascript
const docs = await Person.aggregate([{ $match: { 'name.last': 'Ghost' } }]);

docs[0] instanceof mongoose.Document; // false
```

Also, unlike query filters, Mongoose also doesn't
[cast](/docs/tutorials/query_casting.html) aggregation pipelines. That means
you're responsible for ensuring the values you pass in to an aggregation
pipeline have the correct type.

```javascript
const doc = await Person.findOne();

const idString = doc._id.toString();

// Finds the `Person`, because Mongoose casts `idString` to an ObjectId
const queryRes = await Person.findOne({ _id: idString });

// Does **not** find the `Person`, because Mongoose doesn't cast aggregation
// pipelines.
const aggRes = await Person.aggregate([{ $match: { _id: idString } }])
```

<h3 id="next"><a href="#next">Next Up</a></h3>

Now that we've covered `Queries`, let's take a look at [Validation](/docs/validation.html).
