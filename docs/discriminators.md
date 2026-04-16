# Discriminators

## The `model.discriminator()` function

Discriminators are a schema inheritance mechanism. They enable
you to have multiple models with overlapping schemas on top of the
same underlying MongoDB collection.

Suppose you wanted to track different types of events in a single
collection. Every event will have a timestamp, but events that
represent clicked links should have a URL. You can achieve this
using the `model.discriminator()` function. This function takes
3 parameters, a model name, a discriminator schema and an optional
key (defaults to the model name). It returns a model whose schema
is the union of the base schema and the discriminator schema.

```javascript acquit:The .model.discriminator\(\). function
const options = { discriminatorKey: 'kind' };

const eventSchema = new mongoose.Schema({ time: Date }, options);
const Event = mongoose.model('Event', eventSchema);

// ClickedLinkEvent is a special type of Event that has
// a URL.
const ClickedLinkEvent = Event.discriminator('ClickedLink',
  new mongoose.Schema({ url: String }, options));

// When you create a generic event, it can't have a URL field...
const genericEvent = new Event({ time: Date.now(), url: 'google.com' });
assert.ok(!genericEvent.url);

// But a ClickedLinkEvent can
const clickedEvent = new ClickedLinkEvent({ time: Date.now(), url: 'google.com' });
assert.ok(clickedEvent.url);
```

## Discriminators save to the Event model's collection

Suppose you created another discriminator to track events where
a new user registered. These `SignedUpEvent` instances will be
stored in the same collection as generic events and `ClickedLinkEvent`
instances.

```javascript acquit:Discriminators save to the Event model's collection
const event1 = new Event({ time: Date.now() });
const event2 = new ClickedLinkEvent({ time: Date.now(), url: 'google.com' });
const event3 = new SignedUpEvent({ time: Date.now(), user: 'testuser' });


await Promise.all([event1.save(), event2.save(), event3.save()]);
const count = await Event.countDocuments();
assert.equal(count, 3);
```

## Discriminator keys

The way Mongoose tells the difference between the different discriminator models is by the 'discriminator key', which is `__t` by default.
Mongoose adds a String path called `__t` to your schemas that it uses to track which discriminator this document is an instance of.

```javascript acquit:Discriminator keys
const event1 = new Event({ time: Date.now() });
const event2 = new ClickedLinkEvent({ time: Date.now(), url: 'google.com' });
const event3 = new SignedUpEvent({ time: Date.now(), user: 'testuser' });

assert.ok(!event1.__t);
assert.equal(event2.__t, 'ClickedLink');
assert.equal(event3.__t, 'SignedUp');
```

## Updating the discriminator key

By default, Mongoose doesn't let you update the discriminator key.
`save()` will throw an error if you attempt to update the discriminator key.
And `findOneAndUpdate()`, `updateOne()`, etc. will strip out discriminator key updates.

```javascript acquit:Update discriminator key
let event = new ClickedLinkEvent({ time: Date.now(), url: 'google.com' });
await event.save();

event.__t = 'SignedUp';
// ValidationError: ClickedLink validation failed: __t: Cast to String failed for value "SignedUp" (type string) at path "__t"
await event.save();

event = await ClickedLinkEvent.findByIdAndUpdate(event._id, { __t: 'SignedUp' }, { new: true });
event.__t; // 'ClickedLink', update was a no-op
```

To update a document's discriminator key, use `findOneAndUpdate()` or `updateOne()` with the `overwriteDiscriminatorKey` option set as follows.

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

## Embedded discriminators in arrays

You can also define discriminators on embedded document arrays.
Embedded discriminators are different because the different discriminator types are stored in the same document array (within a document) rather than the same collection.
In other words, embedded discriminators let you store subdocuments matching different schemas in the same array.

As a general best practice, make sure you declare any hooks on your schemas **before** you use them.
You should **not** call `pre()` or `post()` after calling `discriminator()`.

```javascript acquit:Embedded discriminators in arrays
const eventSchema = new Schema({ message: String },
  { discriminatorKey: 'kind', _id: false });

const clickedSchema = new Schema({
  element: {
    type: String,
    required: true
  }
}, { _id: false });
const purchasedSchema = new Schema({
  product: {
    type: String,
    required: true
  }
}, { _id: false });

// The `events` array can contain 2 different types of events: a
// 'clicked' event that requires an element id that was clicked
// and a 'purchased' event that requires the product that was purchased.
const batchSchema = new Schema({
  events: [{
    type: eventSchema,
    discriminators: {
      Clicked: clickedSchema,
      Purchased: purchasedSchema
    }
  }
  ] });

const Batch = db.model('EventBatch', batchSchema);

// Create a new batch of events with different kinds
const doc = await Batch.create({
  events: [
    { kind: 'Clicked', element: '#hero', message: 'hello' },
    { kind: 'Purchased', product: 'action-figure-1', message: 'world' }
  ]
});

assert.equal(doc.events.length, 2);

assert.equal(doc.events[0].element, '#hero');
assert.equal(doc.events[0].message, 'hello');

assert.equal(doc.events[1].product, 'action-figure-1');
assert.equal(doc.events[1].message, 'world');

doc.events.push({ kind: 'Purchased', product: 'action-figure-2' });

await doc.save();

assert.equal(doc.events.length, 3);

assert.equal(doc.events[2].product, 'action-figure-2');
```

## Single nested discriminators

You can also define discriminators on single nested subdocuments, similar to how you can define discriminators on arrays of subdocuments.

As a general best practice, make sure you declare any hooks on your schemas **before** you use them.
You should **not** call `pre()` or `post()` after calling `discriminator()`.

```javascript acquit:Single nested discriminators
const shapeSchema = Schema({ name: String }, { discriminatorKey: 'kind' });
const schema = Schema({
  shape: {
    type: shapeSchema,
    discriminators: {
      Circle: Schema({ radius: String }),
      Square: Schema({ side: Number })
    }
  }
});

const MyModel = mongoose.model('ShapeTest', schema);

// If `kind` is set to 'Circle', then `shape` will have a `radius` property
let doc = new MyModel({ shape: { kind: 'Circle', radius: 5 } });
doc.shape.radius; // 5

// If `kind` is set to 'Square', then `shape` will have a `side` property
doc = new MyModel({ shape: { kind: 'Square', side: 10 } });
doc.shape.side; // 10
```
