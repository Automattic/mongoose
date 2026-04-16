# How to Use `findOneAndUpdate()` in Mongoose

The [`findOneAndUpdate()` function in Mongoose](../api/query.html#query_Query-findOneAndUpdate) has a wide variety of use cases. [You should use `save()` to update documents where possible](https://masteringjs.io/tutorials/mongoose/update), for better [validation](../validation.html) and [middleware](../middleware.html) support.
However, there are some cases where you need to use [`findOneAndUpdate()`](https://masteringjs.io/tutorials/mongoose/findoneandupdate). In this tutorial, you'll see how to use `findOneAndUpdate()`, and learn when you need to use it.

* [Getting Started](#getting-started)
* [Atomic Updates](#atomic-updates)
* [Upsert](#upsert)
* [The `includeResultMetadata` Option](#includeresultmetadata)
* [Updating Discriminator Keys](#updating-discriminator-keys)

## Getting Started

As the name implies, `findOneAndUpdate()` finds the first document that matches a given `filter`, applies an `update`, and returns the document.
The `findOneAndUpdate()` function has the following signature:

```javascript
function findOneAndUpdate(filter, update, options) {}
```

By default, `findOneAndUpdate()` returns the document as it was **before** `update` was applied.
In the following example, `doc` initially only has `name` and `_id` properties.
`findOneAndUpdate()` adds an `age` property, but the result of `findOneAndUpdate()` does **not** have an `age` property.

```javascript acquit:Tutorial.*findOneAndUpdate.*basic case
const Character = mongoose.model('Character', new mongoose.Schema({
  name: String,
  age: Number
}));

const _id = new mongoose.Types.ObjectId('0'.repeat(24));
let doc = await Character.create({ _id, name: 'Jean-Luc Picard' });
doc; // { name: 'Jean-Luc Picard', _id: ObjectId('000000000000000000000000') }

const filter = { name: 'Jean-Luc Picard' };
const update = { age: 59 };

// The result of `findOneAndUpdate()` is the document _before_ `update` was applied
doc = await Character.findOneAndUpdate(filter, update);
doc; // { name: 'Jean-Luc Picard', _id: ObjectId('000000000000000000000000') }

doc = await Character.findOne(filter);
doc.age; // 59
```

You should set the `returnDocument` option to `'after'` to return the document **after** `update` was applied.

```javascript acquit:Tutorial.*findOneAndUpdate.*returnDocument option
const filter = { name: 'Jean-Luc Picard' };
const update = { age: 59 };

// `doc` is the document _after_ `update` was applied because of
// `returnDocument: 'after'`
const doc = await Character.findOneAndUpdate(filter, update, {
  returnDocument: 'after'
});
doc.name; // 'Jean-Luc Picard'
doc.age; // 59
```

Mongoose's `findOneAndUpdate()` is slightly different from [the MongoDB Node.js driver's `findOneAndUpdate()`](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#findOneAndUpdate) because it returns the document itself, not a [result object](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#~findAndModifyWriteOpResult).

The `new` and `returnOriginal` options are **deprecated** in favor of `returnDocument`.
Use `returnDocument: 'after'` instead of `new: true` or `returnOriginal: false`.
Use `returnDocument: 'before'` instead of `new: false` or `returnOriginal: true`.

## Atomic Updates

With the exception of an [unindexed upsert](https://www.mongodb.com/docs/manual/reference/method/db.collection.findAndModify/#upsert-with-unique-index), [`findOneAndUpdate()` is atomic](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/#atomicity). That means you can assume the document doesn't change between when MongoDB finds the document and when it updates the document, *unless* you're doing an [upsert](#upsert).

For example, if you're using `save()` to update a document, the document can change in MongoDB in between when you load the document using `findOne()` and when you save the document using `save()` as show below. For many use cases, the `save()` race condition is a non-issue. But you can work around it with `findOneAndUpdate()` (or [transactions](../transactions.html)) if you need to.

```javascript acquit:Tutorial.*findOneAndUpdate.*save race condition
const filter = { name: 'Jean-Luc Picard' };
const update = { age: 59 };

let doc = await Character.findOne({ name: 'Jean-Luc Picard' });

// Document changed in MongoDB, but not in Mongoose
await Character.updateOne(filter, { name: 'Will Riker' });

// This will update `doc` age to `59`, even though the doc changed.
doc.age = update.age;
await doc.save();

doc = await Character.findOne();
doc.name; // Will Riker
doc.age; // 59
```

## Upsert

Using the `upsert` option, you can use `findOneAndUpdate()` as a find-and-[upsert](https://www.mongodb.com/docs/manual/reference/method/db.collection.update/#db.collection.update) operation. An upsert behaves like a normal `findOneAndUpdate()` if it finds a document that matches `filter`. But, if no document matches `filter`, MongoDB will insert one by combining `filter` and `update` as shown below.

```javascript acquit:Tutorial.*findOneAndUpdate.*upsert
const filter = { name: 'Will Riker' };
const update = { age: 29 };

await Character.countDocuments(filter); // 0

const doc = await Character.findOneAndUpdate(filter, update, {
  new: true,
  upsert: true // Make this update into an upsert
});
doc.name; // Will Riker
doc.age; // 29
```

<h2 id="includeresultmetadata">The <code>includeResultMetadata</code> Option<h2 id="rawresult"></h2></h2>

Mongoose transforms the result of `findOneAndUpdate()` by default: it
returns the updated document. That makes it difficult to check whether
a document was upserted or not. In order to get the updated document
and check whether MongoDB upserted a new document in the same operation,
you can set the `includeResultMetadata` flag to make Mongoose return the raw result
from MongoDB.

```javascript acquit:Tutorial.*findOneAndUpdate.*includeResultMetadata$
const filter = { name: 'Will Riker' };
const update = { age: 29 };

await Character.countDocuments(filter); // 0

const res = await Character.findOneAndUpdate(filter, update, {
  new: true,
  upsert: true,
  // Return additional properties about the operation, not just the document
  includeResultMetadata: true
});

res.value instanceof Character; // true
// The below property will be `false` if MongoDB upserted a new
// document, and `true` if MongoDB updated an existing object.
res.lastErrorObject.updatedExisting; // false
```

Here's what the `res` object from the above example looks like:

```txt
{ lastErrorObject:
   { n: 1,
     updatedExisting: false,
     upserted: 5e6a9e5ec6e44398ae2ac16a },
  value:
   { _id: 5e6a9e5ec6e44398ae2ac16a,
     name: 'Will Riker',
     __v: 0,
     age: 29 },
  ok: 1 }
```

## Updating Discriminator Keys

Mongoose prevents updating the [discriminator key](../discriminators.html#discriminator-keys) using `findOneAndUpdate()` by default.
For example, suppose you have the following discriminator models.

```javascript
const eventSchema = new mongoose.Schema({ time: Date });
const Event = db.model('Event', eventSchema);

const ClickedLinkEvent = Event.discriminator(
  'ClickedLink',
  new mongoose.Schema({ url: String })
);

const SignedUpEvent = Event.discriminator(
  'SignedUp',
  new mongoose.Schema({ username: String })
);
```

Mongoose will remove `__t` (the default discriminator key) from the `update` parameter, if `__t` is set.
This is to prevent unintentional updates to the discriminator key; for example, if you're passing untrusted user input to the `update` parameter.
However, you can tell Mongoose to allow updating the discriminator key by setting the `overwriteDiscriminatorKey` option to `true` as shown below.

```javascript acquit:use overwriteDiscriminatorKey to change discriminator key
let event = new ClickedLinkEvent({ time: Date.now(), url: 'google.com' });
await event.save();

event = await ClickedLinkEvent.findByIdAndUpdate(
  event._id,
  { __t: 'SignedUp' },
  { overwriteDiscriminatorKey: true, new: true }
);
event.__t; // 'SignedUp', updated discriminator key
```
