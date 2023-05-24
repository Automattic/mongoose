# Queries

Mongoose [models](models.html) provide several static helper functions
for [CRUD operations](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete).
Each of these functions returns a
[mongoose `Query` object](api/query.html#Query).

- [`Model.deleteMany()`](api.html#model_Model-deleteMany)
- [`Model.deleteOne()`](api.html#model_Model-deleteOne)
- [`Model.find()`](api.html#model_Model-find)
- [`Model.findById()`](api.html#model_Model-findById)
- [`Model.findByIdAndDelete()`](api.html#model_Model-findByIdAndDelete)
- [`Model.findByIdAndRemove()`](api.html#model_Model-findByIdAndRemove)
- [`Model.findByIdAndUpdate()`](api.html#model_Model-findByIdAndUpdate)
- [`Model.findOne()`](api.html#model_Model-findOne)
- [`Model.findOneAndDelete()`](api.html#model_Model-findOneAndDelete)
- [`Model.findOneAndRemove()`](api.html#model_Model-findOneAndRemove)
- [`Model.findOneAndReplace()`](api.html#model_Model-findOneAndReplace)
- [`Model.findOneAndUpdate()`](api.html#model_Model-findOneAndUpdate)
- [`Model.replaceOne()`](api.html#model_Model-replaceOne)
- [`Model.updateMany()`](api.html#model_Model-updateMany)
- [`Model.updateOne()`](api.html#model_Model-updateOne)

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

## Executing

When executing a query, you specify your query as a JSON document. The JSON document's syntax is the same as the [MongoDB shell](http://www.mongodb.com/docs/manual/tutorial/query-documents/).

```javascript
const Person = mongoose.model('Person', yourSchema);

// find each person with a last name matching 'Ghost', selecting the `name` and `occupation` fields
const person = await Person.findOne({ 'name.last': 'Ghost' }, 'name occupation');
// Prints "Space Ghost is a talk show host".
console.log('%s %s is a %s.', person.name.first, person.name.last, person.occupation);
```

What `person` is depends on the operation: For `findOne()` it is a [potentially-null single document](api/model.html#model_Model-findOne), `find()` a [list of documents](api/model.html#model_Model-find), `count()` [the number of documents](api/model.html#model_Model-count), `update()` the [number of documents affected](api/model.html#model_Model-update), etc.
The [API docs for Models](api/model.html) provide more details.

Now let's look at what happens when no `await` is used:

```javascript
// find each person with a last name matching 'Ghost'
const query = Person.findOne({ 'name.last': 'Ghost' });

// selecting the `name` and `occupation` fields
query.select('name occupation');

// execute the query at a later time
const person = await query.exec();
 // Prints "Space Ghost is a talk show host."
console.log('%s %s is a %s.', person.name.first, person.name.last, person.occupation);
```

In the above code, the `query` variable is of type [Query](api/query.html).
A `Query` enables you to build up a query using chaining syntax, rather than specifying a JSON object.
The below 2 examples are equivalent.

```javascript
// With a JSON doc
await Person.
  find({
    occupation: /host/,
    'name.last': 'Ghost',
    age: { $gt: 17, $lt: 66 },
    likes: { $in: ['vaporizing', 'talking'] }
  }).
  limit(10).
  sort({ occupation: -1 }).
  select({ name: 1, occupation: 1 }).
  exec();

// Using query builder
await Person.
  find({ occupation: /host/ }).
  where('name.last').equals('Ghost').
  where('age').gt(17).lt(66).
  where('likes').in(['vaporizing', 'talking']).
  limit(10).
  sort('-occupation').
  select('name occupation').
  exec();
```

A full list of [Query helper functions can be found in the API docs](api/query.html).

<h2 id="queries-are-not-promises">
  <a href="#queries-are-not-promises">
    Queries are Not Promises
  </a>
</h2>

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

<h2 id="refs"><a href="#refs">References to other documents</a></h2>

There are no joins in MongoDB but sometimes we still want references to
documents in other collections. This is where [population](populate.html)
comes in. Read more about how to include documents from other collections in
your query results [here](api/query.html#query_Query-populate).

<h2 id="streaming"><a href="#streaming">Streaming</a></h2>

You can [stream](http://nodejs.org/api/stream.html) query results from
MongoDB. You need to call the
[Query#cursor()](api/query.html#query_Query-cursor) function to return an instance of [QueryCursor](api/query.html#query_Query-cursor).

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

However, cursors can still time out because of [session idle timeouts](https://www.mongodb.com/docs/manual/reference/method/cursor.noCursorTimeout/#session-idle-timeout-overrides-nocursortimeout).
So even a cursor with `noCursorTimeout` set will still time out after 30 minutes
of inactivity. You can read more about working around session idle timeouts in the [MongoDB documentation](https://www.mongodb.com/docs/manual/reference/method/cursor.noCursorTimeout/#session-idle-timeout-overrides-nocursortimeout).

<h2 id="versus-aggregation"><a href="#versus-aggregation">Versus Aggregation</a></h2>

[Aggregation](api/aggregate.html#aggregate_Aggregate) can
do many of the same things that queries can. For example, below is
how you can use `aggregate()` to find docs where `name.last = 'Ghost'`:

```javascript
const docs = await Person.aggregate([{ $match: { 'name.last': 'Ghost' } }]);
```

However, just because you can use `aggregate()` doesn't mean you should.
In general, you should use queries where possible, and only use `aggregate()`
when you absolutely need to.

Unlike query results, Mongoose does **not** [`hydrate()`](api/model.html#model_Model-hydrate)
aggregation results. Aggregation results are always POJOs, not Mongoose
documents.

```javascript
const docs = await Person.aggregate([{ $match: { 'name.last': 'Ghost' } }]);

docs[0] instanceof mongoose.Document; // false
```

Also, unlike query filters, Mongoose also doesn't
[cast](tutorials/query_casting.html) aggregation pipelines. That means
you're responsible for ensuring the values you pass in to an aggregation
pipeline have the correct type.

```javascript
const doc = await Person.findOne();

const idString = doc._id.toString();

// Finds the `Person`, because Mongoose casts `idString` to an ObjectId
const queryRes = await Person.findOne({ _id: idString });

// Does **not** find the `Person`, because Mongoose doesn't cast aggregation
// pipelines.
const aggRes = await Person.aggregate([{ $match: { _id: idString } }]);
```

<h2 id="sorting"><a href="#sorting">Sorting</a></h2>

[Sorting](/docs/api.html#query_Query-sort) is how you can ensure you query results come back in the desired order.

```javascript
const personSchema = new mongoose.Schema({
  age: Number
});

const Person = mongoose.model('Person', personSchema);
for (let i = 0; i < 10; i++) {
  await Person.create({ age: i });
}

await Person.find().sort({ age: -1 }); // returns age starting from 10 as the first entry
await Person.find().sort({ age: 1 }); // returns age starting from 0 as the first entry
```

When sorting with mutiple fields, the order of the sort keys determines what key MongoDB server sorts by first.

```javascript
const personSchema = new mongoose.Schema({
  age: Number,
  name: String,
  weight: Number
});

const Person = mongoose.model('Person', personSchema);
const iterations = 5;
for (let i = 0; i < iterations; i++) {
  await Person.create({
    age: Math.abs(2 - i),
    name: 'Test' + i,
    weight: Math.floor(Math.random() * 100) + 1
  });
}

await Person.find().sort({ age: 1, weight: -1 }); // returns age starting from 0, but while keeping that order will then sort by weight.
```

You can view the output of a single run of this block below.
As you can see, age is sorted from 0 to 2 but when age is equal, sorts by weight.

```javascript
[
  {
    _id: new ObjectId('63a335a6b9b6a7bfc186cb37'),
    age: 0,
    name: 'Test2',
    weight: 67,
    __v: 0
  },
  {
    _id: new ObjectId('63a335a6b9b6a7bfc186cb35'),
    age: 1,
    name: 'Test1',
    weight: 99,
    __v: 0
  },
  {
    _id: new ObjectId('63a335a6b9b6a7bfc186cb39'),
    age: 1,
    name: 'Test3',
    weight: 73,
    __v: 0
  },
  {
    _id: new ObjectId('63a335a6b9b6a7bfc186cb33'),
    age: 2,
    name: 'Test0',
    weight: 65,
    __v: 0
  },
  {
    _id: new ObjectId('63a335a6b9b6a7bfc186cb3b'),
    age: 2,
    name: 'Test4',
    weight: 62,
    __v: 0
  }
];
```

<h2 id="next"><a href="#next">Next Up</a></h2>

Now that we've covered `Queries`, let's take a look at [Validation](validation.html).
