# Faster Mongoose Queries With Lean

The [lean option](../api/query.html#query_Query-lean) tells Mongoose to skip
[hydrating](../api/model.html#model_Model-hydrate) the result documents. This
makes queries faster and less memory intensive, but the result documents are
plain old JavaScript objects (POJOs), **not** [Mongoose documents](../documents.html).
In this tutorial, you'll learn more about the tradeoffs of using `lean()`.

* [Using Lean](#using-lean)
* [Lean and Populate](#lean-and-populate)
* [When to Use Lean](#when-to-use-lean)
* [Plugins](#plugins)
* [BigInts](#bigints)

## Using Lean

By default, Mongoose queries return an instance of the
[Mongoose `Document` class](../api/document.html#Document). Documents are much
heavier than vanilla JavaScript objects, because they have a lot of internal
state for change tracking. Enabling the `lean` option tells Mongoose to skip
instantiating a full Mongoose document and just give you the POJO.

```javascript
const leanDoc = await MyModel.findOne().lean();
```

How much smaller are lean documents? Here's a comparison.

```javascript acquit:Lean Tutorial.*compare sizes
const schema = new mongoose.Schema({ name: String });
const MyModel = mongoose.model('Test', schema);

await MyModel.create({ name: 'test' });

const normalDoc = await MyModel.findOne();
// To enable the `lean` option for a query, use the `lean()` function.
const leanDoc = await MyModel.findOne().lean();

v8Serialize(normalDoc).length; // approximately 180
v8Serialize(leanDoc).length; // approximately 55, about 3x smaller!

// In case you were wondering, the JSON form of a Mongoose doc is the same
// as the POJO. This additional memory only affects how much memory your
// Node.js process uses, not how much data is sent over the network.
JSON.stringify(normalDoc).length === JSON.stringify(leanDoc).length; // true
```

Under the hood, after executing a query, Mongoose converts the query results
from POJOs to Mongoose documents. If you turn on the `lean` option, Mongoose
skips this step.

```javascript acquit:Lean Tutorial.*compare types
const normalDoc = await MyModel.findOne();
const leanDoc = await MyModel.findOne().lean();

normalDoc instanceof mongoose.Document; // true
normalDoc.constructor.name; // 'model'

leanDoc instanceof mongoose.Document; // false
leanDoc.constructor.name; // 'Object'
```

The downside of enabling `lean` is that lean docs don't have:

* Change tracking
* Casting and validation
* Getters and setters
* Virtuals
* `save()`

For example, the following code sample shows that the `Person` model's getters
and virtuals don't run if you enable `lean`.

```javascript acquit:Lean Tutorial.*getters and virtuals
// Define a `Person` model. Schema has 2 custom getters and a `fullName`
// virtual. Neither the getters nor the virtuals will run if lean is enabled.
const personSchema = new mongoose.Schema({
  firstName: {
    type: String,
    get: capitalizeFirstLetter
  },
  lastName: {
    type: String,
    get: capitalizeFirstLetter
  }
});
personSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});
function capitalizeFirstLetter(v) {
  // Convert 'bob' -> 'Bob'
  return v.charAt(0).toUpperCase() + v.substring(1);
}
const Person = mongoose.model('Person', personSchema);

// Create a doc and load it as a lean doc
await Person.create({ firstName: 'benjamin', lastName: 'sisko' });
const normalDoc = await Person.findOne();
const leanDoc = await Person.findOne().lean();

normalDoc.fullName; // 'Benjamin Sisko'
normalDoc.firstName; // 'Benjamin', because of `capitalizeFirstLetter()`
normalDoc.lastName; // 'Sisko', because of `capitalizeFirstLetter()`

leanDoc.fullName; // undefined
leanDoc.firstName; // 'benjamin', custom getter doesn't run
leanDoc.lastName; // 'sisko', custom getter doesn't run
```

## Lean and Populate

[Populate](../populate.html) works with `lean()`. If you
use both `populate()` and `lean()`, the `lean` option propagates to the
populated documents as well. In the below example, both the top-level
'Group' documents and the populated 'Person' documents will be lean.

```javascript acquit:Lean Tutorial.*conventional populate
// Create models
const Group = mongoose.model('Group', new mongoose.Schema({
  name: String,
  members: [{ type: mongoose.ObjectId, ref: 'Person' }]
}));
const Person = mongoose.model('Person', new mongoose.Schema({
  name: String
}));

// Initialize data
const people = await Person.create([
  { name: 'Benjamin Sisko' },
  { name: 'Kira Nerys' }
]);
await Group.create({
  name: 'Star Trek: Deep Space Nine Characters',
  members: people.map(p => p._id)
});

// Execute a lean query
const group = await Group.findOne().lean().populate('members');
group.members[0].name; // 'Benjamin Sisko'
group.members[1].name; // 'Kira Nerys'

// Both the `group` and the populated `members` are lean.
group instanceof mongoose.Document; // false
group.members[0] instanceof mongoose.Document; // false
group.members[1] instanceof mongoose.Document; // false
```

[Virtual populate](../populate.html#populate-virtuals) also works with lean.

```javascript acquit:Lean Tutorial.*virtual populate
// Create models
const groupSchema = new mongoose.Schema({ name: String });
groupSchema.virtual('members', {
  ref: 'Person',
  localField: '_id',
  foreignField: 'groupId'
});
const Group = mongoose.model('Group', groupSchema);
const Person = mongoose.model('Person', new mongoose.Schema({
  name: String,
  groupId: mongoose.ObjectId
}));

// Initialize data
const g = await Group.create({ name: 'DS9 Characters' });
await Person.create([
  { name: 'Benjamin Sisko', groupId: g._id },
  { name: 'Kira Nerys', groupId: g._id }
]);

// Execute a lean query
const group = await Group.findOne().lean().populate({
  path: 'members',
  options: { sort: { name: 1 } }
});
group.members[0].name; // 'Benjamin Sisko'
group.members[1].name; // 'Kira Nerys'

// Both the `group` and the populated `members` are lean.
group instanceof mongoose.Document; // false
group.members[0] instanceof mongoose.Document; // false
group.members[1] instanceof mongoose.Document; // false
```

## When to Use Lean

If you're executing a query and sending the results without modification to,
say, an [Express response](http://expressjs.com/en/4x/api.html#res), you should
use lean. In general, if you do not modify the query results and do not use
[custom getters](../api/schematype.html#schematype_SchemaType-get), you should use
`lean()`. If you modify the query results or rely on features like getters
or [transforms](../api/document.html#document_Document-toObject), you should not
use `lean()`.

Below is an example of an [Express route](http://expressjs.com/en/guide/routing.html)
that is a good candidate for `lean()`. This route does not modify the `person`
doc and doesn't rely on any Mongoose-specific functionality.

```javascript
// As long as you don't need any of the Person model's virtuals or getters,
// you can use `lean()`.
app.get('/person/:id', function(req, res) {
  Person.findOne({ _id: req.params.id }).lean().
    then(person => res.json({ person })).
    catch(error => res.json({ error: error.message }));
});
```

Below is an example of an Express route that should **not** use `lean()`. As
a general rule of thumb, `GET` routes are good candidates for `lean()` in a
[RESTful API](https://en.wikipedia.org/wiki/Representational_state_transfer).
On the other hand, `PUT`, `POST`, etc. routes generally should not use `lean()`.

```javascript
// This route should **not** use `lean()`, because lean means no `save()`.
app.put('/person/:id', function(req, res) {
  Person.findOne({ _id: req.params.id }).
    then(person => {
      assert.ok(person);
      Object.assign(person, req.body);
      return person.save();
    }).
    then(person => res.json({ person })).
    catch(error => res.json({ error: error.message }));
});
```

Remember that virtuals do **not** end up in `lean()` query results. Use the
[mongoose-lean-virtuals plugin](https://plugins.mongoosejs.io/plugins/lean-virtuals)
to add virtuals to your lean query results.

## Plugins

Using `lean()` bypasses all Mongoose features, including [virtuals](virtuals.html), [getters/setters](getters-setters.html),
and [defaults](../api/schematype.html#schematype_SchemaType-default). If you want to
use these features with `lean()`, you need to use the corresponding plugin:

* [mongoose-lean-virtuals](https://plugins.mongoosejs.io/plugins/lean-virtuals)
* [mongoose-lean-getters](https://plugins.mongoosejs.io/plugins/lean-getters)
* [mongoose-lean-defaults](https://www.npmjs.com/package/mongoose-lean-defaults)

However, you need to keep in mind that Mongoose does not hydrate lean documents,
so `this` will be a POJO in virtuals, getters, and default functions.

```javascript
const schema = new Schema({ name: String });
schema.plugin(require('mongoose-lean-virtuals'));

schema.virtual('lowercase', function() {
  this instanceof mongoose.Document; // false

  this.name; // Works
  this.get('name'); // Crashes because `this` is not a Mongoose document.
});
```

## BigInts

By default, the MongoDB Node driver converts longs stored in MongoDB into JavaScript numbers, **not** [BigInts](https://thecodebarbarian.com/an-overview-of-bigint-in-node-js.html).
Set the `useBigInt64` option on your `lean()` queries to inflate longs into BigInts.

```javascript acquit:Lean Tutorial.*bigint
const Person = mongoose.model('Person', new mongoose.Schema({
  name: String,
  age: BigInt
}));
// Mongoose will convert `age` to a BigInt
const { age } = await Person.create({ name: 'Benjamin Sisko', age: 37 });
typeof age; // 'bigint'

// By default, if you store a document with a BigInt property in MongoDB and you
// load the document with `lean()`, the BigInt property will be a number
let person = await Person.findOne({ name: 'Benjamin Sisko' }).lean();
typeof person.age; // 'number'

// Set the `useBigInt64` option to opt in to converting MongoDB longs to BigInts.
person = await Person.findOne({ name: 'Benjamin Sisko' }).
  setOptions({ useBigInt64: true }).
  lean();
typeof person.age; // 'bigint'
```
